function escaparHtml(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, (caracter) => {
        const caracteresEspeciales = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };

        return caracteresEspeciales[caracter];
    });
}

let usuarioActual = null;
let archivoFotoRepartidor = null;
let distribuidorasDisponibles = [];
let solicitudesPropias = [];
let distribuidoraSeleccionada = null;

const etiquetasEstadoSolicitud = {
    pendiente: { clase: 'pendiente', texto: 'Pendiente' },
    activo: { clase: 'activo', texto: 'Aceptado' },
    rechazado: { clase: 'rechazada', texto: 'Rechazado' },
    suspendido: { clase: 'suspendida', texto: 'Suspendido' }
};

function renderizarDistribuidoras(filtro) {
    const lista = document.getElementById('lista-distribuidoras');
    const estadoVacio = document.getElementById('estado-buscar');
    const textoFiltro = (filtro || '').trim().toLowerCase();

    const idsConSolicitud = new Set(solicitudesPropias.map((solicitud) => solicitud.distribuidora_id));

    const filtradas = distribuidorasDisponibles.filter((distribuidora) => {
        const contenido = `${distribuidora.nombre} ${distribuidora.ciudad || ''}`.toLowerCase();
        return contenido.includes(textoFiltro);
    });

    lista.innerHTML = '';

    if (filtradas.length === 0) {
        estadoVacio.textContent = 'No encontramos distribuidoras con ese nombre o ciudad.';
        estadoVacio.classList.remove('oculto');
        return;
    }

    estadoVacio.classList.add('oculto');

    filtradas.forEach((distribuidora) => {
        const yaSolicitado = idsConSolicitud.has(distribuidora.id);

        const tarjeta = document.createElement('article');
        tarjeta.className = 'tarjeta-producto-panel';

        tarjeta.innerHTML = `
            <div class="tarjeta-producto-panel-superior">
                <h3>${escaparHtml(distribuidora.nombre)}</h3>
            </div>
            <p class="tarjeta-producto-panel-descripcion">
                ${escaparHtml([distribuidora.ciudad, distribuidora.provincia].filter(Boolean).join(', ') || 'Sin ubicación cargada')}
            </p>
            <div class="tarjeta-producto-panel-acciones">
                <button type="button" class="btn ${yaSolicitado ? 'btn-secundario' : 'btn-principal'} btn-chico"
                    data-solicitar="${distribuidora.id}" ${yaSolicitado ? 'disabled' : ''}>
                    ${yaSolicitado ? 'Ya la solicitaste' : 'Solicitar unirme'}
                </button>
            </div>
        `;

        lista.appendChild(tarjeta);
    });
}

async function cargarDistribuidoras() {
    const { data, error } = await supabaseCliente
        .from('distribuidoras')
        .select('id, nombre, ciudad, provincia')
        .eq('estado', 'activa')
        .order('nombre');

    if (error) {
        const estadoVacio = document.getElementById('estado-buscar');
        estadoVacio.textContent = 'No pudimos cargar las distribuidoras. Recargá la página.';
        estadoVacio.classList.remove('oculto');
        return;
    }

    distribuidorasDisponibles = data || [];
    renderizarDistribuidoras(document.getElementById('buscador-distribuidoras').value);
}

function renderizarSolicitudes() {
    const lista = document.getElementById('lista-solicitudes');
    const estadoVacio = document.getElementById('estado-solicitudes');

    lista.innerHTML = '';

    if (solicitudesPropias.length === 0) {
        estadoVacio.textContent = 'Todavía no enviaste ninguna solicitud. Buscá una distribuidora y solicitá unirte.';
        estadoVacio.classList.remove('oculto');
        return;
    }

    estadoVacio.classList.add('oculto');

    solicitudesPropias.forEach((solicitud) => {
        const etiqueta = etiquetasEstadoSolicitud[solicitud.estado] || { clase: 'inactivo', texto: solicitud.estado };
        const distribuidora = solicitud.distribuidoras || {};

        const tarjeta = document.createElement('article');
        tarjeta.className = 'tarjeta-producto-panel';

        tarjeta.innerHTML = `
            <div class="tarjeta-producto-panel-superior">
                <h3>${escaparHtml(distribuidora.nombre || 'Distribuidora')}</h3>
                <span class="etiqueta-estado-producto ${etiqueta.clase}">${etiqueta.texto}</span>
            </div>
            <p class="tarjeta-producto-panel-descripcion">
                ${escaparHtml(solicitud.mensaje_solicitud || 'Sin mensaje adjunto.')}
            </p>
        `;

        lista.appendChild(tarjeta);
    });
}

async function cargarSolicitudes() {
    const { data, error } = await supabaseCliente
        .from('miembros_distribuidoras')
        .select('id, distribuidora_id, estado, mensaje_solicitud, distribuidoras (nombre)')
        .eq('usuario_id', usuarioActual.id)
        .eq('rol', 'repartidor')
        .order('creado_en', { ascending: false });

    if (error) {
        const estadoVacio = document.getElementById('estado-solicitudes');
        estadoVacio.textContent = 'No pudimos cargar tus solicitudes. Recargá la página.';
        estadoVacio.classList.remove('oculto');
        return;
    }

    solicitudesPropias = data || [];
    renderizarSolicitudes();
}

const modalSolicitud = document.getElementById('modal-solicitud');
const formularioSolicitud = document.getElementById('formulario-solicitud');
const btnEnviarSolicitud = document.getElementById('btn-enviar-solicitud');

document.getElementById('lista-distribuidoras').addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-solicitar]');

    if (!boton || boton.disabled) {
        return;
    }

    distribuidoraSeleccionada = distribuidorasDisponibles.find(
        (distribuidora) => distribuidora.id === boton.dataset.solicitar
    );

    if (!distribuidoraSeleccionada) {
        return;
    }

    document.getElementById('titulo-modal-solicitud').textContent =
        `Solicitar unirme a ${distribuidoraSeleccionada.nombre}`;
    document.getElementById('texto-modal-solicitud').textContent =
        'Tu solicitud queda pendiente hasta que el vendedor la revise.';
    formularioSolicitud.reset();
    modalSolicitud.classList.remove('oculto');
});

document.getElementById('boton-cerrar-modal-solicitud').addEventListener('click', () => {
    modalSolicitud.classList.add('oculto');
});

modalSolicitud.addEventListener('click', (evento) => {
    if (evento.target === modalSolicitud) {
        modalSolicitud.classList.add('oculto');
    }
});

formularioSolicitud.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    if (!distribuidoraSeleccionada) {
        return;
    }

    btnEnviarSolicitud.disabled = true;
    btnEnviarSolicitud.textContent = 'Enviando...';

    const { error } = await supabaseCliente
        .from('miembros_distribuidoras')
        .insert({
            distribuidora_id: distribuidoraSeleccionada.id,
            usuario_id: usuarioActual.id,
            rol: 'repartidor',
            estado: 'pendiente',
            mensaje_solicitud: document.getElementById('mensaje-solicitud').value.trim() || null
        });

    btnEnviarSolicitud.disabled = false;
    btnEnviarSolicitud.textContent = 'Enviar solicitud';

    if (error) {
        alert('No pudimos enviar la solicitud. Puede que ya le hayas enviado una antes a esta distribuidora.');
        return;
    }

    modalSolicitud.classList.add('oculto');

    await cargarSolicitudes();
    renderizarDistribuidoras(document.getElementById('buscador-distribuidoras').value);
});

document.getElementById('buscador-distribuidoras').addEventListener('input', (evento) => {
    renderizarDistribuidoras(evento.target.value);
});

const pestanas = document.querySelectorAll('.panel-pestana');
const secciones = {
    buscar: document.getElementById('seccion-buscar'),
    solicitudes: document.getElementById('seccion-solicitudes'),
    perfil: document.getElementById('seccion-perfil')
};

pestanas.forEach((pestana) => {
    pestana.addEventListener('click', () => {
        pestanas.forEach((otra) => {
            otra.classList.remove('activa');
            otra.setAttribute('aria-selected', 'false');
        });

        pestana.classList.add('activa');
        pestana.setAttribute('aria-selected', 'true');

        Object.entries(secciones).forEach(([nombre, seccion]) => {
            seccion.classList.toggle('oculto', nombre !== pestana.dataset.pestana);
        });
    });
});

async function inicializarPanel() {
    const { data: { session } } = await supabaseCliente.auth.getSession();

    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    const { data: perfil } = await supabaseCliente
        .from('usuarios')
        .select('rol')
        .eq('id', session.user.id)
        .single();

    if (perfil?.rol !== 'repartidor') {
        window.location.href = 'productos.html';
        return;
    }

    usuarioActual = session.user;

    document.getElementById('panel-cargando').classList.add('oculto');
    document.getElementById('panel-header').classList.remove('oculto');
    document.getElementById('panel-main').classList.remove('oculto');

    await cargarSolicitudes();
    cargarDistribuidoras();
    precargarPerfilRepartidor();
}

async function precargarPerfilRepartidor() {
    const { data: perfil, error } = await supabaseCliente
        .from('usuarios')
        .select('dni, foto_url, marca_vehiculo, modelo_vehiculo, patente_vehiculo, numero_licencia')
        .eq('id', usuarioActual.id)
        .single();

    if (error || !perfil) {
        return;
    }

    document.getElementById('dni-repartidor-perfil').value = perfil.dni || '';
    document.getElementById('marca-vehiculo').value = perfil.marca_vehiculo || '';
    document.getElementById('modelo-vehiculo').value = perfil.modelo_vehiculo || '';
    document.getElementById('patente-vehiculo').value = perfil.patente_vehiculo || '';
    document.getElementById('numero-licencia').value = perfil.numero_licencia || '';

    if (perfil.foto_url) {
        const vistaFoto = document.getElementById('panel-foto-vista');
        vistaFoto.innerHTML = `<img src="${perfil.foto_url}" alt="Tu foto">`;
        vistaFoto.classList.add('tiene-foto');
    }
}

document.getElementById('foto-repartidor').addEventListener('change', (evento) => {
    const archivo = evento.target.files[0];

    if (!archivo) {
        return;
    }

    archivoFotoRepartidor = archivo;

    const vistaFoto = document.getElementById('panel-foto-vista');
    vistaFoto.innerHTML = `<img src="${URL.createObjectURL(archivo)}" alt="Tu foto">`;
    vistaFoto.classList.add('tiene-foto');
});

document.getElementById('formulario-perfil-repartidor').addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const btnGuardar = document.getElementById('btn-guardar-perfil-repartidor');
    const mensaje = document.getElementById('mensaje-perfil-repartidor');

    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';

    try {
        const datosPerfil = {
            dni: document.getElementById('dni-repartidor-perfil').value.trim(),
            marca_vehiculo: document.getElementById('marca-vehiculo').value.trim(),
            modelo_vehiculo: document.getElementById('modelo-vehiculo').value.trim(),
            patente_vehiculo: document.getElementById('patente-vehiculo').value.trim(),
            numero_licencia: document.getElementById('numero-licencia').value.trim()
        };

        if (archivoFotoRepartidor) {
            const rutaArchivo = `${usuarioActual.id}/${crypto.randomUUID()}-${archivoFotoRepartidor.name}`;

            const { error: errorSubida } = await supabaseCliente.storage
                .from('repartidores-fotos')
                .upload(rutaArchivo, archivoFotoRepartidor);

            if (errorSubida) {
                throw new Error('No pudimos subir la foto. Probá con otra imagen.');
            }

            const { data } = supabaseCliente.storage
                .from('repartidores-fotos')
                .getPublicUrl(rutaArchivo);

            datosPerfil.foto_url = data.publicUrl;
        }

        const { error } = await supabaseCliente
            .from('usuarios')
            .update(datosPerfil)
            .eq('id', usuarioActual.id);

        if (error) {
            mensaje.textContent = 'No pudimos guardar los cambios. Intentá de nuevo.';
            mensaje.className = 'mensaje-estado error';
            return;
        }

        archivoFotoRepartidor = null;
        mensaje.textContent = 'Cambios guardados correctamente.';
        mensaje.className = 'mensaje-estado exito';
    } catch (errorSubida) {
        mensaje.textContent = errorSubida.message || 'Ocurrió un error. Intentá de nuevo.';
        mensaje.className = 'mensaje-estado error';
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar cambios';
    }
});

inicializarPanel();

document.getElementById('boton-cerrar-sesion').addEventListener('click', async () => {
    await supabaseCliente.auth.signOut();
    window.location.href = 'login.html';
});