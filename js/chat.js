/**
 * Chat de atención de la página de contacto.
 *
 * No hay backend: las respuestas salen de una tabla de palabras clave. Si el
 * mensaje no coincide con ninguna, se devuelve la respuesta por defecto.
 *
 * Solo lo usa contacto.html.
 */

const respuestas = [
    {
        palabras: ["precio", "costo", "cuánto", "cuanto", "vale"],
        respuesta: "Los precios de nuestros muebles varían según el modelo y material. Te invitamos a visitar nuestro <a href='catalogo.html'>catálogo</a> o a <a href='cotizacion.html'>solicitar una cotización</a> sin compromiso."
    },
    {
        palabras: ["entrega", "envío", "envio", "tiempo", "llegar", "demora"],
        respuesta: "Realizamos entregas en toda la zona metropolitana de Guadalajara. Los tiempos son: productos en stock 3-5 días hábiles, bajo pedido 15-20 días y muebles personalizados 3-4 semanas."
    },
    {
        palabras: ["garantía", "garantia", "defecto", "problema", "falla"],
        respuesta: "Todos nuestros muebles cuentan con garantía de 1 año contra defectos de fabricación. Para hacer válida tu garantía comunícate con nosotros al 33-3333-3333."
    },
    {
        palabras: ["pago", "tarjeta", "crédito", "credito", "débito", "debito", "efectivo", "financiamiento"],
        respuesta: "Aceptamos efectivo, tarjetas de crédito y débito (Visa, MasterCard, AmEx), transferencias bancarias y depósitos. También contamos con planes de 3, 6, 9 y 12 meses sin intereses."
    },
    {
        palabras: ["horario", "hora", "abierto", "abren", "cierran"],
        respuesta: "Nuestros horarios son: Lunes a Viernes 9:00 AM – 7:00 PM, Sábados 9:00 AM – 5:00 PM y Domingos 10:00 AM – 3:00 PM."
    },
    {
        palabras: ["medida", "personalizado", "personalizada", "especial"],
        respuesta: "¡Sí fabricamos muebles a la medida! Contáctanos para agendar una consulta. El proceso incluye diseño personalizado y fabricación en nuestro taller con tiempo de entrega de 3-4 semanas."
    },
    {
        palabras: ["dirección", "direccion", "donde", "dónde", "ubicación", "ubicacion", "tienda"],
        respuesta: "Nos encontramos en Calle Juárez Eje Sur 23, Tlajomulco De Zúñiga, Jalisco. Puedes <a href='https://www.google.com/maps?q=Calle+Juárez+Eje+Sur+23,+Tlajomulco+de+Zúñiga,+Jalisco' target='_blank'>vernos en Google Maps</a>."
    },
    {
        palabras: ["hola", "buenas", "buenos", "saludos", "hi", "hey"],
        respuesta: "¡Hola! Mucho gusto. Estoy aquí para ayudarte con cualquier pregunta sobre nuestros muebles. ¿En qué puedo ayudarte?"
    },
    {
        palabras: ["gracias", "ok", "perfecto", "excelente"],
        respuesta: "¡Con gusto! Si tienes alguna otra pregunta, no dudes en escribirnos. También puedes contactarnos por WhatsApp al 33-3333-3333."
    }
];

const respuestaDefault = "Gracias por tu mensaje. Para una atención más personalizada, llámanos al <strong>33-3333-3333</strong> o escríbenos por <a href='https://wa.me/523333333333' target='_blank'>WhatsApp</a>. ¡Con gusto te ayudamos!";

function obtenerRespuesta(mensaje) {
    const enMinusculas = mensaje.toLowerCase();
    for (let i = 0; i < respuestas.length; i++) {
        for (let j = 0; j < respuestas[i].palabras.length; j++) {
            if (enMinusculas.indexOf(respuestas[i].palabras[j]) !== -1) {
                return respuestas[i].respuesta;
            }
        }
    }
    return respuestaDefault;
}

function agregarMensaje(texto, esUsuario) {
    const cuerpo = document.getElementById("chatBody");
    const parrafo = document.createElement("p");
    parrafo.style.textAlign = esUsuario ? "right" : "left";
    parrafo.style.margin = "8px 0";

    const burbuja = document.createElement("span");
    burbuja.innerHTML = texto;
    burbuja.style.cssText = esUsuario
        ? "background:#3D5A80;color:#fff;padding:10px 14px;border-radius:12px;display:inline-block;max-width:80%;"
        : "background:#e3e9ff;color:#333;padding:10px 14px;border-radius:12px;display:inline-block;max-width:80%;";

    parrafo.appendChild(burbuja);
    cuerpo.appendChild(parrafo);
    cuerpo.scrollTop = cuerpo.scrollHeight;
}

export function iniciarChat() {
    const entrada = document.getElementById("chatInput");
    const boton   = document.getElementById("chatSendBtn");
    if (!entrada || !boton) return;

    function enviarMensaje() {
        const texto = entrada.value.trim();
        if (!texto) return;

        agregarMensaje(texto, true);
        entrada.value = "";

        const respuesta = obtenerRespuesta(texto);
        setTimeout(function () {
            agregarMensaje(respuesta, false);
        }, 600);
    }

    boton.addEventListener("click", enviarMensaje);
    entrada.addEventListener("keydown", function (evento) {
        if (evento.key === "Enter") enviarMensaje();
    });
}

iniciarChat();
