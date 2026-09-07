const btnVerContrasena = document.getElementById('btn-ver-contrasena');
const campoContrasena = document.getElementById('contrasena');
const formulario = document.getElementById('formulario-login');
const btnEnviar = document.getElementById('btn-enviar');
const mensajeEstado = document.getElementById('mensaje-estado');

btnVerContrasena.addEventListener('click', () => {
  const oculta = campoContrasena.type === 'password';
  campoContrasena.type = oculta ? 'text' : 'password';
  btnVerContrasena.textContent = oculta ? 'Ocultar' : 'Ver';

  // Actualizar el estado del ojo
  const ojoCerrado = btnVerContrasena.querySelector('.ojo-cerrado');
  const ojoAberto = btnVerContrasena.querySelector('.ojo-aberto');
  ojoCerrado.style.display = oculta ? 'none' : 'inline-block';
  ojoAberto.style.display = oculta ? 'inline-block' : 'none';
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

  const { error } = await supabaseCliente.auth.signInWithPassword({ email: correo, password: contrasena });

  if (error) {
    mostrarMensaje('Correo o contraseña incorrectos.', 'error');
    btnEnviar.disabled = false;
    btnEnviar.textContent = 'Iniciar sesión';
    return;
  }

  mostrarMensaje('¡Bienvenido! Redirigiendo...', 'exito');
  setTimeout(() => { window.location.href = 'index.html'; }, 1200);
});