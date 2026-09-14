/**
 * Catálogo: filtros por categoría, modal de detalle, animación en cascada
 * y botones de "Agregar al carrito".
 *
 * Solo lo usa catalogo.html.
 */

import { agregarAlCarrito } from './carrito.js';

/**
 * Convierte el precio escrito en el atributo data-product-price
 * ("$12,990 MXN") al número que usa el carrito.
 *
 * Es un puente temporal. Cuando los productos salgan de products.json el
 * precio ya llegará como número y esta función desaparece.
 */
function precioDesdeTexto(texto) {
    const numero = parseFloat(String(texto || '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(numero) ? numero : 0;
}

/* ============================================
   FILTROS POR CATEGORÍA
   ============================================ */

function iniciarFiltros() {
    const botones  = document.querySelectorAll('.filter-btn');
    const tarjetas = document.querySelectorAll('.product-card');

    botones.forEach(function (boton) {
        boton.addEventListener('click', function () {
            botones.forEach(function (otro) { otro.classList.remove('active'); });
            this.classList.add('active');

            const filtro = this.getAttribute('data-filter');

            tarjetas.forEach(function (tarjeta) {
                if (filtro === 'todos') {
                    tarjeta.style.display = 'block';
                } else {
                    tarjeta.style.display = tarjeta.getAttribute('data-category') === filtro ? 'block' : 'none';
                }
            });
        });
    });
}

/* ============================================
   MODAL DE DETALLE
   ============================================ */

function iniciarModal() {
    const modal = document.getElementById('productModal');
    if (!modal) return;

    function cerrar() {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    document.querySelectorAll('.btn-view-details').forEach(function (boton) {
        boton.addEventListener('click', function () {
            const nombre      = this.getAttribute('data-product-name');
            const precioTexto = this.getAttribute('data-product-price');
            const imagen      = this.getAttribute('data-product-image');
            const id          = this.getAttribute('data-product-id');

            document.getElementById('modalProductName').textContent  = nombre;
            document.getElementById('modalProductPrice').textContent = precioTexto;
            document.getElementById('modalProductImage').src         = imagen;
            document.getElementById('modalProductImage').alt         = nombre;
            document.getElementById('modalDescription').textContent  = this.getAttribute('data-description');
            document.getElementById('modalDimensions').textContent   = this.getAttribute('data-dimensions');
            document.getElementById('modalMaterials').textContent    = this.getAttribute('data-materials');
            document.getElementById('modalGuarantee').textContent    = this.getAttribute('data-guarantee');

            const botonCotizar = document.getElementById('modalQuoteBtn');
            botonCotizar.href = id ? 'cotizacion.html?producto=' + id : 'cotizacion.html';

            /* El id real viaja en el modal para que "Agregar al carrito"
               use el mismo identificador que la tarjeta. */
            modal.dataset.productId    = id || '';
            modal.dataset.productImage = imagen || '';
            modal.dataset.productName  = nombre || '';
            modal.dataset.productPrice = String(precioDesdeTexto(precioTexto));

            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        });
    });

    const cruz = document.querySelector('.modal-close');
    if (cruz) cruz.addEventListener('click', cerrar);

    const botonCerrar = document.querySelector('.modal-close-btn');
    if (botonCerrar) botonCerrar.addEventListener('click', cerrar);

    window.addEventListener('click', function (evento) {
        if (evento.target === modal) cerrar();
    });

    document.addEventListener('keydown', function (evento) {
        if (evento.key === 'Escape' && modal.style.display === 'block') cerrar();
    });
}

/* ============================================
   ANIMACIÓN EN CASCADA AL HACER SCROLL
   ============================================ */

function iniciarAnimaciones() {
    const tarjetas = document.querySelectorAll('.product-card');

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
   BOTONES DE "AGREGAR AL CARRITO"
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

function iniciarBotonesDeCarrito() {
    /* Un botón por tarjeta, insertado después de "Ver detalles". */
    document.querySelectorAll('.btn-view-details').forEach(function (botonDetalles) {
        const boton = document.createElement('button');
        boton.className = 'btn-add-cart';
        boton.textContent = 'Agregar al carrito';

        boton.addEventListener('click', function () {
            agregarAlCarrito({
                id: botonDetalles.dataset.productId,
                nombre: botonDetalles.dataset.productName,
                precio: precioDesdeTexto(botonDetalles.dataset.productPrice),
                imagen: botonDetalles.dataset.productImage
            });
            confirmarAgregado(boton, true);
        });

        botonDetalles.parentNode.insertBefore(boton, botonDetalles.nextSibling);
    });

    /* Botón dentro del modal. */
    const acciones = document.querySelector('.modal-actions');
    const modal = document.getElementById('productModal');
    if (!acciones || !modal) return;

    const botonModal = document.createElement('button');
    botonModal.className = 'btn btn-secondary';
    botonModal.style.cssText = 'flex:1; background:#C9A84C; border:none; color:white; cursor:pointer; font-family:inherit;';
    botonModal.textContent = 'Agregar al carrito';

    botonModal.addEventListener('click', function () {
        if (!modal.dataset.productId) return;
        agregarAlCarrito({
            id: modal.dataset.productId,
            nombre: modal.dataset.productName,
            precio: Number(modal.dataset.productPrice),
            imagen: modal.dataset.productImage
        });
        confirmarAgregado(botonModal, false);
    });

    acciones.insertBefore(botonModal, acciones.firstChild);
}

/* ============================================
   ARRANQUE
   ============================================ */

export function iniciarCatalogo() {
    iniciarFiltros();
    iniciarModal();
    iniciarAnimaciones();
    iniciarBotonesDeCarrito();
}

iniciarCatalogo();
