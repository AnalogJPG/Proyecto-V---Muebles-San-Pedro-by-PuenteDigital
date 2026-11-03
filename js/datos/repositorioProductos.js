/**
 * Repositorio de productos: único punto de acceso a los datos del catálogo.
 *
 * Ningún otro archivo consulta Firestore directamente. Todo pasa por aquí.
 *
 * Los productos se leen de la colección "productos" de Cloud Firestore.
 * Antes venían de products.json; la migración no cambió la firma de estas
 * funciones, así que el resto de la aplicación no se enteró. products.json
 * sigue en el repositorio solo como fuente de scripts/cargar-productos.mjs,
 * y ya no se publica.
 *
 * Por eso tampoco se expone el arreglo de productos: quien lo necesite pide
 * una copia, y así nadie puede mutar la caché desde fuera.
 */

import { collection, getDocsFromServer } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';
import { db } from './firebase.js';

const COLECCION = 'productos';

/**
 * Orden en que se muestran las categorías: el mismo en que aparecen en
 * products.json. Firestore devuelve los documentos ordenados por ID, así que
 * el orden se rehace en el cliente. Una categoría que no esté aquí va al final.
 */
const ORDEN_CATEGORIAS = ['salas', 'comedores', 'recamaras', 'otros'];

/** Caché en memoria: la colección se pide una sola vez por carga de página. */
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
           para que un reintento posterior vuelva a consultar Firestore. */
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

function posicionDeCategoria(categoria) {
    const posicion = ORDEN_CATEGORIAS.indexOf(categoria);
    return posicion === -1 ? ORDEN_CATEGORIAS.length : posicion;
}

async function cargar() {
    /* Se pide al servidor y no a la caché local: sin conexión, getDocs
       podría resolver con una lista vacía y el catálogo parecería no tener
       productos. Así la falla llega como error. */
    const consulta = await getDocsFromServer(collection(db, COLECCION));

    /* El id no se guarda como campo del documento: es el ID del documento. */
    const productos = consulta.docs.map(function (documento) {
        return Object.assign({ id: documento.id }, documento.data());
    });

    /* sort es estable: dentro de cada categoría se conserva el orden por ID
       con que llegan los documentos. El orden original de products.json no
       se puede reconstruir sin agregar un campo, porque ningún campo actual
       lo reproduce. */
    return productos.sort(function (a, b) {
        return posicionDeCategoria(a.categoria) - posicionDeCategoria(b.categoria);
    });
}
