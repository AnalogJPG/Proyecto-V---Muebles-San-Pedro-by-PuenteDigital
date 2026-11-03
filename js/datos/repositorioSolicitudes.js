/**
 * Repositorio de solicitudes de cotización: único módulo que las escribe.
 *
 * Cada solicitud se guarda como un documento nuevo en la colección
 * "solicitudes" de Cloud Firestore. Quien llama arma los datos del
 * formulario; la fecha y el estado inicial se agregan aquí, para que ninguna
 * página pueda mandar otros valores.
 */

import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';
import { db } from './firebase.js';

const COLECCION = 'solicitudes';

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
