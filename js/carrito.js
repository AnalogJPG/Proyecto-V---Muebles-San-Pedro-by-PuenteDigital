/**
 * Carrito de compras.
 *
 * Persiste en localStorage bajo la clave msp_cart y vive en las siete
 * páginas, porque el carrito sobrevive a la navegación y el badge del
 * header debe mostrar el conteo esté donde esté el visitante.
 *
 * Las operaciones del panel lateral se resuelven por delegación de eventos
 * sobre el contenedor de la lista: un solo listener lee el atributo
 * data-operacion del elemento pulsado. No hay onclick embebido en el HTML
 * generado ni funciones globales colgadas de window.
 */

import { formatearPrecio } from './ui/formato.js';

const CLAVE_CARRITO = 'msp_cart';

/* ============================================
   LECTURA Y ESCRITURA EN LOCALSTORAGE
   ============================================ */

/**
 * Lee el carrito guardado.
 *
 * La lectura es tolerante a propósito: descarta cualquier entrada que no
 * traiga un precio numérico. Esa es la forma que tenían los carritos
 * guardados antes de este refactor, cuando el precio se almacenaba como
 * texto. No se migran: no hay usuarios reales con carritos viejos y el
 * código de migración seria deuda permanente.
 */
function leerCarrito() {
    let guardado;
    try {
        guardado = JSON.parse(localStorage.getItem(CLAVE_CARRITO));
    } catch (error) {
        return [];
    }
    if (!Array.isArray(guardado)) return [];
    return guardado.filter(function (item) {
        return item && typeof item.precio === 'number' && typeof item.id === 'string';
    });
}

function guardarCarrito(carrito) {
    localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
}

/* ============================================
   OPERACIONES
   ============================================ */

/**
 * Agrega un producto al carrito, o incrementa su cantidad si ya estaba.
 *
 * @param {{id: string, nombre: string, precio: number, imagen: string}} producto
 */
export function agregarAlCarrito(producto) {
    if (!producto || !producto.id || typeof producto.precio !== 'number') return;

    const carrito = leerCarrito();
    const existente = carrito.find(function (item) { return item.id === producto.id; });

    if (existente) {
        existente.cantidad += 1;
    } else {
        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            imagen: producto.imagen,
            cantidad: 1
        });
    }

    guardarCarrito(carrito);
    refrescar();
}

function cambiarCantidad(id, incremento) {
    const carrito = leerCarrito();
    const item = carrito.find(function (elemento) { return elemento.id === id; });
    if (!item) return;
    item.cantidad = Math.max(1, item.cantidad + incremento);
    guardarCarrito(carrito);
    refrescar();
}

function eliminarItem(id) {
    guardarCarrito(leerCarrito().filter(function (item) { return item.id !== id; }));
    refrescar();
}

function vaciarCarrito() {
    guardarCarrito([]);
    refrescar();
}

/* ============================================
   RENDER
   ============================================ */

function refrescar() {
    const carrito = leerCarrito();
    actualizarBadge(carrito);
    dibujarPanel(carrito);
}

function actualizarBadge(carrito) {
    const badge = document.getElementById('cartBadge');
    if (!badge) return;

    const conteo = carrito.reduce(function (suma, item) { return suma + item.cantidad; }, 0);
    badge.textContent = conteo;
    badge.style.display = conteo > 0 ? 'inline-flex' : 'none';
    badge.classList.remove('pulse');
    void badge.offsetWidth;
    if (conteo > 0) badge.classList.add('pulse');
}

/** Escapa el texto que se inserta como HTML en el panel. */
function escapar(texto) {
    return String(texto == null ? '' : texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function dibujarPanel(carrito) {
    const listaEl  = document.getElementById('cartItemsList');
    const vacioEl  = document.getElementById('cartEmptyMsg');
    const pieEl    = document.getElementById('cartFooter');
    const totalEl  = document.getElementById('cartTotalAmt');
    if (!listaEl || !vacioEl || !pieEl || !totalEl) return;

    if (carrito.length === 0) {
        listaEl.innerHTML = '';
        vacioEl.style.display = 'block';
        pieEl.style.display = 'none';
        return;
    }

    vacioEl.style.display = 'none';
    pieEl.style.display = 'block';

    let total = 0;
    listaEl.innerHTML = carrito.map(function (item) {
        total += item.precio * item.cantidad;
        const nombre = escapar(item.nombre);
        const id     = escapar(item.id);
        return '<div class="cart-item">' +
            '<img class="cart-item-img" src="' + escapar(item.imagen) + '" alt="' + nombre + '">' +
            '<div class="cart-item-info">' +
                '<p class="cart-item-name" title="' + nombre + '">' + nombre + '</p>' +
                '<p class="cart-item-price">' + escapar(formatearPrecio(item.precio)) + '</p>' +
                '<div class="cart-item-controls">' +
                    '<button class="qty-btn" data-operacion="decrementar" data-id="' + id + '">−</button>' +
                    '<span class="qty-val">' + item.cantidad + '</span>' +
                    '<button class="qty-btn" data-operacion="incrementar" data-id="' + id + '">+</button>' +
                    '<button class="remove-item-btn" data-operacion="eliminar" data-id="' + id + '" title="Eliminar">🗑</button>' +
                '</div>' +
            '</div>' +
        '</div>';
    }).join('');

    totalEl.textContent = formatearPrecio(total);
}

/* ============================================
   PANEL LATERAL
   ============================================ */

function abrirPanel() {
    document.getElementById('cartDrawer').classList.add('open');
    document.getElementById('cartOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function cerrarPanel() {
    document.getElementById('cartDrawer').classList.remove('open');
    document.getElementById('cartOverlay').classList.remove('open');
    document.body.style.overflow = '';
}

/* ============================================
   ARRANQUE
   ============================================ */

/**
 * Conecta los controles del carrito y pinta el estado guardado.
 * Se ejecuta en las siete páginas.
 */
export function iniciarCarrito() {
    const listaEl = document.getElementById('cartItemsList');
    if (!listaEl) return;

    /* Delegación: un solo listener para todas las operaciones del panel. */
    listaEl.addEventListener('click', function (evento) {
        const boton = evento.target.closest('[data-operacion]');
        if (!boton || !listaEl.contains(boton)) return;

        const id = boton.dataset.id;
        if (!id) return;

        if (boton.dataset.operacion === 'incrementar')      cambiarCantidad(id, 1);
        else if (boton.dataset.operacion === 'decrementar') cambiarCantidad(id, -1);
        else if (boton.dataset.operacion === 'eliminar')    eliminarItem(id);
    });

    const botonAbrir   = document.getElementById('cartToggle');
    const botonCerrar  = document.getElementById('cartClose');
    const overlay      = document.getElementById('cartOverlay');
    const botonVaciar  = document.getElementById('cartClearBtn');

    if (botonAbrir)  botonAbrir.addEventListener('click', abrirPanel);
    if (botonCerrar) botonCerrar.addEventListener('click', cerrarPanel);
    if (overlay)     overlay.addEventListener('click', cerrarPanel);
    if (botonVaciar) botonVaciar.addEventListener('click', vaciarCarrito);

    refrescar();
}

iniciarCarrito();
