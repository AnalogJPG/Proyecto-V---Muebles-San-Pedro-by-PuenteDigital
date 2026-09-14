/**
 * Formato de valores para la interfaz.
 */

const formateadorMXN = new Intl.NumberFormat('es-MX');

/**
 * Da formato a un precio para mostrarlo en pantalla.
 * El precio circula por la aplicación siempre como número; el texto se
 * construye solo en el momento de pintarlo.
 *
 * @param {number} valor Precio en pesos, por ejemplo 12990.
 * @returns {string} Precio formateado, por ejemplo "$12,990 MXN".
 */
export function formatearPrecio(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return '';
    return '$' + formateadorMXN.format(numero) + ' MXN';
}
