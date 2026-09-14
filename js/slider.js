/**
 * Slider de la portada.
 *
 * Solo lo usa index.html. Se extrae tal cual estaba: avance automático cada
 * cinco segundos, pausa al pasar el ratón, flechas y puntos de navegación
 * generados a partir del número de diapositivas.
 */

export function iniciarSlider() {
    const pista           = document.getElementById('sliderTrack');
    const slider          = document.getElementById('heroSlider');
    const contenedorDots  = document.getElementById('sliderDots');
    const botonAnterior   = document.getElementById('sliderPrev');
    const botonSiguiente  = document.getElementById('sliderNext');

    if (!pista || !slider || !contenedorDots) return;

    const diapositivas = pista.querySelectorAll('.slide');
    const total = diapositivas.length;
    if (!total) return;

    let actual = 0;
    let temporizador;

    diapositivas.forEach(function (_, indice) {
        const punto = document.createElement('button');
        punto.className = 'slider-dot' + (indice === 0 ? ' active' : '');
        punto.setAttribute('aria-label', 'Ir a imagen ' + (indice + 1));
        punto.addEventListener('click', function () {
            irA(indice);
            reiniciarTemporizador();
        });
        contenedorDots.appendChild(punto);
    });

    function actualizarPuntos() {
        contenedorDots.querySelectorAll('.slider-dot').forEach(function (punto, indice) {
            punto.classList.toggle('active', indice === actual);
        });
    }

    function irA(indice) {
        actual = (indice + total) % total;
        pista.style.transform = 'translateX(-' + (actual * 100) + '%)';
        actualizarPuntos();
    }

    function reiniciarTemporizador() {
        clearInterval(temporizador);
        temporizador = setInterval(function () { irA(actual + 1); }, 5000);
    }

    if (botonAnterior) {
        botonAnterior.addEventListener('click', function () { irA(actual - 1); reiniciarTemporizador(); });
    }
    if (botonSiguiente) {
        botonSiguiente.addEventListener('click', function () { irA(actual + 1); reiniciarTemporizador(); });
    }

    slider.addEventListener('mouseenter', function () { clearInterval(temporizador); });
    slider.addEventListener('mouseleave', reiniciarTemporizador);

    reiniciarTemporizador();
}

iniciarSlider();
