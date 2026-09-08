const listaProductos = document.getElementById('lista-productos');
const estadoCatalogo = document.getElementById('estado-catalogo');
const contadorProductos = document.getElementById('contador-productos');
const buscadorProductos = document.getElementById('buscador-productos');
const filtroCapacidad = document.getElementById('filtro-capacidad');
const botonCarrito = document.getElementById('boton-carrito');
const cantidadCarrito = document.getElementById('cantidad-carrito');
const modalAcceso = document.getElementById('modal-acceso');
const botonCerrarModal = document.getElementById('boton-cerrar-modal');
const botonContinuar = document.getElementById('boton-continuar');
const notificacion = document.getElementById('notificacion');

// mostrar "Iniciar sesion/Crear cuenta" o "Salir"
const navInvitado = document.getElementById('nav-invitado');
const navUsuario = document.getElementById('nav-usuario');
const botonCerrarSesion = document.getElementById('boton-cerrar-sesion');

let productosDisponibles = [];
let temporizadorNotificacion;

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

function obtenerDistribuidora(producto) {
    if (Array.isArray(producto.distribuidoras)) {
        return producto.distribuidoras[0] || {};
    }

    return producto.distribuidoras || {};
}

function formatearPrecio(precio) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0
    }).format(Number(precio));
}

function obtenerCarrito() {
    try {
        return JSON.parse(localStorage.getItem('aquatrack_carrito')) || [];
    } catch {
        return [];
    }
}

function guardarCarrito(carrito) {
    localStorage.setItem('aquatrack_carrito', JSON.stringify(carrito));
}

function actualizarCantidadCarrito() {
    const carrito = obtenerCarrito();
    const cantidad = carrito.reduce(
        (total, producto) => total + producto.cantidad,
        0
    );

    cantidadCarrito.textContent = cantidad;
}

function mostrarNotificacion(texto) {
    notificacion.textContent = texto;
    notificacion.classList.add('visible');

    clearTimeout(temporizadorNotificacion);

    temporizadorNotificacion = setTimeout(() => {
        notificacion.classList.remove('visible');
    }, 3200);
}

function abrirModalAcceso() {
    modalAcceso.classList.remove('oculto');
    document.body.classList.add('sin-desplazamiento');
    botonCerrarModal.focus();
}

function cerrarModalAcceso() {
    modalAcceso.classList.add('oculto');
    document.body.classList.remove('sin-desplazamiento');
}

function crearIconoProducto() {
    return `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3.5C12 3.5 5.5 10.4 5.5 15.1C5.5 18.7 8.4 21.5 12 21.5C15.6 21.5 18.5 18.7 18.5 15.1C18.5 10.4 12 3.5 12 3.5Z"
        fill="currentColor"
      />
    </svg>
  `;
}

function renderizarProductos() {
    const textoBusqueda = buscadorProductos.value.trim().toLowerCase();
    const capacidadSeleccionada = filtroCapacidad.value;

    const productosFiltrados = productosDisponibles.filter((producto) => {
        const distribuidora = obtenerDistribuidora(producto);
        const contenidoProducto = [
            producto.nombre,
            producto.descripcion,
            distribuidora.nombre
        ]
            .join(' ')
            .toLowerCase();

        const coincideBusqueda = contenidoProducto.includes(textoBusqueda);
        const coincideCapacidad =
            capacidadSeleccionada === 'todas' ||
            String(producto.capacidad_litros) === capacidadSeleccionada;

        return coincideBusqueda && coincideCapacidad;
    });

    listaProductos.innerHTML = '';

    if (productosFiltrados.length === 0) {
        estadoCatalogo.textContent =
            'No encontramos productos con esos filtros.';
        estadoCatalogo.className = 'estado-catalogo';
        contadorProductos.textContent = 'Sin resultados';
        return;
    }

    estadoCatalogo.textContent = '';
    estadoCatalogo.className = 'estado-catalogo oculto';

    contadorProductos.textContent =
        `${productosFiltrados.length} producto${productosFiltrados.length === 1 ? '' : 's'}`;

    productosFiltrados.forEach((producto) => {
        const distribuidora = obtenerDistribuidora(producto);
        const descripcion = producto.descripcion || 'Agua mineral a domicilio.';

        const tarjeta = document.createElement('article');

        tarjeta.className = 'tarjeta-producto';

        tarjeta.innerHTML = `
      <div class="tarjeta-producto-superior">
        <div class="icono-producto">
          ${crearIconoProducto()}
        </div>

        <span class="etiqueta-producto">Disponible</span>
      </div>

      <p class="nombre-distribuidora">
        ${escaparHtml(distribuidora.nombre || 'Distribuidora local')}
      </p>

      <h3>${escaparHtml(producto.nombre)}</h3>

      <p class="descripcion-producto">
        ${escaparHtml(descripcion)}
      </p>

      <div class="detalle-producto">
        <span class="capacidad-producto">
          ${escaparHtml(producto.capacidad_litros)} litros
        </span>

        <strong class="precio-producto">
          ${formatearPrecio(producto.precio)}
        </strong>
      </div>

      <button
        type="button"
        class="btn btn-principal btn-agregar"
        data-agregar-producto="${escaparHtml(producto.id)}"
      >
        Agregar al pedido
      </button>
    `;

        listaProductos.appendChild(tarjeta);
    });
}

function cargarOpcionesCapacidad() {
    const capacidades = [...new Set(
        productosDisponibles.map((producto) => producto.capacidad_litros)
    )].sort((a, b) => Number(a) - Number(b));

    capacidades.forEach((capacidad) => {
        const opcion = document.createElement('option');

        opcion.value = capacidad;
        opcion.textContent = `${capacidad} litros`;

        filtroCapacidad.appendChild(opcion);
    });
}

async function cargarProductos() {
    estadoCatalogo.textContent = 'Cargando productos...';
    estadoCatalogo.className = 'estado-catalogo';

    const { data, error } = await supabaseCliente
        .from('productos')
        .select(`
      id,
      nombre,
      descripcion,
      capacidad_litros,
      precio,
      activo,
      distribuidoras!inner (
        id,
        nombre,
        ciudad,
        provincia,
        estado
      )
    `)
        .eq('activo', true)
        .eq('distribuidoras.estado', 'activa')
        .order('nombre');

    if (error) {
        estadoCatalogo.textContent =
            'No pudimos cargar el catálogo. Intentá nuevamente más tarde.';
        estadoCatalogo.className = 'estado-catalogo error';
        contadorProductos.textContent = 'Catálogo no disponible';
        return;
    }

    productosDisponibles = data || [];

    cargarOpcionesCapacidad();
    renderizarProductos();
}

async function agregarProducto(idProducto) {
    const {
        data: { session }
    } = await supabaseCliente.auth.getSession();

    if (!session) {
        abrirModalAcceso();
        return;
    }

    const producto = productosDisponibles.find(
        (elemento) => elemento.id === idProducto
    );

    if (!producto) {
        return;
    }

    const carrito = obtenerCarrito();
    const productoExistente = carrito.find(
        (elemento) => elemento.id === idProducto
    );

    if (productoExistente) {
        productoExistente.cantidad += 1;
    } else {
        const distribuidora = obtenerDistribuidora(producto);

        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            capacidad_litros: producto.capacidad_litros,
            distribuidora_id: distribuidora.id,
            distribuidora_nombre: distribuidora.nombre,
            cantidad: 1
        });
    }

    guardarCarrito(carrito);
    actualizarCantidadCarrito();
    mostrarNotificacion('Producto agregado a tu pedido.');
}

listaProductos.addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-agregar-producto]');

    if (!boton) {
        return;
    }

    agregarProducto(boton.dataset.agregarProducto);
});

buscadorProductos.addEventListener('input', renderizarProductos);
filtroCapacidad.addEventListener('change', renderizarProductos);

botonCarrito.addEventListener('click', async () => {
    const {
        data: { session }
    } = await supabaseCliente.auth.getSession();

    if (!session) {
        abrirModalAcceso();
        return;
    }

    const cantidad = Number(cantidadCarrito.textContent);

    if (cantidad === 0) {
        mostrarNotificacion('Todavía no agregaste productos a tu pedido.');
        return;
    }

    mostrarNotificacion(
        `Tu pedido tiene ${cantidad} producto${cantidad === 1 ? '' : 's'}.`
    );
});

botonCerrarModal.addEventListener('click', cerrarModalAcceso);

botonContinuar.addEventListener('click', cerrarModalAcceso);

modalAcceso.addEventListener('click', (evento) => {
    if (evento.target === modalAcceso) {
        cerrarModalAcceso();
    }
});

document.addEventListener('keydown', (evento) => {
    if (
        evento.key === 'Escape' &&
        !modalAcceso.classList.contains('oculto')
    ) {
        cerrarModalAcceso();
    }
});

// revisa si hay una sesion activa y muestra el bloque de nav correspondiente
async function verificarSesion() {
    const {
        data: { session }
    } = await supabaseCliente.auth.getSession();

    navInvitado.classList.toggle('oculto', Boolean(session));
    navUsuario.classList.toggle('oculto', !session);
}

// logout, vuelve a la pantalla de login
async function cerrarSesion() {
    await supabaseCliente.auth.signOut();
    window.location.href = 'login.html';
}

botonCerrarSesion.addEventListener('click', cerrarSesion);

actualizarCantidadCarrito();
cargarProductos();
verificarSesion();