/**
 * Catálogo: dibuja las tarjetas desde products.json, filtra por categoría,
 * abre el modal de detalle y agrega productos al carrito.
 *
 * Solo lo usa catalogo.html.
 *
 * Las tarjetas ya no existen en el HTML al cargar la página, así que no se
 * pueden enganchar listeners de uno en uno como antes. Todo lo que ocurre
 * dentro de la cuadrícula se resuelve por delegación de eventos sobre el
 * contenedor, que sí existe desde el principio.
 */

import { obtenerProductos, obtenerProductoPorId } from './datos/repositorioProductos.js';
import { agregarAlCarrito } from './carrito.js';
import { formatearPrecio } from './ui/formato.js';
import { normalizarTexto, terminoDeLaUrl } from './busqueda.js';

/** Escapa el texto que se inserta como atributo o contenido HTML. */
function escapar(texto) {
    return String(texto == null ? '' : texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/* ============================================
   TARJETAS
   ============================================ */

/**
 * Marcado de una tarjeta. Mantiene las mismas clases y la misma estructura
 * que tenían las tarjetas escritas a mano, para que el CSS siga aplicando
 * sin tocar nada.
 *
 * Los datos del producto ya no viajan en atributos data-: el modal los pide
 * al repositorio por id. Solo se conserva el id.
 */
function plantillaTarjeta(producto) {
    const nombre = escapar(producto.nombre);
    const id     = escapar(producto.id);

    return '<article class="card product-card categoria-' + escapar(producto.categoria) + '" data-category="' + escapar(producto.categoria) + '" data-product-id="' + id + '">' +
        '<div class="card-image">' +
            '<img src="' + escapar(producto.imagen) + '" alt="' + nombre + '">' +
        '</div>' +
        '<div class="card-body">' +
            '<h3>' + nombre + '</h3>' +
            '<p class="price">' + escapar(formatearPrecio(producto.precio)) + '</p>' +
            '<button class="btn-primary btn-view-details" data-product-id="' + id + '">Ver detalles</button>' +
            '<button class="btn-add-cart" data-product-id="' + id + '">Agregar al carrito</button>' +
        '</div>' +
    '</article>';
}

/* ============================================
   FILTRO POR CATEGORÍA Y BÚSQUEDA
   ============================================ */

let categoriaActiva = 'todos';
let terminoBusqueda = '';

/**
 * Texto normalizado de cada producto, por id.
 * Se calcula una vez al dibujar en lugar de en cada pulsación de tecla.
 * La búsqueda mira nombre, descripción y materiales.
 */
const textoBuscable = new Map();

function indexarParaBusqueda(productos) {
    textoBuscable.clear();
    productos.forEach(function (producto) {
        textoBuscable.set(
            producto.id,
            normalizarTexto([producto.nombre, producto.descripcion, producto.materiales].join(' '))
        );
    });
}

/** Los dos criterios se combinan: una tarjeta debe cumplir ambos. */
function aplicarFiltros(contenedor) {
    contenedor.querySelectorAll('.product-card').forEach(function (tarjeta) {
        const coincideCategoria = categoriaActiva === 'todos' || tarjeta.dataset.category === categoriaActiva;
        const coincideBusqueda  = terminoBusqueda === '' ||
            (textoBuscable.get(tarjeta.dataset.productId) || '').includes(terminoBusqueda);

        tarjeta.style.display = (coincideCategoria && coincideBusqueda) ? 'block' : 'none';
    });
}

function iniciarFiltros(contenedor) {
    const botones = document.querySelectorAll('.filter-btn');

    botones.forEach(function (boton) {
        boton.addEventListener('click', function () {
            botones.forEach(function (otro) { otro.classList.remove('active'); });
            this.classList.add('active');
            categoriaActiva = this.getAttribute('data-filter');
            aplicarFiltros(contenedor);
        });
    });
}

/**
 * Refleja el término en la URL sin agregar entradas al historial, para que
 * el botón Atrás no tenga que deshacer letra por letra.
 */
function sincronizarUrl(termino) {
    const url = new URL(window.location.href);
    if (termino) {
        url.searchParams.set('q', termino);
    } else {
        url.searchParams.delete('q');
    }
    history.replaceState(null, '', url);
}

function iniciarBuscador(contenedor) {
    const input = document.getElementById('buscador');
    if (!input) return;

    function buscar() {
        terminoBusqueda = normalizarTexto(input.value);
        aplicarFiltros(contenedor);
        sincronizarUrl(input.value.trim());
    }

    /* En vivo, sin recargar. */
    input.addEventListener('input', buscar);

    /* Enter no debe enviar nada ni recargar: aquí ya estamos en el catálogo. */
    input.addEventListener('keydown', function (evento) {
        if (evento.key === 'Enter') {
            evento.preventDefault();
            buscar();
        }
    });
}

/* ============================================
   ANIMACIÓN EN CASCADA
   ============================================ */

/**
 * Observa las tarjetas justo después de generarlas, conservando el retraso
 * en cascada de índice * 0.08s.
 */
function observarTarjetas(contenedor) {
    const tarjetas = contenedor.querySelectorAll('.product-card');

    if (!('IntersectionObserver' in window)) {
        tarjetas.forEach(function (tarjeta) { tarjeta.style.opacity = 1; });
        return;
    }

    const observador = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (entrada) {
            if (!entrada.isIntersecting) return;
            const tarjeta = entrada.target;
            const indice = parseInt(tarjeta.dataset.animIdx) || 0;
            tarjeta.style.animationDelay = (indice * 0.08) + 's';
            tarjeta.classList.add('animate-in');
            observador.unobserve(tarjeta);
        });
    }, { threshold: 0.12 });

    tarjetas.forEach(function (tarjeta, indice) {
        tarjeta.dataset.animIdx = indice;
        observador.observe(tarjeta);
    });
}

/* ============================================
   MODAL DE DETALLE
   ============================================ */

function cerrarModal() {
    const modal = document.getElementById('productModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function abrirModal(producto) {
    const modal = document.getElementById('productModal');
    if (!modal || !producto) return;

    document.getElementById('modalProductName').textContent  = producto.nombre;
    document.getElementById('modalProductPrice').textContent = formatearPrecio(producto.precio);
    document.getElementById('modalProductImage').src         = producto.imagen;
    document.getElementById('modalProductImage').alt         = producto.nombre;
    document.getElementById('modalDescription').textContent  = producto.descripcion;
    document.getElementById('modalDimensions').textContent   = producto.dimensiones;
    document.getElementById('modalMaterials').textContent    = producto.materiales;
    document.getElementById('modalGuarantee').textContent    = producto.garantia;

    document.getElementById('modalQuoteBtn').href = 'cotizacion.html?producto=' + producto.id;

    /* El id viaja en el modal para que su botón de carrito use el mismo
       identificador que la tarjeta. */
    modal.dataset.productId = producto.id;

    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function iniciarModal() {
    const modal = document.getElementById('productModal');
    if (!modal) return;

    const cruz = document.querySelector('.modal-close');
    if (cruz) cruz.addEventListener('click', cerrarModal);

    const botonCerrar = document.querySelector('.modal-close-btn');
    if (botonCerrar) botonCerrar.addEventListener('click', cerrarModal);

    window.addEventListener('click', function (evento) {
        if (evento.target === modal) cerrarModal();
    });

    document.addEventListener('keydown', function (evento) {
        if (evento.key === 'Escape' && modal.style.display === 'block') cerrarModal();
    });
}

/* ============================================
   AGREGAR AL CARRITO
   ============================================ */

/** Retroalimentación visual compartida por los dos botones. */
function confirmarAgregado(boton, conClase) {
    const textoOriginal = boton.textContent;
    boton.textContent = '✓ Agregado';
    if (conClase) boton.classList.add('added');
    setTimeout(function () {
        boton.textContent = textoOriginal;
        if (conClase) boton.classList.remove('added');
    }, 1500);
}

async function agregarPorId(id) {
    const producto = await obtenerProductoPorId(id);
    if (!producto) return false;
    agregarAlCarrito({
        id: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        imagen: producto.imagen
    });
    return true;
}

function iniciarBotonDelModal() {
    const acciones = document.querySelector('.modal-actions');
    const modal = document.getElementById('productModal');
    if (!acciones || !modal) return;

    const boton = document.createElement('button');
    boton.className = 'btn btn-secondary';
    boton.style.cssText = 'flex:1; background:#C9A84C; border:none; color:white; cursor:pointer; font-family:inherit;';
    boton.textContent = 'Agregar al carrito';

    boton.addEventListener('click', async function () {
        if (await agregarPorId(modal.dataset.productId)) {
            confirmarAgregado(boton, false);
        }
    });

    acciones.insertBefore(boton, acciones.firstChild);
}

/* ============================================
   DELEGACIÓN SOBRE LA CUADRÍCULA
   ============================================ */

function iniciarDelegacion(contenedor) {
    contenedor.addEventListener('click', async function (evento) {
        const detalles = evento.target.closest('.btn-view-details');
        if (detalles) {
            abrirModal(await obtenerProductoPorId(detalles.dataset.productId));
            return;
        }

        const agregar = evento.target.closest('.btn-add-cart');
        if (agregar) {
            if (await agregarPorId(agregar.dataset.productId)) {
                confirmarAgregado(agregar, true);
            }
        }
    });
}

/* ============================================
   ARRANQUE
   ============================================ */

export async function iniciarCatalogo() {
    const contenedor = document.getElementById('productGrid');
    if (!contenedor) return;

    iniciarModal();
    iniciarBotonDelModal();
    iniciarDelegacion(contenedor);
    iniciarFiltros(contenedor);
    iniciarBuscador(contenedor);

    /* El término llega en la URL cuando se busca desde otra página.
       Se aplica antes de dibujar, para que el primer pintado ya venga
       filtrado, y se refleja en el input para que se vea qué se buscó. */
    const terminoInicial = terminoDeLaUrl();
    const input = document.getElementById('buscador');
    if (terminoInicial && input) {
        input.value = terminoInicial;
        terminoBusqueda = normalizarTexto(terminoInicial);
    }

    const productos = await obtenerProductos();
    indexarParaBusqueda(productos);
    contenedor.innerHTML = productos.map(plantillaTarjeta).join('');

    observarTarjetas(contenedor);
    aplicarFiltros(contenedor);
}

iniciarCatalogo();
