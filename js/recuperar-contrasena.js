const formulario = document.getElementById('formulario-recuperar');
const btnEnviar = document.getElementById('btn-enviar');
const mensajeEstado = document.getElementById('mensaje-estado');

function mostrarMensaje(texto, tipo) {
    mensajeEstado.textContent = texto;
    mensajeEstado.className = `mensaje-estado ${tipo}`;
}

formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    btnEnviar.disabled = true;
    btnEnviar.textContent = 'Enviando...';

    const correo = document.getElementById('correo').value.trim();

    try {
        const { error } = await supabaseCliente.auth.resetPasswordForEmail(correo, {
            redirectTo: `${window.location.origin}/restablecer-contrasena.html`
        });

        if (error) {
            mostrarMensaje('No pudimos enviar el correo. Intentá nuevamente.', 'error');
            btnEnviar.disabled = false;
            btnEnviar.textContent = 'Enviar instrucciones';
            return;
        }

        mostrarMensaje(
            'Si el correo existe en nuestro sistema, te van a llegar las instrucciones en unos minutos.',
            'exito'
        );

        btnEnviar.textContent = 'Instrucciones enviadas';
    } catch (error) {
        mostrarMensaje('No pudimos conectar con el servicio. Intente nuevamente.', 'error');
        btnEnviar.disabled = false;
        btnEnviar.textContent = 'Enviar instrucciones';
    }
});