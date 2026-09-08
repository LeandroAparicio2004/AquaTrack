const btnVerContrasena = document.getElementById('btn-ver-contrasena');
const campoContrasena = document.getElementById('contrasena');
const formulario = document.getElementById('formulario-login');
const btnEnviar = document.getElementById('btn-enviar');
const mensajeEstado = document.getElementById('mensaje-estado');

const iconoOjoAbierto = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="12" r="2.8" stroke="currentColor" stroke-width="1.6"/></svg>`;
const iconoOjoCerrado = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3.5 3.5l17 17" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M6.4 6.9C4 8.6 2.5 12 2.5 12S6 18.5 12 18.5c1.5 0 2.9-.4 4.1-1M9.9 5.7c.7-.1 1.4-.2 2.1-.2 6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3.1 4.1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.9 12a2.8 2.8 0 0 0 4-2.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;

function actualizarIconoContrasena(visible) {
  btnVerContrasena.innerHTML = visible ? iconoOjoAbierto : iconoOjoCerrado;
  btnVerContrasena.setAttribute('aria-pressed', String(visible));
  btnVerContrasena.setAttribute('aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
}

actualizarIconoContrasena(false);

btnVerContrasena.addEventListener('click', () => {
  const seVaAMostrar = campoContrasena.type === 'password';
  campoContrasena.type = seVaAMostrar ? 'text' : 'password';
  actualizarIconoContrasena(seVaAMostrar);
});

function mostrarMensaje(texto, tipo) {
  mensajeEstado.textContent = texto;
  mensajeEstado.className = `mensaje-estado ${tipo}`;
}

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  btnEnviar.disabled = true;
  btnEnviar.textContent = 'Ingresando...';

  const correo = document.getElementById('correo').value.trim();
  const contrasena = campoContrasena.value;

  try {
    const { data, error } = await supabaseCliente.auth.signInWithPassword({ email: correo, password: contrasena });

    if (error) {
      mostrarMensaje('Correo o contraseña incorrectos.', 'error');
      btnEnviar.disabled = false;
      btnEnviar.textContent = 'Iniciar sesión';
      return;
    }

    // redirige segun rol
    const { data: perfil } = await supabaseCliente
      .from('usuarios')
      .select('rol')
      .eq('id', data.user.id)
      .single();

    const paginaDestino = perfil?.rol === 'vendedor'
      ? 'panel-vendedor.html'
      : 'index.html';

    mostrarMensaje('¡Bienvenido! Redirigiendo...', 'exito');
    setTimeout(() => { window.location.href = paginaDestino; }, 1200);
  } catch (error) {
    mostrarMensaje('No pudimos conectar con el servicio. Intentá nuevamente.', 'error');
    btnEnviar.disabled = false;
    btnEnviar.textContent = 'Iniciar sesión';
  }
});