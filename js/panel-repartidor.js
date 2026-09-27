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

    const { data: membresia } = await supabaseCliente
        .from('miembros_distribuidoras')
        .select('distribuidoras (nombre)')
        .eq('usuario_id', usuarioActual.id)
        .eq('rol', 'repartidor')
        .eq('estado', 'activo')
        .single();

    document.getElementById('nombre-distribuidora-repartidor').textContent =
        membresia?.distribuidoras?.nombre || 'Sin distribuidora asignada';

    document.getElementById('panel-cargando').classList.add('oculto');
    document.getElementById('panel-header').classList.remove('oculto');
    document.getElementById('panel-main').classList.remove('oculto');

    precargarPerfilRepartidor();
}

inicializarPanel();

document.getElementById('boton-cerrar-sesion').addEventListener('click', async () => {
    await supabaseCliente.auth.signOut();
    window.location.href = 'login.html';
});