let mapaNegocio = null;
let marcadorNegocio = null;
let resultadosNegocio = [];
let temporizadorNegocio = null;
let ubicacionNegocioInicial = null;

function textoUbicacionNegocio(resultado) {
    const p = resultado.properties || {};
    return [
        p.name,
        [p.street, p.housenumber].filter(Boolean).join(' '),
        p.city || p.town || p.village || p.county,
        p.state
    ].filter(Boolean).filter((v, i, l) => l.indexOf(v) === i).join(', ');
}

function ponerMarcadorNegocio(latitud, longitud) {
    if (!mapaNegocio) {
        return;
    }

    if (marcadorNegocio) {
        marcadorNegocio.setLatLng([latitud, longitud]);
    } else {
        marcadorNegocio = L.marker([latitud, longitud]).addTo(mapaNegocio);
    }

    mapaNegocio.setView([latitud, longitud], 17);
}

function fijarUbicacionNegocio(latitud, longitud) {
    document.getElementById('latitud-negocio').value = latitud;
    document.getElementById('longitud-negocio').value = longitud;
    ponerMarcadorNegocio(latitud, longitud);
}

function rellenarDireccionNegocio(resultado) {
    const p = resultado.properties || {};
    const [longitud, latitud] = resultado.geometry?.coordinates || [];

    document.getElementById('calle-perfil').value = p.street || p.name || '';
    document.getElementById('numero-perfil').value = p.housenumber || '';
    document.getElementById('ciudad-perfil').value = p.city || p.town || p.village || p.county || '';
    document.getElementById('provincia-perfil').value = p.state || 'Catamarca';
    document.getElementById('buscador-negocio').value = textoUbicacionNegocio(resultado);
    document.getElementById('sugerencias-negocio').hidden = true;

    fijarUbicacionNegocio(latitud, longitud);
}

async function buscarDireccionNegocio(texto) {
    const caja = document.getElementById('sugerencias-negocio');

    if (texto.length < 3) {
        caja.hidden = true;
        return;
    }

    try {
        const parametros = new URLSearchParams({
            q: `${texto}, Catamarca, Argentina`,
            limit: '5',
            lat: '-28.4696',
            lon: '-65.7795'
        });
        const respuesta = await fetch(`https://photon.komoot.io/api/?${parametros}`);
        resultadosNegocio = (await respuesta.json()).features || [];
    } catch (error) {
        resultadosNegocio = [];
    }

    caja.innerHTML = resultadosNegocio.length === 0
        ? '<p class="sin-sugerencias-negocio">Sin resultados. Marcá el punto en el mapa.</p>'
        : resultadosNegocio.map((r, i) =>
            `<button type="button" class="opcion-sugerencia-negocio" data-i="${i}">${escaparHtml(textoUbicacionNegocio(r))}</button>`
        ).join('');
    caja.hidden = false;
}

async function usarMiUbicacionNegocio() {
    const estado = document.getElementById('estado-ubicacion-negocio');

    if (!navigator.geolocation) {
        estado.textContent = 'Tu navegador no permite obtener la ubicación.';
        return;
    }

    estado.textContent = 'Buscando tu ubicación...';

    navigator.geolocation.getCurrentPosition(async (posicion) => {
        const { latitude, longitude } = posicion.coords;
        fijarUbicacionNegocio(latitude, longitude);
        estado.textContent = 'Ubicación marcada. Revisá calle y número.';

        try {
            const respuesta = await fetch(`https://photon.komoot.io/reverse?lat=${latitude}&lon=${longitude}&limit=1`);
            const resultado = (await respuesta.json()).features?.[0];

            if (resultado) {
                rellenarDireccionNegocio({ ...resultado, geometry: { coordinates: [longitude, latitude] } });
            }
        } catch (error) {
        }
    }, () => {
        estado.textContent = 'No pudimos obtener tu ubicación. Marcá el punto en el mapa.';
    }, { enableHighAccuracy: true, timeout: 10000 });
}

function cargarUbicacionNegocio(distribuidora) {
    ubicacionNegocioInicial = distribuidora.latitud != null && distribuidora.longitud != null
        ? [Number(distribuidora.latitud), Number(distribuidora.longitud)]
        : null;

    document.getElementById('latitud-negocio').value = distribuidora.latitud ?? '';
    document.getElementById('longitud-negocio').value = distribuidora.longitud ?? '';
}

function mostrarMapaNegocio() {
    if (!window.L) {
        return;
    }

    if (!mapaNegocio) {
        mapaNegocio = L.map('mapa-negocio').setView(ubicacionNegocioInicial || [-28.4696, -65.7795], ubicacionNegocioInicial ? 17 : 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap'
        }).addTo(mapaNegocio);

        mapaNegocio.on('click', (evento) => fijarUbicacionNegocio(evento.latlng.lat, evento.latlng.lng));

        if (ubicacionNegocioInicial) {
            ponerMarcadorNegocio(...ubicacionNegocioInicial);
        }
    }

    setTimeout(() => mapaNegocio.invalidateSize(), 50);
}

function leerUbicacionNegocio() {
    const latitud = document.getElementById('latitud-negocio').value;
    const longitud = document.getElementById('longitud-negocio').value;

    return {
        latitud: latitud === '' ? null : Number(latitud),
        longitud: longitud === '' ? null : Number(longitud)
    };
}

document.getElementById('buscador-negocio').addEventListener('input', (evento) => {
    clearTimeout(temporizadorNegocio);
    const texto = evento.target.value.trim();
    temporizadorNegocio = setTimeout(() => buscarDireccionNegocio(texto), 500);
});

document.getElementById('sugerencias-negocio').addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-i]');

    if (boton) {
        rellenarDireccionNegocio(resultadosNegocio[Number(boton.dataset.i)]);
    }
});

document.getElementById('btn-mi-ubicacion-negocio').addEventListener('click', usarMiUbicacionNegocio);