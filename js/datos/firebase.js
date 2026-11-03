/**
 * Conexión con Firebase: inicializa la app y expone la instancia de Firestore.
 *
 * El SDK se carga como módulos ES directamente desde gstatic, sin bundler ni
 * npm, porque el sitio es estático. Todos los módulos del SDK deben usar la
 * misma versión exacta; si se actualiza aquí, hay que actualizarla también en
 * repositorioProductos.js.
 *
 * La configuración no es secreta: solo identifica el proyecto ante Firebase.
 * Lo que protege los datos son las reglas de seguridad de Firestore.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';

const configuracion = {
    apiKey: 'AIzaSyApDqm9Oy2IzPduVIxYCmtNK64NHMD7bZM',
    authDomain: 'muebles-san-pedro.firebaseapp.com',
    projectId: 'muebles-san-pedro',
    storageBucket: 'muebles-san-pedro.firebasestorage.app',
    messagingSenderId: '142740598955',
    appId: '1:142740598955:web:ea4f1c92c2a1dbf06987ee'
};

const app = initializeApp(configuracion);

export const db = getFirestore(app);
