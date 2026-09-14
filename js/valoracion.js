/**
 * Valoración de la página con estrellas.
 *
 * Estaba duplicado literalmente en las siete páginas. La clave de
 * almacenamiento se deriva de window.location.pathname, así que el mismo
 * módulo sirve para todas sin cambiar nada de la lógica: cada página
 * acumula su propio promedio.
 *
 * El promedio se guarda en localStorage y el voto ya emitido en
 * sessionStorage, que es lo que evita votar dos veces en la misma sesión.
 */

export function iniciarValoracion() {
    const clavePagina = 'rating_' + (window.location.pathname.split('/').pop().replace('.html', '') || 'index');
    const claveVotada = clavePagina + '_rated';

    const estrellas = document.querySelectorAll('.star');
    const infoEl    = document.getElementById('ratingInfo');
    const graciasEl = document.getElementById('ratingThanks');

    if (!estrellas.length || !infoEl || !graciasEl) return;

    function leerDatos() {
        try {
            return JSON.parse(localStorage.getItem(clavePagina)) || { total: 0, count: 0 };
        } catch (error) {
            return { total: 0, count: 0 };
        }
    }

    function mostrarInfo() {
        const datos = leerDatos();
        infoEl.textContent = datos.count === 0
            ? 'Sé el primero en valorar esta página'
            : 'Promedio: ' + (datos.total / datos.count).toFixed(1) + ' / 5 (' + datos.count + (datos.count === 1 ? ' valoración' : ' valoraciones') + ')';
    }

    function resaltarEstrellas(valor) {
        estrellas.forEach(function (estrella) {
            const encendida = parseInt(estrella.dataset.val) <= valor;
            estrella.classList.toggle('active', encendida);
            estrella.style.color = encendida ? '#C9A84C' : '#ccc';
        });
    }

    function bloquearEstrellas() {
        estrellas.forEach(function (estrella) {
            estrella.style.cursor = 'default';
            estrella.style.pointerEvents = 'none';
        });
    }

    mostrarInfo();

    const yaVotada = sessionStorage.getItem(claveVotada);
    if (yaVotada) {
        resaltarEstrellas(parseInt(yaVotada));
        graciasEl.style.display = 'block';
        bloquearEstrellas();
    }

    estrellas.forEach(function (estrella) {
        estrella.addEventListener('mouseenter', function () {
            if (!sessionStorage.getItem(claveVotada)) resaltarEstrellas(parseInt(this.dataset.val));
        });

        estrella.addEventListener('mouseleave', function () {
            if (!sessionStorage.getItem(claveVotada)) resaltarEstrellas(0);
        });

        estrella.addEventListener('click', function () {
            if (sessionStorage.getItem(claveVotada)) return;

            const valor = parseInt(this.dataset.val);
            const datos = leerDatos();
            datos.total += valor;
            datos.count += 1;

            localStorage.setItem(clavePagina, JSON.stringify(datos));
            sessionStorage.setItem(claveVotada, valor);

            resaltarEstrellas(valor);
            graciasEl.style.display = 'block';
            mostrarInfo();
            bloquearEstrellas();
        });
    });
}

iniciarValoracion();
