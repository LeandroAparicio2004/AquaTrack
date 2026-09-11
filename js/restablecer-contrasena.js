const formulario = document.getElementById('formulario-restablecer');
const btnEnviar = document.getElementById('btn-enviar');
const mensajeEstado = document.getElementById('mensaje-estado');
const campoContrasena = document.getElementById('contrasena');
const campoRepetirContrasena = document.getElementById('repetir-contrasena');

const iconoOjoAbierto = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="12" r="2.8" stroke="currentColor" stroke-width="1.6"/></svg>`;
const iconoOjoCerrado = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3.5 3.5l17 17" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M6.4 6.9C4 8.6 2.5 12 2.5 12S6 18.5 12 18.5c1.5 0 2.9-.4 4.1-1M9.9 5.7c.7-.1 1.4-.2 2.1-.2 6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3.1 4.1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.9 12a2.8 2.8 0 0 0 4-2.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;

function actualizarIconoContrasena(boton, contrasenaVisible) {
    boton.innerHTML = contrasenaVisible ? iconoOjoAbierto : iconoOjoCerrado;
    boton.setAttribute('aria-pressed', String(contrasenaVisible));
    boton.setAttribute('aria-label', contrasenaVisible ? 'Ocultar contraseña' : 'Mostrar contraseña');
}

async function inicializarSesionDeRecuperacion() {
    const parametrosUrl = new URLSearchParams(window.location.search);
    const codigo = parametrosUrl.get('code');

    if (!codigo) {
        mostrarMensaje(
            'Este enlace no es válido. Pedí uno nuevo desde "Olvidé mi contraseña".',
            'error'
        );
        formulario.querySelectorAll('input, button').forEach((elemento) => {
            elemento.disabled = true;
        });
        return;
    }

    const { error } = await supabaseCliente.auth.exchangeCodeForSession(codigo);

    if (error) {
        mostrarMensaje(
            'El enlace venció o ya se usó. Pedí uno nuevo desde "Olvidé mi contraseña".',
            'error'
        );
        formulario.querySelectorAll('input, button').forEach((elemento) => {
            elemento.disabled = true;
        });
    }
}

document.querySelectorAll('.btn-ver-contrasena').forEach((boton) => {
    actualizarIconoContrasena(boton, false);

    boton.addEventListener('click', () => {
        const campo = document.getElementById(boton.dataset.objetivo);
        const contrasenaVisible = campo.type === 'password';

        campo.type = contrasenaVisible ? 'text' : 'password';
        actualizarIconoContrasena(boton, contrasenaVisible);
    });
});

function mostrarMensaje(texto, tipo) {
    mensajeEstado.textContent = texto;
    mensajeEstado.className = `mensaje-estado ${tipo}`;
}

formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    if (campoContrasena.value.length < 8) {
        mostrarMensaje('La contraseña debe tener al menos 8 caracteres.', 'error');
        return;
    }

    if (campoContrasena.value !== campoRepetirContrasena.value) {
        mostrarMensaje('Las contraseñas no coinciden.', 'error');
        return;
    }

    btnEnviar.disabled = true;
    btnEnviar.textContent = 'Guardando...';

    try {
        const { error } = await supabaseCliente.auth.updateUser({
            password: campoContrasena.value
        });

        if (error) {
            const mensaje = error.code === 'same_password'
                ? 'La contraseña nueva tiene que ser distinta a la anterior.'
                : 'El enlace venció o ya se usó. Pedí uno nuevo desde "Olvidé mi contraseña".';

            mostrarMensaje(mensaje, 'error');
            btnEnviar.disabled = false;
            btnEnviar.textContent = 'Guardar contraseña';
            return;
        }

        mostrarMensaje('Contraseña actualizada. Redirigiendo a Iniciar sesión...', 'exito');

        await supabaseCliente.auth.signOut();

        setTimeout(() => { window.location.href = 'login.html'; }, 1500);
    } catch (error) {
        mostrarMensaje('No pudimos conectar con el servicio. Intentá nuevamente.', 'error');
        btnEnviar.disabled = false;
        btnEnviar.textContent = 'Guardar contraseña';
    }
});

inicializarSesionDeRecuperacion();