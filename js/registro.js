let pasoActual = 1;
let rolSeleccionado = null;

const nombresRol = {
    cliente: 'Cliente',
    vendedor: 'Vendedor',
    repartidor: 'Repartidor'
};

const textosPaso = {
    1: {
        titulo: 'Crear tu cuenta',
        descripcion: 'Elegí cómo vas a usar AquaTrack.'
    },
    2: {
        titulo: 'Tu información',
        descripcion: 'Usaremos estos datos para personalizar tu experiencia.'
    },
    3: {
        titulo: 'Tus datos de acceso',
        descripcion: 'Creá tus datos de acceso para entrar de forma segura.'
    },
    4: {
        cliente: {
            titulo: 'Ya casi está',
            descripcion: 'Aceptá los términos para finalizar tu cuenta.'
        },
        vendedor: {
            titulo: 'Tu distribuidora',
            descripcion: 'Contanos sobre el negocio que querés administrar.'
        },
        repartidor: {
            titulo: 'Tu perfil de repartidor',
            descripcion: 'Completá tus datos para ofrecerte como repartidor.'
        }
    }
};

const indicadores = document.querySelectorAll('.paso-indicador');
const tarjetasRol = document.querySelectorAll('.tarjeta-rol');
const formulario = document.getElementById('formulario-registro');
const mensajeEstado = document.getElementById('mensaje-estado');
const tituloAuth = document.getElementById('titulo-autenticacion');
const chipRol = document.getElementById('chip-rol');
const chipRolTexto = document.getElementById('chip-rol-texto');
const btnCambiarRol = document.getElementById('btn-cambiar-rol');
const botonEnviar = document.getElementById('btn-enviar');

function mostrarMensaje(texto, tipo) {
    mensajeEstado.textContent = texto;
    mensajeEstado.className = `mensaje-estado ${tipo}`;
}

function ocultarMensaje() {
    mensajeEstado.textContent = '';
    mensajeEstado.className = 'mensaje-estado oculto';
}

function actualizarTitulos() {
    const titulo = pasoActual === 1
        ? textosPaso[1].titulo
        : `Crear cuenta de ${nombresRol[rolSeleccionado]}`;

    const descripcion = pasoActual === 4
        ? textosPaso[4][rolSeleccionado].descripcion
        : textosPaso[pasoActual].descripcion;

    tituloAuth.textContent = titulo;
    document.title = `${titulo} — AquaTrack`;

    tituloAuth.classList.remove('titulo-actualizado');

    requestAnimationFrame(() => {
        tituloAuth.classList.add('titulo-actualizado');
    });

    const textoPasoActual = document.getElementById(`texto-paso-${pasoActual}`);

    if (textoPasoActual) {
        textoPasoActual.textContent = descripcion;
    }
}

function irAPaso(numero) {
    const pasoAnterior = document.getElementById(`paso-${pasoActual}`);
    const nuevoPaso = document.getElementById(`paso-${numero}`);

    if (pasoAnterior) {
        pasoAnterior.classList.add('oculto');
    }

    if (nuevoPaso) {
        nuevoPaso.classList.remove('oculto');
    }

    indicadores.forEach((indicador) => {
        const numeroIndicador = Number(indicador.dataset.paso);

        indicador.classList.toggle('activo', numeroIndicador === numero);
        indicador.classList.toggle('completado', numeroIndicador < numero);
    });

    pasoActual = numero;
    actualizarTitulos();
    ocultarMensaje();
}

function seleccionarRol(rol) {
    rolSeleccionado = rol;

    tarjetasRol.forEach((tarjeta) => {
        tarjeta.classList.toggle(
            'seleccionado',
            tarjeta.dataset.rol === rol
        );
    });

    chipRolTexto.textContent = `Cuenta de ${nombresRol[rol]}`;
    chipRol.classList.remove('oculto');

    irAPaso(2);
}

function cambiarRol() {
    rolSeleccionado = null;

    tarjetasRol.forEach((tarjeta) => {
        tarjeta.classList.remove('seleccionado');
    });

    chipRol.classList.add('oculto');
    irAPaso(1);
}

function limpiarCaracteresNoPermitidos(entrada) {
    entrada.value = entrada.value
        .replace(/[^\p{L}\p{M}\s'-]/gu, '')
        .replace(/\s{2,}/g, ' ');
}

function validarPasoDos() {
    const nombre = document.getElementById('nombre');
    const apellido = document.getElementById('apellido');
    const patronNombre = /^[\p{L}\p{M}]+(?:[\s'-][\p{L}\p{M}]+)*$/u;

    const nombreValido = patronNombre.test(nombre.value.trim());
    const apellidoValido = patronNombre.test(apellido.value.trim());

    if (!nombreValido || !apellidoValido) {
        mostrarMensaje(
            'Ingresá nombres usando solo letras, espacios, guiones o apóstrofes.',
            'error'
        );

        if (!nombreValido) {
            nombre.focus();
        } else {
            apellido.focus();
        }

        return false;
    }

    return true;
}

function validarPasoTres() {
    const correo = document.getElementById('correo');
    const contrasena = document.getElementById('contrasena');
    const repetirContrasena = document.getElementById('repetir-contrasena');

    if (!correo.checkValidity()) {
        mostrarMensaje('Ingresá un correo electrónico válido.', 'error');
        correo.focus();
        return false;
    }

    if (contrasena.value.length < 8) {
        mostrarMensaje(
            'La contraseña debe tener al menos 8 caracteres.',
            'error'
        );
        contrasena.focus();
        return false;
    }

    if (contrasena.value !== repetirContrasena.value) {
        mostrarMensaje('Las contraseñas no coinciden.', 'error');
        repetirContrasena.focus();
        return false;
    }

    return true;
}

function prepararCamposRol() {
    const camposVendedor = document.getElementById('campos-vendedor');
    const camposRepartidor = document.getElementById('campos-repartidor');

    const esVendedor = rolSeleccionado === 'vendedor';
    const esRepartidor = rolSeleccionado === 'repartidor';

    camposVendedor.classList.toggle('oculto', !esVendedor);
    camposRepartidor.classList.toggle('oculto', !esRepartidor);

    camposVendedor.querySelectorAll('input').forEach((campo) => {
        campo.required = esVendedor;
    });

    camposRepartidor.querySelectorAll('input, select').forEach((campo) => {
        campo.required = esRepartidor;
    });
}

function validarPasoCuatro() {
    prepararCamposRol();

    const camposObligatorios = rolSeleccionado === 'vendedor'
        ? [
            'dni-vendedor',
            'nombre-negocio',
            'calle-negocio',
            'numero-negocio',
            'ciudad-negocio',
            'provincia-negocio'
        ]
        : rolSeleccionado === 'repartidor'
            ? ['dni-repartidor']
            : [];

    for (const idCampo of camposObligatorios) {
        const campo = document.getElementById(idCampo);

        if (!campo.value.trim()) {
            mostrarMensaje('Completá todos los datos requeridos.', 'error');
            campo.focus();
            return false;
        }
    }

    const aceptaTerminos = document.getElementById('acepta-terminos');

    if (!aceptaTerminos.checked) {
        mostrarMensaje(
            'Tiene que aceptar los Términos y la Política de Privacidad.',
            'error'
        );
        aceptaTerminos.focus();
        return false;
    }

    return true;
}

function obtenerMensajeError(error) {
    const mensaje = error.message.toLowerCase();

    if (
        mensaje.includes('already registered') ||
        mensaje.includes('user already registered')
    ) {
        return 'Ese correo ya esta registrado.';
    }

    return 'No pudimos crear la cuenta. Revise los datos e intente nuevamente.';
}

tarjetasRol.forEach((tarjeta) => {
    tarjeta.addEventListener('click', () => {
        seleccionarRol(tarjeta.dataset.rol);
    });
});

btnCambiarRol.addEventListener('click', cambiarRol);

document.getElementById('btn-atras-2').addEventListener('click', cambiarRol);

document.getElementById('btn-atras-3').addEventListener('click', () => {
    irAPaso(2);
});

document.getElementById('btn-atras-4').addEventListener('click', () => {
    irAPaso(3);
});

document.getElementById('btn-siguiente-2').addEventListener('click', () => {
    if (validarPasoDos()) {
        irAPaso(3);
    }
});

document.getElementById('btn-siguiente-3').addEventListener('click', () => {
    if (validarPasoTres()) {
        prepararCamposRol();
        irAPaso(4);
    }
});

document.querySelectorAll('#nombre, #apellido').forEach((entrada) => {
    entrada.addEventListener('input', () => {
        limpiarCaracteresNoPermitidos(entrada);
    });
});

document.querySelectorAll('#dni-vendedor, #dni-repartidor').forEach((entrada) => {
    entrada.addEventListener('input', () => {
        entrada.value = entrada.value.replace(/\D/g, '');
    });
});

document.querySelectorAll('.btn-ver-contrasena').forEach((boton) => {
    boton.addEventListener('click', () => {
        const campo = document.getElementById(boton.dataset.objetivo);
        const mostrarContrasena = campo.type === 'password';

        campo.type = mostrarContrasena ? 'text' : 'password';
        boton.textContent = mostrarContrasena ? 'Ocultar' : 'Ver';
    });
});

formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    if (!validarPasoCuatro()) {
        return;
    }

    botonEnviar.disabled = true;
    botonEnviar.textContent = 'Creando cuenta...';

    const datosUsuario = {
        rol: rolSeleccionado,
        nombre: document.getElementById('nombre').value.trim(),
        apellido: document.getElementById('apellido').value.trim(),
        telefono: document.getElementById('telefono').value.trim()
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

    try {
        const { error } = await supabaseCliente.auth.signUp({
            email: document.getElementById('correo').value.trim(),
            password: document.getElementById('contrasena').value,
            options: {
                data: datosUsuario
            }
        });

        if (error) {
            mostrarMensaje(obtenerMensajeError(error), 'error');
            botonEnviar.disabled = false;
            botonEnviar.textContent = 'Crear cuenta';
            return;
        }

        mostrarMensaje(
            'Cuenta creada. Revise su correo para confirmar el registro.',
            'exito'
        );

        botonEnviar.textContent = 'Cuenta creada';
    } catch (error) {
        mostrarMensaje(
            'No pudimos conectar con el servicio. Intente nuevamente.',
            'error'
        );

        botonEnviar.disabled = false;
        botonEnviar.textContent = 'Crear cuenta';
    }
});

actualizarTitulos();