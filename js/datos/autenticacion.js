/**
 * Autenticación del panel de administración con Firebase Authentication.
 *
 * Es el único módulo que carga el SDK de Auth. Solo lo importa admin.js, así
 * que las páginas públicas no descargan ese peso.
 *
 * La versión del SDK debe ser la misma que en firebase.js.
 */

import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js';
import { app } from './firebase.js';

const auth = getAuth(app);

/* Los correos que envía Firebase, como el de recuperación, salen en español. */
auth.languageCode = 'es';

/**
 * Inicia sesión con correo y contraseña.
 * @returns {Promise<Object>} El usuario que inició sesión.
 */
export async function iniciarSesion(correo, contrasena) {
    const credencial = await signInWithEmailAndPassword(auth, correo, contrasena);
    return credencial.user;
}

export function cerrarSesion() {
    return signOut(auth);
}

/**
 * Llama a callback con el usuario cada vez que cambia la sesión, o con null
 * si no hay sesión. La primera llamada llega en cuanto Firebase sabe si había
 * una sesión guardada.
 * @returns {Function} Función para dejar de observar.
 */
export function observarSesion(callback) {
    return onAuthStateChanged(auth, callback);
}

/** Envía al correo el enlace para restablecer la contraseña. */
export function recuperarContrasena(correo) {
    return sendPasswordResetEmail(auth, correo);
}
