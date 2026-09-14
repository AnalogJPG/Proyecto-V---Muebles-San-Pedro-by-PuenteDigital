/**
 * Buscador del header.
 *
 * El input existe en las siete páginas. En el catálogo la búsqueda filtra en
 * vivo, sin recargar; en cualquier otra página redirige a
 * catalogo.html?q=termino, que es el único sitio donde hay productos que
 * mostrar.
 *
 * Este módulo solo conecta el caso de la redirección. El catálogo importa
 * normalizarTexto y terminoDeLaUrl y monta su propio filtrado en vivo.
 */

/**
 * Normaliza texto para comparar: sin mayúsculas y sin acentos.
 *
 * Se descompone en NFD para separar cada letra de su diacrítico y luego se
 * eliminan los diacríticos. Así "recamara" encuentra "Recámara" y "berlin"
 * encuentra "Berlín". Hay que aplicarlo a los dos lados de la comparación.
 *
 * @param {string} texto
 * @returns {string}
 */
export function normalizarTexto(texto) {
    return String(texto == null ? '' : texto)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

/** Lee el parámetro q de la URL. */
export function terminoDeLaUrl() {
    return new URLSearchParams(window.location.search).get('q') || '';
}

/**
 * Conecta el buscador en las páginas que no son el catálogo: al pulsar Enter
 * se navega al catálogo con el término en la URL.
 */
export function iniciarBuscadorConRedireccion() {
    const input = document.getElementById('buscador');
    if (!input) return;

    input.addEventListener('keydown', function (evento) {
        if (evento.key !== 'Enter') return;
        evento.preventDefault();

        const termino = input.value.trim();
        if (!termino) return;

        window.location.href = 'catalogo.html?q=' + encodeURIComponent(termino);
    });
}

/* El catálogo monta su propio buscador en vivo, así que aquí solo se conecta
   la redirección cuando la página no tiene cuadrícula de productos. */
if (!document.getElementById('productGrid')) {
    iniciarBuscadorConRedireccion();
}
