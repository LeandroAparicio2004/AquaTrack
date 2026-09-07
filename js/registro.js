let pasoActual = 1;
let rolSeleccionado = null;
const nombresRol = { cliente: 'Cliente', vendedor: 'Vendedor', repartidor: 'Repartidor' };

const indicadores = document.querySelectorAll('.paso-indicador');
const mensajeEstado = document.getElementById('mensaje-estado');
const tituloAuth = document.getElementById('titulo-autenticacion');
const chipRol = document.getElementById('chip-rol');
const chipRolTexto = document.getElementById('chip-rol-texto');

function mostrarMensaje(texto, tipo) {
  mensajeEstado.textContent = texto;
  mensajeEstado.className = `mensaje-estado ${tipo}`;
}

function irAPaso(numero) {
  document.getElementById(`paso-${pasoActual}`).classList.add('oculto');
  document.getElementById(`paso-${numero}`).classList.remove('oculto');
  indicadores.forEach((ind) => {
    const n = Number(ind.dataset.paso);
    ind.classList.toggle('activo', n === numero);
    ind.classList.toggle('completado', n < numero);
  });
  pasoActual = numero;
}

function seleccionarRol(rol) {
  rolSeleccionado = rol;
  document.querySelectorAll('.tarjeta-rol').forEach((t) => t.classList.toggle('seleccionado', t.dataset.rol === rol));
  tituloAuth.textContent = `Crear cuenta de ${nombresRol[rol]}`;
  chipRolTexto.textContent = `Cuenta de ${nombresRol[rol]}`;
  chipRol.classList.remove('oculto');
}

document.querySelectorAll('.tarjeta-rol').forEach((tarjeta) => {
  tarjeta.addEventListener('click', () => {
    seleccionarRol(tarjeta.dataset.rol);
    irAPaso(2);
  });
});

document.getElementById('btn-cambiar-rol').addEventListener('click', () => irAPaso(1));
document.getElementById('btn-atras-2').addEventListener('click', () => irAPaso(1));
document.getElementById('btn-atras-3').addEventListener('click', () => irAPaso(2));
document.getElementById('btn-atras-4').addEventListener('click', () => irAPaso(3));

document.getElementById('btn-siguiente-2').addEventListener('click', () => {
  const nombre = document.getElementById('nombre').value.trim();
  const apellido = document.getElementById('apellido').value.trim();
  if (!nombre || !apellido) {
    mostrarMensaje('Completá nombre y apellido.', 'error');
    return;
  }
  mensajeEstado.className = 'mensaje-estado oculto';
  irAPaso(3);
});

document.getElementById('btn-siguiente-3').addEventListener('click', () => {
  const correo = document.getElementById('correo').value.trim();
  const contrasena = document.getElementById('contrasena').value;
  const repetir = document.getElementById('repetir-contrasena').value;

  if (!correo || contrasena.length < 8) {
    mostrarMensaje('Completá el correo y una contraseña de al menos 8 caracteres.', 'error');
    return;
  }
  if (contrasena !== repetir) {
    mostrarMensaje('Las contraseñas no coinciden.', 'error');
    return;
  }
  mensajeEstado.className = 'mensaje-estado oculto';

  document.getElementById('campos-vendedor').classList.toggle('oculto', rolSeleccionado !== 'vendedor');
  document.getElementById('campos-repartidor').classList.toggle('oculto', rolSeleccionado !== 'repartidor');

  irAPaso(4);
});

document.querySelectorAll('.btn-ver-contrasena').forEach((boton) => {
  boton.addEventListener('click', () => {
    const campo = document.getElementById(boton.dataset.objetivo);
    const oculta = campo.type === 'password';
    campo.type = oculta ? 'text' : 'password';
    boton.textContent = oculta ? 'Ocultar' : 'Ver';
  });
});

document.getElementById('formulario-registro').addEventListener('submit', async (evento) => {
  evento.preventDefault();

  if (!document.getElementById('acepta-terminos').checked) {
    mostrarMensaje('Tenés que aceptar los Términos y la Política de Privacidad.', 'error');
    return;
  }

  const botonEnviar = document.getElementById('btn-enviar');
  botonEnviar.disabled = true;
  botonEnviar.textContent = 'Creando cuenta...';

  const datosUsuario = {
    rol: rolSeleccionado,
    nombre: document.getElementById('nombre').value.trim(),
    apellido: document.getElementById('apellido').value.trim(),
    telefono: document.getElementById('telefono').value.trim(),
  };

  if (rolSeleccionado === 'vendedor') {
    datosUsuario.dni = document.getElementById('dni-vendedor').value.trim();
    datosUsuario.nombre_negocio = document.getElementById('nombre-negocio').value.trim();
    datosUsuario.calle = document.getElementById('calle-negocio').value.trim();
    datosUsuario.numero = document.getElementById('numero-negocio').value.trim();
    datosUsuario.ciudad = document.getElementById('ciudad-negocio').value.trim();
    datosUsuario.provincia = document.getElementById('provincia-negocio').value.trim();
  }

  if (rolSeleccionado === 'repartidor') {
    datosUsuario.dni = document.getElementById('dni-repartidor').value.trim();
    datosUsuario.tipo_vehiculo = document.getElementById('tipo-vehiculo').value;
  }

  const { error } = await supabaseCliente.auth.signUp({
    email: document.getElementById('correo').value.trim(),
    password: document.getElementById('contrasena').value,
    options: { data: datosUsuario }
  });

  if (error) {
    mostrarMensaje('No se pudo crear la cuenta: ' + error.message, 'error');
    botonEnviar.disabled = false;
    botonEnviar.textContent = 'Crear cuenta';
    return;
  }

  mostrarMensaje('¡Cuenta creada! Revisá tu correo para confirmar.', 'exito');
});