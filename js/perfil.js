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

document.getElementById('formulario-clave').addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const nueva = document.getElementById('clave-nueva').value;
    const repetir = document.getElementById('clave-repetir').value;

    if (nueva.length < 6) {
        mostrarMensajePerfil('mensaje-clave', 'La contraseña debe tener al menos 6 caracteres.', 'error');
        return;
    }

    if (nueva !== repetir) {
        mostrarMensajePerfil('mensaje-clave', 'Las contraseñas no coinciden.', 'error');
        return;
    }

    const boton = document.getElementById('btn-guardar-clave');
    boton.disabled = true;

    const { error } = await supabaseCliente.auth.updateUser({ password: nueva });

    boton.disabled = false;

    if (error) {
        mostrarMensajePerfil('mensaje-clave', 'No pudimos cambiar la contraseña. Intentá de nuevo.', 'error');
        return;
    }

    document.getElementById('formulario-clave').reset();
    mostrarMensajePerfil('mensaje-clave', 'Contraseña actualizada.', 'exito');
});

document.getElementById('boton-cerrar-sesion').addEventListener('click', async () => {
    await supabaseCliente.auth.signOut();
    localStorage.removeItem('aquatrack_carrito');
    window.location.href = 'login.html';
});

cargarPerfil();