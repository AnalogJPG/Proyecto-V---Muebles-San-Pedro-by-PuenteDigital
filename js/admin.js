/**
 * Panel de administración: inicio de sesión y gestión de solicitudes de
 * cotización.
 *
 * Solo lo usa admin.html. La página tiene dos vistas, inicio de sesión y
 * panel, y observarSesion decide cuál se muestra. Que la página se llame
 * admin.html no protege nada: lo que impide leer o cambiar las solicitudes
 * son Firebase Authentication y las reglas de Firestore.
 *
 * SEGURIDAD: los datos de las solicitudes los escribe cualquier visitante
 * desde cotizacion.html. Todo se inserta con textContent, en elementos
 * creados con createElement. Nunca con innerHTML.
 */

import { iniciarSesion, cerrarSesion, observarSesion, recuperarContrasena } from './datos/autenticacion.js';
import { obtenerSolicitudes, actualizarEstado, ESTADOS } from './datos/repositorioSolicitudes.js';
import { formatearPrecio } from './ui/formato.js';

/** Tiempo máximo de espera por la confirmación de Firestore. */
const ESPERA_MAXIMA_MS = 15000;

const NOMBRES_ESTADO = {
    pendiente: 'Pendiente',
    en_revision: 'En revisión',
    atendida: 'Atendida'
};

const formateadorFecha = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

/* Estado del panel. Se borra al cerrar la sesión. */
let solicitudes   = [];
let filtroActivo  = 'todas';
let idSeleccionado = null;

/** Cada carga lleva un turno; si la sesión cambia, las respuestas viejas se descartan. */
let turnoDeCarga = 0;

/** Mensaje para la vista de inicio de sesión después de cerrar la sesión. */
let mensajeAlSalir = '';

let temporizadorAviso = null;

/* ============================================
   UTILIDADES
   ============================================ */

/** Crea un elemento con clase y texto opcionales. El texto va con textContent. */
function crear(etiqueta, clase, texto) {
    const elemento = document.createElement(etiqueta);
    if (clase) elemento.className = clase;
    if (texto != null) elemento.textContent = texto;
    return elemento;
}

function crearBoton(clase, texto) {
    const boton = crear('button', clase, texto);
    boton.type = 'button';
    return boton;
}

/** Muestra un texto en un párrafo de mensajes, o lo oculta si está vacío. */
function mostrarMensaje(elemento, texto) {
    elemento.textContent = texto || '';
    elemento.hidden = !texto;
}

/**
 * Rechaza si la promesa no se resuelve a tiempo. Es la misma función que en
 * cotizacion.js: sin conexión, Firestore deja la escritura en cola y no
 * falla. Esto no cancela esa escritura, que todavía puede completarse.
 */
function conLimiteDeTiempo(promesa, milisegundos) {
    let temporizador;
    const limite = new Promise(function (resolver, rechazar) {
        temporizador = setTimeout(function () {
            const error = new Error('Firestore no confirmó la escritura en ' + milisegundos + ' ms');
            error.name = 'TiempoAgotado';
            rechazar(error);
        }, milisegundos);
    });
    return Promise.race([promesa, limite]).finally(function () { clearTimeout(temporizador); });
}

/* Los documentos los escribe cualquier visitante: se leen a la defensiva. */

function texto(valor) {
    return typeof valor === 'string' ? valor.trim() : '';
}

function productosDe(solicitud) {
    return Array.isArray(solicitud.productos) ? solicitud.productos.filter(Boolean) : [];
}

function contarProductos(solicitud) {
    return productosDe(solicitud).reduce(function (suma, producto) {
        return suma + (Number(producto.cantidad) || 0);
    }, 0);
}

function formatearFecha(fecha) {
    if (fecha && typeof fecha.toDate === 'function') return formateadorFecha.format(fecha.toDate());
    return 'Sin fecha';
}

function crearEtiquetaEstado(estado) {
    const conocido = Object.prototype.hasOwnProperty.call(NOMBRES_ESTADO, estado);
    return crear(
        'span',
        'admin-estado admin-estado-' + (conocido ? estado : 'desconocido'),
        conocido ? NOMBRES_ESTADO[estado] : 'Sin estado'
    );
}

/* ============================================
   ENLACES DE CONTACTO
   ============================================ */

/**
 * tel: con dígitos y, si lo hay, el + inicial. No se codifica: después de
 * limpiar no queda nada que escapar, y algunos marcadores no entienden %2B.
 */
function enlaceTelefono(telefono) {
    const limpio = texto(telefono).replace(/[^0-9+]/g, '').replace(/(?!^)\+/g, '');
    return limpio.replace('+', '') ? 'tel:' + limpio : '';
}

/** wa.me solo acepta dígitos. Un número de 10 dígitos se toma como mexicano. */
function enlaceWhatsApp(telefono) {
    let digitos = texto(telefono).replace(/\D/g, '');
    if (digitos.length === 10) digitos = '52' + digitos;
    return digitos ? 'https://wa.me/' + encodeURIComponent(digitos) : '';
}

/** El correo se codifica completo y luego se restaura la arroba, que mailto: necesita legible. */
function enlaceCorreo(correo) {
    const limpio = texto(correo);
    if (!limpio) return '';
    return 'mailto:' + encodeURIComponent(limpio).replace(/%40/g, '@') +
        '?subject=' + encodeURIComponent('Tu solicitud de cotización en Muebles San Pedro');
}

/* ============================================
   VISTAS
   ============================================ */

function mostrarVista(nombre) {
    document.getElementById('adminCargando').hidden = true;
    document.getElementById('vistaLogin').hidden = nombre !== 'login';
    document.getElementById('vistaPanel').hidden = nombre !== 'panel';
}

/**
 * Alterna las secciones del panel. Hoy solo existe Solicitudes; una sección
 * nueva solo necesita su pestaña y su <section> con el mismo data-seccion.
 */
function mostrarSeccion(nombre) {
    document.querySelectorAll('.admin-pestana').forEach(function (pestana) {
        if (pestana.dataset.seccion === nombre) pestana.setAttribute('aria-current', 'page');
        else pestana.removeAttribute('aria-current');
    });
    document.querySelectorAll('.admin-seccion').forEach(function (seccion) {
        seccion.hidden = seccion.dataset.seccion !== nombre;
    });
}

function alCambiarSesion(usuario) {
    if (usuario) {
        document.getElementById('adminCorreo').textContent = usuario.email || '';
        mostrarVista('panel');
        cargarSolicitudes();
        return;
    }

    limpiarPanel();
    mostrarVista('login');

    /* Si se cerró la sesión por falta de permisos, se explica aquí. */
    mostrarMensaje(document.getElementById('loginError'), mensajeAlSalir);
    mensajeAlSalir = '';
}

/* ============================================
   INICIO DE SESIÓN
   ============================================ */

/**
 * Traduce el error de Auth a un mensaje. Contraseña incorrecta, correo
 * inexistente y cuenta desactivada reciben el mismo texto, para no revelar
 * si el correo existe.
 */
function mensajeDeErrorDeSesion(error) {
    const codigo = error && error.code;
    if (codigo === 'auth/too-many-requests') {
        return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo';
    }
    if (codigo === 'auth/network-request-failed') {
        return 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo';
    }
    return 'El correo o la contraseña no son correctos';
}

async function entrar(formulario, boton) {
    const error = document.getElementById('loginError');
    const aviso = document.getElementById('loginAviso');
    mostrarMensaje(error, '');
    mostrarMensaje(aviso, '');

    const correo     = formulario.elements.correo.value.trim();
    const contrasena = formulario.elements.contrasena.value;
    if (!correo || !contrasena) {
        mostrarMensaje(error, 'Escribe tu correo y tu contraseña');
        return;
    }

    boton.disabled = true;
    boton.textContent = 'Entrando…';

    try {
        await iniciarSesion(correo, contrasena);
        /* La vista del panel la muestra observarSesion. */
        formulario.elements.contrasena.value = '';
        ocultarContrasena();
    } catch (excepcion) {
        console.error(excepcion);
        mostrarMensaje(error, mensajeDeErrorDeSesion(excepcion));
    } finally {
        boton.disabled = false;
        boton.textContent = 'Entrar';
    }
}

async function recuperar(formulario, boton) {
    const error = document.getElementById('loginError');
    const aviso = document.getElementById('loginAviso');
    mostrarMensaje(error, '');
    mostrarMensaje(aviso, '');

    const correo = formulario.elements.correo.value.trim();
    if (!correo) {
        mostrarMensaje(error, 'Escribe tu correo para recuperar la contraseña');
        formulario.elements.correo.focus();
        return;
    }

    boton.disabled = true;
    try {
        await recuperarContrasena(correo);
        mostrarMensaje(aviso, 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.');
    } catch (excepcion) {
        console.error(excepcion);
        const codigo = excepcion && excepcion.code;
        if (codigo === 'auth/too-many-requests' || codigo === 'auth/network-request-failed') {
            mostrarMensaje(error, mensajeDeErrorDeSesion(excepcion));
        } else if (codigo === 'auth/invalid-email') {
            mostrarMensaje(error, 'Escribe un correo electrónico válido');
        } else {
            /* Un correo que no existe recibe la misma respuesta que uno que sí. */
            mostrarMensaje(aviso, 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.');
        }
    } finally {
        boton.disabled = false;
    }
}

function ocultarContrasena() {
    document.getElementById('loginContrasena').type = 'password';
    document.getElementById('btnMostrarContrasena').textContent = 'Mostrar';
}

function iniciarLogin() {
    const formulario = document.getElementById('formLogin');
    const botonEntrar = document.getElementById('btnEntrar');
    const botonMostrar = document.getElementById('btnMostrarContrasena');
    const botonRecuperar = document.getElementById('btnRecuperar');
    const campoContrasena = document.getElementById('loginContrasena');

    formulario.addEventListener('submit', function (evento) {
        evento.preventDefault();
        entrar(formulario, botonEntrar);
    });

    botonMostrar.addEventListener('click', function () {
        const mostrar = campoContrasena.type === 'password';
        campoContrasena.type = mostrar ? 'text' : 'password';
        botonMostrar.textContent = mostrar ? 'Ocultar' : 'Mostrar';
    });

    botonRecuperar.addEventListener('click', function () {
        recuperar(formulario, botonRecuperar);
    });
}

/* ============================================
   CARGA DE SOLICITUDES
   ============================================ */

async function cargarSolicitudes() {
    const turno = ++turnoDeCarga;
    const lista = document.getElementById('listaSolicitudes');
    lista.replaceChildren(crear('p', 'admin-lista-vacia', 'Cargando solicitudes…'));

    try {
        const datos = await obtenerSolicitudes();
        if (turno !== turnoDeCarga) return;
        solicitudes = datos;
        dibujarTodo();
    } catch (error) {
        if (turno !== turnoDeCarga) return;
        console.error(error);

        /* La cuenta inició sesión pero las reglas no le dejan leer: no es
           personal autorizado. Se cierra la sesión y se explica. */
        if (error && error.code === 'permission-denied') {
            mensajeAlSalir = 'Esta cuenta no tiene acceso al panel de administración.';
            cerrarSesion().catch(function (excepcion) { console.error(excepcion); });
            return;
        }

        dibujarErrorDeCarga();
    }
}

function dibujarErrorDeCarga() {
    const lista = document.getElementById('listaSolicitudes');
    const contenedor = crear('div', 'admin-lista-error');
    const boton = crearBoton('admin-boton', 'Reintentar');
    boton.addEventListener('click', cargarSolicitudes);

    contenedor.appendChild(crear('p', null, 'No se pudieron cargar las solicitudes'));
    contenedor.appendChild(boton);
    lista.replaceChildren(contenedor);
}

/** Borra todo rastro de las solicitudes al cerrar la sesión. */
function limpiarPanel() {
    turnoDeCarga++;
    solicitudes = [];
    filtroActivo = 'todas';
    idSeleccionado = null;
    document.getElementById('adminCorreo').textContent = '';
    document.getElementById('listaSolicitudes').replaceChildren();
    document.getElementById('detalleSolicitud').replaceChildren();
    document.getElementById('solicitudes').classList.remove('con-detalle');
    actualizarFiltros();
}

function dibujarTodo() {
    actualizarFiltros();
    dibujarLista();
    dibujarDetalle();
}

/* ============================================
   FILTROS Y LISTA
   ============================================ */

function actualizarFiltros() {
    const pendientes = solicitudes.filter(function (solicitud) { return solicitud.estado === 'pendiente'; }).length;
    document.getElementById('filtroPendientes').textContent = 'Pendientes (' + pendientes + ')';

    document.querySelectorAll('.admin-filtro').forEach(function (boton) {
        boton.setAttribute('aria-pressed', String(boton.dataset.filtro === filtroActivo));
    });
}

function iniciarFiltros() {
    document.querySelectorAll('.admin-filtro').forEach(function (boton) {
        boton.addEventListener('click', function () {
            filtroActivo = boton.dataset.filtro;
            actualizarFiltros();
            dibujarLista();
        });
    });
}

function crearFila(solicitud) {
    const boton = crearBoton('admin-fila');
    boton.dataset.id = solicitud.id;
    if (solicitud.id === idSeleccionado) boton.setAttribute('aria-current', 'true');

    const cantidad = contarProductos(solicitud);
    const total = crear('span', 'admin-fila-total');
    total.appendChild(crear('span', 'admin-oculto', 'Total estimado: '));
    total.append(formatearPrecio(solicitud.total));

    boton.appendChild(crear('span', 'admin-fila-fecha', formatearFecha(solicitud.fecha)));
    boton.appendChild(crear('span', 'admin-fila-nombre', texto(solicitud.nombre) || 'Sin nombre'));
    boton.appendChild(crear('span', 'admin-fila-productos', cantidad + (cantidad === 1 ? ' producto' : ' productos')));
    boton.appendChild(total);
    boton.appendChild(crearEtiquetaEstado(solicitud.estado));
    return boton;
}

function dibujarLista() {
    const lista = document.getElementById('listaSolicitudes');

    if (solicitudes.length === 0) {
        lista.replaceChildren(crear('p', 'admin-lista-vacia', 'Aún no hay solicitudes de cotización'));
        return;
    }

    const visibles = solicitudes.filter(function (solicitud) {
        return filtroActivo === 'todas' || solicitud.estado === filtroActivo;
    });
    if (visibles.length === 0) {
        lista.replaceChildren(crear('p', 'admin-lista-vacia', 'No hay solicitudes con este estado.'));
        return;
    }

    const elementos = crear('ul', 'admin-lista-items');
    visibles.forEach(function (solicitud) {
        const elemento = document.createElement('li');
        elemento.appendChild(crearFila(solicitud));
        elementos.appendChild(elemento);
    });
    lista.replaceChildren(elementos);
}

/** Delegación: un solo listener para todas las filas. */
function iniciarLista() {
    document.getElementById('listaSolicitudes').addEventListener('click', function (evento) {
        const fila = evento.target.closest('.admin-fila');
        if (fila) seleccionar(fila.dataset.id);
    });
}

function seleccionar(id) {
    idSeleccionado = id;
    document.getElementById('solicitudes').classList.add('con-detalle');
    dibujarLista();
    dibujarDetalle();

    const titulo = document.getElementById('detalleTitulo');
    if (titulo) titulo.focus();
}

/** Solo se ve en móvil, donde el detalle ocupa toda la pantalla. */
function volver() {
    const id = idSeleccionado;
    idSeleccionado = null;
    document.getElementById('solicitudes').classList.remove('con-detalle');
    dibujarLista();
    dibujarDetalle();

    const fila = Array.prototype.find.call(document.querySelectorAll('.admin-fila'), function (boton) {
        return boton.dataset.id === id;
    });
    if (fila) fila.focus();
}

/* ============================================
   DETALLE
   ============================================ */

function crearContactos(solicitud) {
    const contactos = crear('div', 'admin-contactos');
    const enlaces = [
        { texto: 'Llamar', href: enlaceTelefono(solicitud.telefono), externo: false },
        { texto: 'WhatsApp', href: enlaceWhatsApp(solicitud.telefono), externo: true },
        { texto: 'Enviar correo', href: enlaceCorreo(solicitud.correo), externo: false }
    ];

    enlaces.forEach(function (datos) {
        if (!datos.href) return;
        const enlace = crear('a', 'admin-contacto', datos.texto);
        enlace.href = datos.href;
        if (datos.externo) {
            enlace.target = '_blank';
            enlace.rel = 'noopener noreferrer';
        }
        contactos.appendChild(enlace);
    });
    return contactos;
}

function agregarDato(lista, termino, valor, clase) {
    lista.appendChild(crear('dt', null, termino));
    lista.appendChild(crear('dd', clase || null, valor));
}

function crearDatos(solicitud) {
    const datos = crear('dl', 'admin-datos');
    agregarDato(datos, 'Teléfono', texto(solicitud.telefono) || 'Sin teléfono');
    agregarDato(datos, 'Correo', texto(solicitud.correo) || 'Sin correo');
    if (texto(solicitud.codigoPostal)) agregarDato(datos, 'Código postal', texto(solicitud.codigoPostal));
    if (texto(solicitud.comentarios)) agregarDato(datos, 'Comentarios', texto(solicitud.comentarios), 'admin-datos-comentarios');
    agregarDato(datos, 'Fecha', formatearFecha(solicitud.fecha));
    return datos;
}

function crearTablaProductos(solicitud) {
    const tabla = crear('table', 'admin-tabla');

    const encabezado = document.createElement('tr');
    ['Producto', 'Cantidad', 'Precio', 'Subtotal'].forEach(function (titulo) {
        const celda = crear('th', null, titulo);
        celda.scope = 'col';
        encabezado.appendChild(celda);
    });
    tabla.createTHead().appendChild(encabezado);

    const cuerpo = tabla.createTBody();
    productosDe(solicitud).forEach(function (producto) {
        const precio = Number(producto.precio);
        const cantidad = Number(producto.cantidad);
        const fila = document.createElement('tr');
        fila.appendChild(crear('td', null, texto(producto.nombre) || texto(producto.id) || 'Producto sin nombre'));
        fila.appendChild(crear('td', null, Number.isFinite(cantidad) ? String(cantidad) : ''));
        fila.appendChild(crear('td', null, formatearPrecio(precio)));
        fila.appendChild(crear('td', null, formatearPrecio(precio * cantidad)));
        cuerpo.appendChild(fila);
    });

    const pie = document.createElement('tr');
    const etiqueta = crear('th', null, 'Total estimado');
    etiqueta.scope = 'row';
    etiqueta.colSpan = 3;
    pie.appendChild(etiqueta);
    pie.appendChild(crear('td', null, formatearPrecio(solicitud.total)));
    tabla.createTFoot().appendChild(pie);

    return tabla;
}

function crearFormularioEstado(solicitud) {
    const formulario = crear('form', 'admin-estado-form');
    formulario.noValidate = true;

    const campo = crear('div', 'admin-campo');
    const etiqueta = crear('label', null, 'Estado');
    etiqueta.htmlFor = 'selectorEstado';
    const selector = document.createElement('select');
    selector.id = 'selectorEstado';
    ESTADOS.forEach(function (estado) {
        const opcion = crear('option', null, NOMBRES_ESTADO[estado]);
        opcion.value = estado;
        opcion.selected = estado === solicitud.estado;
        selector.appendChild(opcion);
    });
    campo.appendChild(etiqueta);
    campo.appendChild(selector);

    const boton = crear('button', 'admin-boton', 'Actualizar estado');
    boton.type = 'submit';

    const error = crear('p', 'admin-error');
    error.setAttribute('role', 'alert');
    error.hidden = true;

    formulario.appendChild(campo);
    formulario.appendChild(boton);
    formulario.appendChild(error);

    formulario.addEventListener('submit', function (evento) {
        evento.preventDefault();
        cambiarEstado(solicitud.id, selector.value, boton, error);
    });

    return formulario;
}

function dibujarDetalle() {
    const detalle = document.getElementById('detalleSolicitud');
    const solicitud = solicitudes.find(function (elemento) { return elemento.id === idSeleccionado; });

    if (!solicitud) {
        idSeleccionado = null;
        document.getElementById('solicitudes').classList.remove('con-detalle');
        detalle.replaceChildren();
        if (solicitudes.length > 0) {
            detalle.appendChild(crear('p', 'admin-detalle-vacio', 'Selecciona una solicitud para ver el detalle.'));
        }
        return;
    }

    const botonVolver = crearBoton('admin-boton-secundario admin-volver', 'Volver');
    botonVolver.addEventListener('click', volver);

    const titulo = crear('h3', 'admin-detalle-nombre', texto(solicitud.nombre) || 'Sin nombre');
    titulo.id = 'detalleTitulo';
    titulo.tabIndex = -1;

    const estadoActual = crear('p', 'admin-detalle-estado', 'Estado actual: ');
    estadoActual.appendChild(crearEtiquetaEstado(solicitud.estado));

    detalle.replaceChildren(
        botonVolver,
        titulo,
        crear('p', 'admin-detalle-fecha', 'Recibida el ' + formatearFecha(solicitud.fecha)),
        /* Los enlaces de contacto van arriba, para tenerlos a mano en el teléfono. */
        crearContactos(solicitud),
        estadoActual,
        crearDatos(solicitud),
        crear('h4', null, 'Productos'),
        crearTablaProductos(solicitud),
        crear('p', 'admin-nota', 'Precios estimados al momento de la solicitud'),
        crearFormularioEstado(solicitud)
    );
}

/* ============================================
   CAMBIO DE ESTADO
   ============================================ */

function mostrarAviso(texto) {
    const aviso = document.getElementById('avisoEstado');
    mostrarMensaje(aviso, texto);
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(function () { mostrarMensaje(aviso, ''); }, 3000);
}

async function cambiarEstado(id, estado, boton, error) {
    mostrarMensaje(error, '');
    boton.disabled = true;
    boton.textContent = 'Actualizando…';

    try {
        await conLimiteDeTiempo(actualizarEstado(id, estado), ESPERA_MAXIMA_MS);
    } catch (excepcion) {
        console.error(excepcion);
        boton.disabled = false;
        boton.textContent = 'Actualizar estado';
        mostrarMensaje(error, excepcion.name === 'TiempoAgotado'
            ? 'No hubo respuesta en 15 segundos. Revisa tu conexión e inténtalo de nuevo.'
            : 'No se pudo actualizar el estado. Inténtalo de nuevo.');
        return;
    }

    /* Firestore ya lo confirmó: se actualiza la copia local en lugar de
       volver a pedir toda la colección. */
    const solicitud = solicitudes.find(function (elemento) { return elemento.id === id; });
    if (solicitud) solicitud.estado = estado;
    dibujarTodo();
    mostrarAviso('Estado actualizado');

    const selector = document.getElementById('selectorEstado');
    if (selector) selector.focus();
}

/* ============================================
   ARRANQUE
   ============================================ */

function iniciarAdmin() {
    iniciarLogin();
    iniciarFiltros();
    iniciarLista();

    document.querySelectorAll('.admin-pestana').forEach(function (pestana) {
        pestana.addEventListener('click', function () { mostrarSeccion(pestana.dataset.seccion); });
    });

    document.getElementById('btnCerrarSesion').addEventListener('click', function () {
        cerrarSesion().catch(function (error) { console.error(error); });
    });

    observarSesion(alCambiarSesion);
}

iniciarAdmin();
