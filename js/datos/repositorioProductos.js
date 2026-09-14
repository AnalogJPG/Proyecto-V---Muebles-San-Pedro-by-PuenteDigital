/**
 * Repositorio de productos: único punto de acceso a los datos del catálogo.
 *
 * Ningún otro archivo lee products.json directamente. Todo pasa por aquí.
 *
 * Las funciones son asíncronas aunque hoy la fuente sea un archivo local.
 * Es deliberado: está prevista la migración a Cloud Firestore en un Sprint
 * posterior. Cuando ocurra, la lectura de products.json se sustituye por la
 * consulta a la colección y el resto de la aplicación no se entera, porque
 * la firma de estas funciones no cambia.
 *
 * Por eso tampoco se expone el arreglo de productos: quien lo necesite pide
 * una copia, y así nadie puede mutar la caché desde fuera.
 */

const RUTA_DATOS = 'products.json';

/** Caché en memoria: el JSON se pide una sola vez por carga de página. */
let promesaProductos = null;

/**
 * Devuelve el catálogo completo.
 * @returns {Promise<Array<Object>>}
 */
export async function obtenerProductos() {
    if (!promesaProductos) {
        promesaProductos = cargar();
    }

    try {
        const productos = await promesaProductos;
        /* Copia superficial: el llamador puede ordenar o filtrar sin tocar la caché. */
        return productos.slice();
    } catch (error) {
        /* Si la carga falla no se deja la promesa rechazada en la caché,
           para que un reintento posterior vuelva a pedir el archivo. */
        promesaProductos = null;
        throw error;
    }
}

/**
 * Busca un producto por su id.
 * @param {string} id
 * @returns {Promise<Object|null>} El producto, o null si no existe.
 */
export async function obtenerProductoPorId(id) {
    if (!id) return null;
    const productos = await obtenerProductos();
    return productos.find(function (producto) { return producto.id === id; }) || null;
}

async function cargar() {
    const respuesta = await fetch(RUTA_DATOS);
    if (!respuesta.ok) {
        throw new Error('No se pudo cargar ' + RUTA_DATOS + ' (' + respuesta.status + ')');
    }

    const datos = await respuesta.json();
    if (!Array.isArray(datos)) {
        throw new Error(RUTA_DATOS + ' no contiene un arreglo de productos');
    }
    return datos;
}
