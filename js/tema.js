const CLAVE_TEMA = 'aquatrack_tema';

const iconoSol = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="4.2" stroke="currentColor" stroke-width="1.6"/><path d="M12 2.5v2.4M12 19.1v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
const iconoLuna = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`;

function temaActual() {
    return document.documentElement.getAttribute('data-tema') === 'oscuro' ? 'oscuro' : 'claro';
}

function actualizarBotonTema(boton) {
    const esOscuro = temaActual() === 'oscuro';
    boton.innerHTML = esOscuro ? iconoSol : iconoLuna;
    boton.setAttribute('aria-label', esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
}

function aplicarTema(tema) {
    if (tema === 'oscuro') {
        document.documentElement.setAttribute('data-tema', 'oscuro');
    } else {
        document.documentElement.removeAttribute('data-tema');
    }

    localStorage.setItem(CLAVE_TEMA, tema);

    document.querySelectorAll('.btn-tema').forEach((boton) => {
        actualizarBotonTema(boton);
    });
}

document.querySelectorAll('.btn-tema').forEach((boton) => {
    actualizarBotonTema(boton);

    boton.addEventListener('click', () => {
        aplicarTema(temaActual() === 'oscuro' ? 'claro' : 'oscuro');
    });
});

function inferirTipoAviso(texto) {
    if (/fue cancelado|correctamente|guardad|actualizad|enviad|copiad/i.test(texto)) {
        return 'exito';
    }

    if (/^No hay |Subí una imagen|ya salió|ya no están|Algunos/i.test(texto)) {
        return 'aviso';
    }

    return 'error';
}

function mostrarAviso(texto, tipo) {
    const mensaje = String(texto ?? '');
    const clase = tipo || inferirTipoAviso(mensaje);

    let contenedor = document.getElementById('contenedor-avisos');

    if (!contenedor) {
        contenedor = document.createElement('div');
        contenedor.id = 'contenedor-avisos';
        contenedor.className = 'contenedor-avisos';
        contenedor.setAttribute('aria-live', 'polite');
        document.body.appendChild(contenedor);
    }

    while (contenedor.children.length >= 3) {
        contenedor.firstElementChild.remove();
    }

    const aviso = document.createElement('div');
    aviso.className = `aviso-flotante aviso-${clase}`;
    aviso.setAttribute('role', clase === 'error' ? 'alert' : 'status');
    aviso.textContent = mensaje;

    const cerrar = () => {
        aviso.classList.add('aviso-saliendo');
        setTimeout(() => aviso.remove(), 250);
    };

    aviso.addEventListener('click', cerrar);
    contenedor.appendChild(aviso);
    setTimeout(cerrar, 5000);
}

window.alert = (texto) => mostrarAviso(texto);

function inferirTipoAviso(texto) {
    if (/fue cancelado|correctamente|guardad|actualizad|enviad|copiad/i.test(texto)) {
        return 'exito';
    }

    if (/^No hay |Subí una imagen|ya salió|ya no están|Algunos/i.test(texto)) {
        return 'aviso';
    }

    return 'error';
}

function mostrarAviso(texto, tipo) {
    const mensaje = String(texto ?? '');
    const clase = tipo || inferirTipoAviso(mensaje);

    let contenedor = document.getElementById('contenedor-avisos');

    if (!contenedor) {
        contenedor = document.createElement('div');
        contenedor.id = 'contenedor-avisos';
        contenedor.className = 'contenedor-avisos';
        contenedor.setAttribute('aria-live', 'polite');
        document.body.appendChild(contenedor);
    }

    while (contenedor.children.length >= 3) {
        contenedor.firstElementChild.remove();
    }

    const aviso = document.createElement('div');
    aviso.className = `aviso-flotante aviso-${clase}`;
    aviso.setAttribute('role', clase === 'error' ? 'alert' : 'status');
    aviso.textContent = mensaje;

    const cerrar = () => {
        aviso.classList.add('aviso-saliendo');
        setTimeout(() => aviso.remove(), 250);
    };

    aviso.addEventListener('click', cerrar);
    contenedor.appendChild(aviso);
    setTimeout(cerrar, 5000);
}

window.alert = (texto) => mostrarAviso(texto);

const scriptCampana = document.createElement('script');
scriptCampana.src = 'js/campana.js';
document.body.appendChild(scriptCampana);