/**
 * Validación del formulario de contacto.
 *
 * No hay backend: al validar correctamente se oculta el formulario y se
 * muestra el mensaje de éxito. Solo lo usa contacto.html.
 */

function mostrarError(elemento, mensaje) {
    elemento.textContent = mensaje;
    elemento.style.display = 'block';
}

function ocultarError(elemento) {
    elemento.style.display = 'none';
}

function correoValido(valor) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim());
}

export function iniciarFormularioContacto() {
    const formulario = document.getElementById('mspContactForm');
    if (!formulario) return;

    const nombre  = document.getElementById('mspNombre');
    const email   = document.getElementById('mspEmail');
    const mensaje = document.getElementById('mspMensaje');

    const errNombre  = document.getElementById('mspNombreErr');
    const errEmail   = document.getElementById('mspEmailErr');
    const errMensaje = document.getElementById('mspMensajeErr');
    const exito      = document.getElementById('mspFormSuccess');

    /* Limpiar el error al escribir */
    nombre.addEventListener('input',  function () { ocultarError(errNombre); });
    email.addEventListener('input',   function () { ocultarError(errEmail); });
    mensaje.addEventListener('input', function () { ocultarError(errMensaje); });

    formulario.addEventListener('submit', function (evento) {
        evento.preventDefault();
        let valido = true;

        /* Nombre */
        if (nombre.value.trim() === '') {
            mostrarError(errNombre, 'Este campo es obligatorio.');
            valido = false;
        } else {
            ocultarError(errNombre);
        }

        /* Correo */
        if (email.value.trim() === '') {
            mostrarError(errEmail, 'Este campo es obligatorio.');
            valido = false;
        } else if (!correoValido(email.value)) {
            mostrarError(errEmail, 'Ingresa un correo electrónico válido.');
            valido = false;
        } else {
            ocultarError(errEmail);
        }

        /* Mensaje */
        if (mensaje.value.trim() === '') {
            mostrarError(errMensaje, 'Este campo es obligatorio.');
            valido = false;
        } else {
            ocultarError(errMensaje);
        }

        if (valido) {
            formulario.style.display = 'none';
            exito.style.display = 'block';
        }
    });
}

iniciarFormularioContacto();
