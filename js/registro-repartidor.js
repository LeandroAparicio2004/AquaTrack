const formulario = document.getElementById('formulario-repartidor');
const btnEnviar = document.getElementById('btn-enviar');
const mensajeEstado = document.getElementById('mensaje-estado');
const campoCorreo = document.getElementById('correo');

const iconoOjoAbierto = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="12" r="2.8" stroke="currentColor" stroke-width="1.6"/></svg>`;
const iconoOjoCerrado = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3.5 3.5l17 17" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M6.4 6.9C4 8.6 2.5 12 2.5 12S6 18.5 12 18.5c1.5 0 2.9-.4 4.1-1M9.9 5.7c.7-.1 1.4-.2 2.1-.2 6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3.1 4.1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.9 12a2.8 2.8 0 0 0 4-2.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;

function actualizarIconoContrasena(boton, visible) {
    boton.innerHTML = visible ? iconoOjoAbierto : iconoOjoCerrado;
    boton.setAttribute('aria-pressed', String(visible));
    boton.setAttribute('aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
}

document.querySelectorAll('.btn-ver-contrasena').forEach((boton) => {
    actualizarIconoContrasena(boton, false);

    boton.addEventListener('click', () => {
        const campo = document.getElementById(boton.dataset.objetivo);
        const seVaAMostrar = campo.type === 'password';

        campo.type = seVaAMostrar ? 'text' : 'password';
        actualizarIconoContrasena(boton, seVaAMostrar);
    });
});

function mostrarMensaje(texto, tipo) {
    mensajeEstado.textContent = texto;
    mensajeEstado.className = `mensaje-estado ${tipo}`;
}

// El email viene en la URL (?email=...), precargado por el link que le pasó el Vendedor
const parametrosUrl = new URLSearchParams(window.location.search);
const correoInvitado = parametrosUrl.get('email');

if (correoInvitado) {
    campoCorreo.value = correoInvitado;
} else {
    mostrarMensaje(
        'Este link no es válido. Pedile al Vendedor que te pase el link de invitación de nuevo.',
        'error'
    );
    formulario.querySelectorAll('input, button').forEach((elemento) => {
        elemento.disabled = true;
    });
}

formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const contrasena = document.getElementById('contrasena').value;
    const repetirContrasena = document.getElementById('repetir-contrasena').value;

    if (contrasena.length < 8) {
        mostrarMensaje('La contraseña debe tener al menos 8 caracteres.', 'error');
        return;
    }

    if (contrasena !== repetirContrasena) {
        mostrarMensaje('Las contraseñas no coinciden.', 'error');
        return;
    }

    btnEnviar.disabled = true;
    btnEnviar.textContent = 'Creando cuenta...';

    try {
        const { error } = await supabaseCliente.auth.signUp({
            email: correoInvitado,
            password: contrasena,
            options: {
                data: { rol: 'repartidor' }
            }
        });

        if (error) {
            mostrarMensaje(
                error.message.toLowerCase().includes('already registered')
                    ? 'Ese correo ya tiene una cuenta creada. Iniciá sesión en vez de registrarte.'
                    : 'No pudimos crear tu cuenta. Intentá de nuevo.',
                'error'
            );
            btnEnviar.disabled = false;
            btnEnviar.textContent = 'Crear mi cuenta';
            return;
        }

        mostrarMensaje('¡Cuenta creada! Redirigiendo...', 'exito');
        setTimeout(() => { window.location.href = 'panel-repartidor.html'; }, 1200);
    } catch (error) {
        mostrarMensaje('No pudimos conectar con el servicio. Intentá de nuevo.', 'error');
        btnEnviar.disabled = false;
        btnEnviar.textContent = 'Crear mi cuenta';
    }
});