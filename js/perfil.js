let usuarioPerfil = null;

function mostrarMensajePerfil(id, texto, tipo) {
    const el = document.getElementById(id);
    el.textContent = texto;
    el.className = `mensaje-perfil ${tipo}`;
}

async function cargarPerfil() {
    const { data: { session } } = await supabaseCliente.auth.getSession();

    if (!session) {
        window.location.href = 'login.html?siguiente=perfil.html';
        return;
    }

    usuarioPerfil = session.user;
    document.getElementById('correo-perfil').value = session.user.email || '';

    const { data } = await supabaseCliente
        .from('usuarios')
        .select('nombre, apellido, telefono')
        .eq('id', session.user.id)
        .single();

    if (data) {
        document.getElementById('nombre-perfil').value = data.nombre || '';
        document.getElementById('apellido-perfil').value = data.apellido || '';
        document.getElementById('telefono-perfil').value = data.telefono || '';
    }
}

document.getElementById('formulario-datos').addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const nombre = document.getElementById('nombre-perfil').value.trim();
    const apellido = document.getElementById('apellido-perfil').value.trim();
    const telefono = document.getElementById('telefono-perfil').value.trim();

    if (!nombre || !apellido || !telefono) {
        mostrarMensajePerfil('mensaje-datos', 'Completá nombre, apellido y teléfono.', 'error');
        return;
    }

    const boton = document.getElementById('btn-guardar-datos');
    boton.disabled = true;

    const { error } = await supabaseCliente
        .from('usuarios')
        .update({ nombre, apellido, telefono })
        .eq('id', usuarioPerfil.id);

    boton.disabled = false;

    if (error) {
        mostrarMensajePerfil('mensaje-datos', 'No pudimos guardar los cambios. Intentá de nuevo.', 'error');
        return;
    }

    mostrarMensajePerfil('mensaje-datos', 'Cambios guardados correctamente.', 'exito');
});

document.getElementById('boton-cerrar-sesion').addEventListener('click', async () => {
    await supabaseCliente.auth.signOut();
    localStorage.removeItem('aquatrack_carrito');
    window.location.href = 'login.html';
});

// ===== Pestañas =====
document.querySelectorAll('.pestana-perfil').forEach((boton) => {
    boton.addEventListener('click', () => {
        const nombre = boton.dataset.pestanaPerfil;

        document.querySelectorAll('.pestana-perfil').forEach((b) => {
            b.classList.toggle('activa', b === boton);
        });
        document.getElementById('panel-datos').hidden = nombre !== 'datos';
        document.getElementById('panel-direcciones').hidden = nombre !== 'direcciones';

        if (nombre === 'direcciones') {
            iniciarMapaPerfil();
            setTimeout(() => mapaPerfil?.invalidateSize(), 150);
        }
    });
});

// ===== Direcciones guardadas =====
const MAX_DIRECCIONES = 5;
let mapaPerfil = null;
let marcadorPerfil = null;
let temporizadorPerfil = null;
let resultadosPerfil = [];

function escaparHtmlPerfil(texto) {
    const div = document.createElement('div');
    div.textContent = texto ?? '';
    return div.innerHTML;
}

function iniciarMapaPerfil() {
    if (mapaPerfil || !window.L) {
        return;
    }

    mapaPerfil = L.map('mapa-perfil').setView([-28.4696, -65.7795], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(mapaPerfil);

    mapaPerfil.on('click', (evento) => {
        ponerMarcadorPerfil(evento.latlng.lat, evento.latlng.lng);
    });
}

function ponerMarcadorPerfil(latitud, longitud) {
    if (marcadorPerfil) {
        marcadorPerfil.setLatLng([latitud, longitud]);
    } else {
        marcadorPerfil = L.marker([latitud, longitud]).addTo(mapaPerfil);
    }

    mapaPerfil.setView([latitud, longitud], 17);
    document.getElementById('latitud-perfil').value = latitud;
    document.getElementById('longitud-perfil').value = longitud;
}

function textoResultadoPerfil(resultado) {
    const p = resultado.properties || {};
    return [
        p.name,
        [p.street, p.housenumber].filter(Boolean).join(' '),
        p.city || p.town || p.village || p.county,
        p.state
    ].filter(Boolean).join(', ');
}

function mostrarSugerenciasPerfil() {
    const caja = document.getElementById('sugerencias-perfil');

    if (resultadosPerfil.length === 0) {
        caja.innerHTML = '<p class="sin-sugerencias-perfil">Sin resultados. Marcá el punto en el mapa.</p>';
        caja.hidden = false;
        return;
    }

    caja.innerHTML = resultadosPerfil.map((r, i) =>
        `<button type="button" class="opcion-sugerencia-perfil" data-i="${i}">${escaparHtmlPerfil(textoResultadoPerfil(r))}</button>`
    ).join('');
    caja.hidden = false;
}

function elegirSugerenciaPerfil(resultado) {
    const p = resultado.properties || {};
    const [longitud, latitud] = resultado.geometry?.coordinates || [];

    document.getElementById('buscador-perfil').value = textoResultadoPerfil(resultado);
    document.getElementById('calle-perfil').value = p.street || p.name || '';
    document.getElementById('numero-perfil').value = p.housenumber || '';
    document.getElementById('ciudad-perfil').value = p.city || p.town || p.village || p.county || '';
    document.getElementById('provincia-perfil').value = p.state || 'Catamarca';
    document.getElementById('sugerencias-perfil').hidden = true;

    ponerMarcadorPerfil(latitud, longitud);
}

document.getElementById('buscador-perfil').addEventListener('input', (evento) => {
    clearTimeout(temporizadorPerfil);
    const texto = evento.target.value.trim();
    const caja = document.getElementById('sugerencias-perfil');

    if (texto.length < 3) {
        caja.hidden = true;
        return;
    }

    temporizadorPerfil = setTimeout(async () => {
        try {
            const respuesta = await fetch(
                `https://photon.komoot.io/api/?q=${encodeURIComponent(texto)}&limit=5&lat=-28.4696&lon=-65.7795`
            );
            const datos = await respuesta.json();
            resultadosPerfil = datos.features || [];
        } catch {
            resultadosPerfil = [];
        }
        mostrarSugerenciasPerfil();
    }, 400);
});

document.getElementById('sugerencias-perfil').addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-i]');

    if (boton) {
        elegirSugerenciaPerfil(resultadosPerfil[Number(boton.dataset.i)]);
    }
});

let direccionesPerfil = [];
let direccionEditandoId = null;

function salirModoEdicion() {
    direccionEditandoId = null;
    document.getElementById('titulo-formulario-direccion').textContent = 'Agregar dirección';
    document.getElementById('btn-guardar-direccion').textContent = 'Guardar dirección';
    document.getElementById('btn-cancelar-edicion').classList.add('oculto');
}

document.getElementById('lista-direcciones-perfil').addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-editar-direccion]');

    if (!boton) {
        return;
    }

    const d = direccionesPerfil.find((item) => item.id === boton.dataset.editarDireccion);

    if (!d) {
        return;
    }

    direccionEditandoId = d.id;
    document.getElementById('alias-direccion').value = d.alias || '';
    document.getElementById('calle-perfil').value = d.calle || '';
    document.getElementById('numero-perfil').value = d.numero || '';
    document.getElementById('ciudad-perfil').value = d.ciudad || '';
    document.getElementById('provincia-perfil').value = d.provincia || 'Catamarca';
    document.getElementById('referencia-perfil').value = d.referencia || '';

    if (d.latitud && d.longitud) {
        ponerMarcadorPerfil(Number(d.latitud), Number(d.longitud));
    }

    document.getElementById('titulo-formulario-direccion').textContent = 'Editar dirección';
    document.getElementById('btn-guardar-direccion').textContent = 'Guardar cambios';
    document.getElementById('btn-cancelar-edicion').classList.remove('oculto');
    document.getElementById('formulario-direccion').scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('btn-cancelar-edicion').addEventListener('click', () => {
    salirModoEdicion();
    document.getElementById('formulario-direccion').reset();
    document.getElementById('provincia-perfil').value = 'Catamarca';
    document.getElementById('latitud-perfil').value = '';
    document.getElementById('longitud-perfil').value = '';

    if (marcadorPerfil) {
        marcadorPerfil.remove();
        marcadorPerfil = null;
    }
});

async function cargarDireccionesPerfil() {
    const { data, error } = await supabaseCliente
        .from('direcciones_guardadas')
        .select('id, alias, calle, numero, ciudad, provincia, referencia, latitud, longitud')
        .order('creado_en', { ascending: true });

    const lista = document.getElementById('lista-direcciones-perfil');

    if (error) {
        lista.innerHTML = '';
        mostrarMensajePerfil('mensaje-lista-direcciones', 'No pudimos cargar tus direcciones.', 'error');
        return [];
    }

    if (!data.length) {
        lista.innerHTML = '<p class="vacio-direcciones-perfil">Todavía no guardaste ninguna dirección.</p>';
        return data;
    }

    direccionesPerfil = data;

    lista.innerHTML = data.map((d) => `
        <div class="item-direccion-perfil">
            <div>
                <strong>${escaparHtmlPerfil(d.alias)}</strong>
                <span>${escaparHtmlPerfil([d.calle, d.numero].filter(Boolean).join(' '))}, ${escaparHtmlPerfil(d.ciudad)}</span>
            </div>
            <div class="acciones-direccion-perfil">
                <button type="button" class="btn btn-secundario" data-editar-direccion="${d.id}">Editar</button>
                <button type="button" class="btn btn-secundario btn-peligro" data-borrar-direccion="${d.id}">Eliminar</button>
            </div>
        </div>
    `).join('');

    return data;
}

document.getElementById('lista-direcciones-perfil').addEventListener('click', async (evento) => {
    const boton = evento.target.closest('[data-borrar-direccion]');

    if (!boton || !confirm('¿Eliminar esta dirección?')) {
        return;
    }

    const { error } = await supabaseCliente
        .from('direcciones_guardadas')
        .delete()
        .eq('id', boton.dataset.borrarDireccion);

    if (error) {
        mostrarMensajePerfil('mensaje-lista-direcciones', 'No pudimos eliminarla.', 'error');
        return;
    }

    mostrarMensajePerfil('mensaje-lista-direcciones', '', '');
    cargarDireccionesPerfil();
});

document.getElementById('formulario-direccion').addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const alias = document.getElementById('alias-direccion').value.trim();
    const calle = document.getElementById('calle-perfil').value.trim();
    const ciudad = document.getElementById('ciudad-perfil').value.trim();
    const provincia = document.getElementById('provincia-perfil').value.trim();
    const latitud = document.getElementById('latitud-perfil').value;
    const longitud = document.getElementById('longitud-perfil').value;

    if (!alias || !calle || !ciudad || !provincia) {
        mostrarMensajePerfil('mensaje-direccion', 'Completá nombre, calle, ciudad y provincia.', 'error');
        return;
    }

    if (!latitud || !longitud) {
        mostrarMensajePerfil('mensaje-direccion', 'Buscá la dirección o marcá el punto en el mapa.', 'error');
        return;
    }

    const actuales = await cargarDireccionesPerfil();

    if (!direccionEditandoId && actuales.length >= MAX_DIRECCIONES) {
        mostrarMensajePerfil('mensaje-direccion', `Podés guardar hasta ${MAX_DIRECCIONES} direcciones.`, 'error');
        return;
    }

    const boton = document.getElementById('btn-guardar-direccion');
    boton.disabled = true;

    const datosDireccion = {
        alias,
        calle,
        numero: document.getElementById('numero-perfil').value.trim(),
        ciudad,
        provincia,
        referencia: document.getElementById('referencia-perfil').value.trim(),
        latitud: Number(latitud),
        longitud: Number(longitud)
    };

    const tablaDirecciones = supabaseCliente.from('direcciones_guardadas');
    const { error } = direccionEditandoId
        ? await tablaDirecciones.update(datosDireccion).eq('id', direccionEditandoId)
        : await tablaDirecciones.insert(datosDireccion);

    boton.disabled = false;

    if (error) {
        mostrarMensajePerfil('mensaje-direccion', 'No pudimos guardar la dirección.', 'error');
        return;
    }

    document.getElementById('formulario-direccion').reset();
    document.getElementById('provincia-perfil').value = 'Catamarca';
    document.getElementById('latitud-perfil').value = '';
    document.getElementById('longitud-perfil').value = '';

    if (marcadorPerfil) {
        marcadorPerfil.remove();
        marcadorPerfil = null;
    }

    const mensajeOk = direccionEditandoId ? 'Dirección actualizada.' : 'Dirección guardada.';
    salirModoEdicion();
    mostrarMensajePerfil('mensaje-direccion', mensajeOk, 'exito');
    cargarDireccionesPerfil();
});

cargarPerfil();
cargarDireccionesPerfil();