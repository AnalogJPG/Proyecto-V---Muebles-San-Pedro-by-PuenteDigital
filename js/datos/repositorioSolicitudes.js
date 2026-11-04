/**
 * Repositorio de solicitudes de cotización: único módulo que las lee y las
 * escribe.
 *
 * Cada solicitud se guarda como un documento nuevo en la colección
 * "solicitudes" de Cloud Firestore. Quien llama arma los datos del
 * formulario; la fecha y el estado inicial se agregan aquí, para que ninguna
 * página pueda mandar otros valores.
 *
 * La lectura y el cambio de estado los usa el panel de administración. Que
 * funcionen depende de la sesión y de las reglas de Firestore, no de este
 * módulo.
 */

import {
    collection,
    doc,
    addDoc,
    updateDoc,
    query,
    orderBy,
    getDocsFromServer,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';
import { db } from './firebase.js';

const COLECCION = 'solicitudes';

/** Estados posibles de una solicitud, en el orden en que avanza. */
export const ESTADOS = ['pendiente', 'en_revision', 'atendida'];

/**
 * Registra una solicitud de cotización.
 * @param {Object} datos Nombre, correo, teléfono, productos, total y, si los
 *   hay, código postal y comentarios.
 * @returns {Promise<string>} El ID del documento creado.
 */
export async function registrarSolicitud(datos) {
    /* fecha es la hora del servidor, no la del navegador del visitante. */
    const documento = await addDoc(collection(db, COLECCION), Object.assign({}, datos, {
        fecha: serverTimestamp(),
        estado: 'pendiente'
    }));
    return documento.id;
}

/**
 * Devuelve todas las solicitudes, de la más reciente a la más antigua.
 * Se piden al servidor y no a la caché local, para que una falla de
 * conexión llegue como error.
 * @returns {Promise<Array<Object>>} Cada solicitud incluye su id.
 */
export async function obtenerSolicitudes() {
    const consulta = await getDocsFromServer(query(collection(db, COLECCION), orderBy('fecha', 'desc')));

    /* El id no se guarda como campo del documento: es el ID del documento. */
    return consulta.docs.map(function (documento) {
        return Object.assign({ id: documento.id }, documento.data());
    });
}

/**
 * Cambia el estado de una solicitud. Solo modifica ese campo.
 * @param {string} id
 * @param {string} estado Uno de ESTADOS.
 */
export async function actualizarEstado(id, estado) {
    if (!id) throw new Error('Falta el id de la solicitud');
    if (ESTADOS.indexOf(estado) === -1) throw new Error('Estado no válido: ' + estado);

    await updateDoc(doc(db, COLECCION, id), { estado: estado });
}
