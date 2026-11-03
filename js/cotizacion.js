/**
 * Solicitud de cotización: arma la solicitud a partir del carrito y la
 * registra en Firestore.
 *
 * Solo lo usa cotizacion.html.
 *
 * El formulario ya no tiene un selector de producto: los productos son los
 * del carrito. El resumen se dibuja desde obtenerCarrito() y se redibuja con
 * el evento carrito:actualizado, así que refleja los cambios de cantidad que
 * se hagan desde el panel lateral. Si se llega desde el catálogo con
 * ?producto=id, ese producto se agrega al carrito.
 *
 * Todo lo que viene del visitante o del carrito se inserta con textContent,
 * nunca con innerHTML.
 */

import { obtenerCarrito, agregarAlCarrito, vaciarCarrito } from './carrito.js';
import { obtenerProductoPorId } from './datos/repositorioProductos.js';
import { registrarSolicitud } from './datos/repositorioSolicitudes.js';
import { formatearPrecio } from './ui/formato.js';

/* Límites del formulario. Son los mismos que los atributos de
   cotizacion.html; si cambian aquí, hay que cambiarlos allá. */
const NOMBRE_MINIMO       = 2;
const NOMBRE_MAXIMO       = 100;
const CORREO_MAXIMO       = 120;
const COMENTARIOS_MAXIMO  = 1000;
const PATRON_TELEFONO      = /^[0-9 +()-]{10,20}$/;
const PATRON_CODIGO_POSTAL = /^[0-9]{5}$/;
const PATRON_CORREO        = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Tiempo máximo de espera por la confirmación de Firestore. */
const ESPERA_MAXIMA_MS = 15000;

/** Evita envíos dobles mientras se espera la respuesta de Firestore. */
let enviando = false;

function calcularTotal(carrito) {
    return carrito.reduce(function (suma, item) { return suma + item.precio * item.cantidad; }, 0);
}

/* ============================================
   RESUMEN DE PRODUCTOS
   ============================================ */

function crearCelda(etiqueta, texto) {
    const celda = document.createElement(etiqueta);
    celda.textContent = texto;
    return celda;
}

/** Aviso de carrito vacío, con enlace al catálogo. */
function crearAvisoCarritoVacio() {
    const aviso = document.createElement('p');
    aviso.className = 'quote-summary-empty';

    const enlace = document.createElement('a');
    enlace.href = 'catalogo.html';
    enlace.textContent = 'Agrega productos desde el catálogo';

    aviso.append('Tu carrito está vacío. ', enlace, ' para solicitar una cotización.');
    return aviso;
}

function crearTablaResumen(carrito) {
    const tabla = document.createElement('table');
    tabla.className = 'quote-summary-table';

    const encabezado = document.createElement('tr');
    ['Producto', 'Cantidad', 'Precio'].forEach(function (titulo) {
        const celda = crearCelda('th', titulo);
        celda.scope = 'col';
        encabezado.appendChild(celda);
    });
    tabla.createTHead().appendChild(encabezado);

    const cuerpo = tabla.createTBody();
    carrito.forEach(function (item) {
        const fila = document.createElement('tr');
        fila.appendChild(crearCelda('td', item.nombre));
        fila.appendChild(crearCelda('td', String(item.cantidad)));
        fila.appendChild(crearCelda('td', formatearPrecio(item.precio)));
        cuerpo.appendChild(fila);
    });

    const pie = document.createElement('tr');
    const etiquetaTotal = crearCelda('th', 'Total estimado');
    etiquetaTotal.scope = 'row';
    etiquetaTotal.colSpan = 2;
    pie.appendChild(etiquetaTotal);
    pie.appendChild(crearCelda('td', formatearPrecio(calcularTotal(carrito))));
    tabla.createTFoot().appendChild(pie);

    return tabla;
}

/**
 * Redibuja el resumen desde el carrito guardado. Con el carrito vacío no hay
 * nada que cotizar, así que el envío queda desactivado.
 *
 * El botón viene desactivado desde el HTML y solo se activa aquí. Si este
 * script no llega a cargar, el navegador no puede enviar el formulario por
 * su cuenta.
 */
function dibujarResumen() {
    const contenedor  = document.getElementById('cotizacionResumen');
    const botonEnviar = document.getElementById('cotizacionEnviar');
    if (!contenedor) return;

    const carrito = obtenerCarrito();
    contenedor.replaceChildren();

    if (carrito.length === 0) {
        contenedor.appendChild(crearAvisoCarritoVacio());
    } else {
        contenedor.appendChild(crearTablaResumen(carrito));

        const nota = document.createElement('p');
        nota.className = 'quote-summary-note';
        nota.textContent = 'Puedes cambiar las cantidades desde el carrito.';
        contenedor.appendChild(nota);
    }

    if (botonEnviar) botonEnviar.disabled = enviando || carrito.length === 0;
}

/* ============================================
   MENSAJES DE ERROR
   ============================================ */

function mostrarErrores(mensajes) {
    const contenedor = document.getElementById('cotizacionError');
    if (!contenedor) return;

    contenedor.replaceChildren();
    if (mensajes.length === 1) {
        contenedor.appendChild(crearCelda('p', mensajes[0]));
    } else {
        const lista = document.createElement('ul');
        mensajes.forEach(function (mensaje) { lista.appendChild(crearCelda('li', mensaje)); });
        contenedor.appendChild(lista);
    }

    contenedor.hidden = false;
    contenedor.focus();
}

function ocultarErrores() {
    const contenedor = document.getElementById('cotizacionError');
    if (!contenedor) return;
    contenedor.hidden = true;
    contenedor.replaceChildren();
}

/* ============================================
   PRODUCTO QUE LLEGA EN LA URL
   ============================================ */

/**
 * El botón "Solicitar Cotización" del catálogo llega con ?producto=id.
 * Ese producto se agrega al carrito si no estaba; si ya estaba, no se toca
 * su cantidad. Al final se quita el parámetro para que recargar la página
 * no lo repita.
 */
async function agregarProductoDeLaUrl() {
    const url = new URL(window.location.href);
    const id = url.searchParams.get('producto');
    if (!id) return;

    try {
        const producto = await obtenerProductoPorId(id);
        if (!producto) {
            mostrarErrores(['No encontramos el producto que elegiste. Puedes agregarlo desde el catálogo.']);
            return;
        }

        const yaEsta = obtenerCarrito().some(function (item) { return item.id === producto.id; });
        if (!yaEsta) {
            agregarAlCarrito({
                id: producto.id,
                nombre: producto.nombre,
                precio: producto.precio,
                imagen: producto.imagen
            });
        }
    } catch (error) {
        console.error(error);
        mostrarErrores(['No pudimos agregar el producto a tu cotización. Puedes agregarlo desde el catálogo.']);
    } finally {
        url.searchParams.delete('producto');
        history.replaceState(null, '', url);
    }
}

/* ============================================
   VALIDACIÓN
   ============================================ */

function leerCampos(formulario) {
    function valor(nombre) { return formulario.elements[nombre].value.trim(); }
    return {
        nombre: valor('nombre'),
        correo: valor('correo'),
        telefono: valor('telefono'),
        codigoPostal: valor('codigoPostal'),
        comentarios: valor('comentarios')
    };
}

/**
 * Revisa los campos con los mismos límites del HTML.
 * @returns {Array<{campo: string|null, mensaje: string}>} Vacío si todo es válido.
 */
function validar(campos, carrito) {
    const errores = [];

    if (campos.nombre.length < NOMBRE_MINIMO || campos.nombre.length > NOMBRE_MAXIMO) {
        errores.push({ campo: 'nombre', mensaje: 'Escribe tu nombre completo, de 2 a 100 caracteres.' });
    }
    if (!PATRON_CORREO.test(campos.correo) || campos.correo.length > CORREO_MAXIMO) {
        errores.push({ campo: 'correo', mensaje: 'Escribe un correo electrónico válido, de hasta 120 caracteres.' });
    }
    if (!PATRON_TELEFONO.test(campos.telefono)) {
        errores.push({ campo: 'telefono', mensaje: 'Escribe un teléfono de 10 a 20 caracteres, con dígitos, espacios, +, paréntesis o guiones.' });
    }
    if (campos.codigoPostal && !PATRON_CODIGO_POSTAL.test(campos.codigoPostal)) {
        errores.push({ campo: 'codigoPostal', mensaje: 'El código postal debe tener 5 dígitos.' });
    }
    if (campos.comentarios.length > COMENTARIOS_MAXIMO) {
        errores.push({ campo: 'comentarios', mensaje: 'Los comentarios pueden tener hasta 1000 caracteres.' });
    }
    if (carrito.length === 0) {
        errores.push({ campo: null, mensaje: 'Agrega al menos un producto a tu carrito.' });
    }

    return errores;
}

/** Marca con aria-invalid los campos que tienen error y desmarca los demás. */
function marcarCampos(formulario, errores) {
    ['nombre', 'correo', 'telefono', 'codigoPostal', 'comentarios'].forEach(function (nombre) {
        const conError = errores.some(function (error) { return error.campo === nombre; });
        formulario.elements[nombre].setAttribute('aria-invalid', conError ? 'true' : 'false');
    });
}

/* ============================================
   ENVÍO
   ============================================ */

function armarSolicitud(campos, carrito) {
    const solicitud = {
        nombre: campos.nombre,
        correo: campos.correo,
        telefono: campos.telefono,
        productos: carrito.map(function (item) {
            return { id: item.id, nombre: item.nombre, precio: item.precio, cantidad: item.cantidad };
        }),
        total: calcularTotal(carrito)
    };

    /* Los opcionales solo viajan si tienen texto: las reglas de Firestore
       rechazan estos campos cuando llegan vacíos. */
    if (campos.codigoPostal) solicitud.codigoPostal = campos.codigoPostal;
    if (campos.comentarios)  solicitud.comentarios  = campos.comentarios;

    return solicitud;
}

/**
 * Rechaza si la promesa no se resuelve a tiempo. Sin conexión, addDoc no
 * falla: deja la escritura en cola y espera. Esto no cancela esa escritura,
 * que Firestore todavía puede completar después.
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

function mostrarConfirmacion(formulario) {
    const confirmacion = document.getElementById('cotizacionConfirmacion');
    formulario.hidden = true;
    if (!confirmacion) return;
    confirmacion.hidden = false;
    confirmacion.focus();
}

async function enviar(formulario, botonEnviar) {
    if (enviando) return;

    const campos  = leerCampos(formulario);
    const carrito = obtenerCarrito();
    const errores = validar(campos, carrito);

    marcarCampos(formulario, errores);
    if (errores.length > 0) {
        mostrarErrores(errores.map(function (error) { return error.mensaje; }));
        return;
    }
    ocultarErrores();

    /* Sin conexión ni se intenta: la escritura quedaría en cola sin respuesta. */
    if (!navigator.onLine) {
        mostrarErrores(['No tienes conexión a internet. Revisa tu conexión e intenta de nuevo.']);
        return;
    }

    const textoOriginal = botonEnviar.textContent;
    enviando = true;
    botonEnviar.disabled = true;
    botonEnviar.textContent = 'Enviando…';

    try {
        await conLimiteDeTiempo(registrarSolicitud(armarSolicitud(campos, carrito)), ESPERA_MAXIMA_MS);
    } catch (error) {
        /* El detalle técnico va solo a la consola; el formulario y el
           carrito se conservan para reintentar. */
        console.error(error);
        mostrarErrores([error.name === 'TiempoAgotado'
            ? 'No pudimos confirmar el envío. Revisa tu conexión antes de intentar de nuevo.'
            : 'No pudimos enviar tu solicitud. Revisa tu conexión e intenta de nuevo.']);
        return;
    } finally {
        enviando = false;
        botonEnviar.textContent = textoOriginal;
        dibujarResumen();
    }

    formulario.reset();
    mostrarConfirmacion(formulario);
    vaciarCarrito();
}

/* ============================================
   ARRANQUE
   ============================================ */

function iniciarCotizacion() {
    const formulario  = document.getElementById('cotizacionForm');
    const botonEnviar = document.getElementById('cotizacionEnviar');
    if (!formulario || !botonEnviar) return;

    document.addEventListener('carrito:actualizado', dibujarResumen);

    formulario.addEventListener('submit', function (evento) {
        evento.preventDefault();
        enviar(formulario, botonEnviar);
    });

    /* Limpiar el formulario también limpia los errores que se mostraban. */
    formulario.addEventListener('reset', function () {
        ocultarErrores();
        marcarCampos(formulario, []);
    });

    dibujarResumen();
    agregarProductoDeLaUrl();
}

iniciarCotizacion();
