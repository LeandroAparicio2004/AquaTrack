const listaProductos = document.getElementById('lista-productos');
const estadoCatalogo = document.getElementById('estado-catalogo');
const contadorProductos = document.getElementById('contador-productos');
const buscadorProductos = document.getElementById('buscador-productos');
const botonCarrito = document.getElementById('boton-carrito');
const cantidadCarrito = document.getElementById('cantidad-carrito');
const modalAcceso = document.getElementById('modal-acceso');
const botonCerrarModal = document.getElementById('boton-cerrar-modal');
const botonContinuar = document.getElementById('boton-continuar');
const notificacion = document.getElementById('notificacion');

const navInvitado = document.getElementById('nav-invitado');
const navUsuario = document.getElementById('nav-usuario');
const botonCerrarSesion = document.getElementById('boton-cerrar-sesion');

let productosDisponibles = [];
let calificacionesDistribuidoras = {};
let favoritosIds = new Set();
const filtroFavoritos = document.getElementById('filtro-favoritos');

function crearEtiquetaProducto(producto) {
    if (producto.stock === 0) {
        return '<span class="etiqueta-producto etiqueta-sin-stock">Sin stock</span>';
    }

    if (producto.stock != null && producto.stock <= 5) {
        return `<span class="etiqueta-producto etiqueta-poco-stock">Quedan ${producto.stock}</span>`;
    }

    return producto.es_combo
        ? '<span class="etiqueta-producto etiqueta-combo">Combo</span>'
        : '<span class="etiqueta-producto">Disponible</span>';
}

function crearBloqueCalificacion(idDistribuidora) {
    const calificacion = calificacionesDistribuidoras[idDistribuidora];

    if (!calificacion) {
        return '<span class="calificacion-catalogo calificacion-nueva">Nueva</span>';
    }

    const promedio = Number(calificacion.promedio).toFixed(1).replace('.', ',');

    return `<span class="calificacion-catalogo" title="${calificacion.cantidad} reseñas">
      <span class="estrella-catalogo">★</span> ${promedio} <span class="cantidad-catalogo">(${calificacion.cantidad})</span>
    </span>`;
}
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

function crearBloqueImagen(producto) {
    if (!producto.foto_url) {
        return '';
    }

    return `
    <div class="imagen-producto">
      <img src="${escaparHtml(producto.foto_url)}" alt="${escaparHtml(producto.nombre)}">
    </div>
  `;
}

function renderizarProductos() {
    const textoBusqueda = buscadorProductos.value.trim().toLowerCase();
    const capacidadSeleccionada = valorFiltro('capacidad');
    const tipoSeleccionado = valorFiltro('tipo');
    const soloFavoritos = filtroFavoritos.checked;

    actualizarContadorFiltros(capacidadSeleccionada, tipoSeleccionado, soloFavoritos);

    const productosFiltrados = productosDisponibles.filter((producto) => {
        const distribuidora = obtenerDistribuidora(producto);
        const contenidoProducto = [
            producto.nombre,
            producto.descripcion,
            producto.incluye_combo,
            distribuidora.nombre
        ]
            .join(' ')
            .toLowerCase();

        const coincideBusqueda =
            textoBusqueda.length < 3 || contenidoProducto.includes(textoBusqueda);
        const coincideCapacidad =
            capacidadSeleccionada === 'todas' ||
            String(producto.capacidad_litros) === capacidadSeleccionada;
        const coincideTipo =
            tipoSeleccionado === 'todos' ||
            (tipoSeleccionado === 'combos' && producto.es_combo) ||
            (tipoSeleccionado === 'individuales' && !producto.es_combo);

        const coincideFavorito = !soloFavoritos || favoritosIds.has(producto.id);

        return coincideBusqueda && coincideCapacidad && coincideTipo && coincideFavorito;
    });

    listaProductos.innerHTML = '';

    if (productosFiltrados.length === 0) {
        estadoCatalogo.textContent = soloFavoritos && favoritosIds.size === 0
            ? 'Todavía no guardaste favoritos. Toca el ♡ de un producto para guardarlo.'
            : 'No encontramos productos con esos filtros.';
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
      <button type="button" class="boton-favorito${favoritosIds.has(producto.id) ? ' activo' : ''}"
        data-favorito="${escaparHtml(producto.id)}"
        aria-label="${favoritosIds.has(producto.id) ? 'Quitar de favoritos' : 'Guardar en favoritos'}"
        aria-pressed="${favoritosIds.has(producto.id)}">${favoritosIds.has(producto.id) ? '♥' : '♡'}</button>
      ${crearBloqueImagen(producto)}

      <div class="tarjeta-producto-superior">
        <div class="icono-producto">
          ${crearIconoProducto()}
        </div>

        ${crearEtiquetaProducto(producto)}
      </div>

      <p class="nombre-distribuidora">
        ${escaparHtml(distribuidora.nombre || 'Distribuidora local')}
        ${crearBloqueCalificacion(distribuidora.id)}
      </p>

      <h3>${escaparHtml(producto.nombre)}</h3>

      <p class="descripcion-producto">
        ${escaparHtml(descripcion)}
      </p>

      ${producto.es_combo && producto.incluye_combo
                ? `<p class="incluye-combo-producto"><strong>Incluye:</strong> ${escaparHtml(producto.incluye_combo)}</p>`
                : ''}

      <div class="detalle-producto">
        <span class="capacidad-producto">
          ${producto.es_combo ? 'Combo' : `${escaparHtml(producto.capacidad_litros)} litros`}
        </span>

        <div class="precios-producto">
          <strong class="precio-producto">
            ${formatearPrecio(producto.precio)}
          </strong>

          ${Number(producto.descuento_por_envase) > 0
                ? `<span class="precio-con-envase">
                   Con envase: ${formatearPrecio(producto.precio - producto.descuento_por_envase)}
                 </span>`
                : ''}
        </div>
      </div>

      <button
        type="button"
        class="btn btn-principal btn-agregar"
        data-agregar-producto="${escaparHtml(producto.id)}"
        ${producto.stock === 0 ? 'disabled' : ''}
      >
        ${producto.stock === 0 ? 'Sin stock' : 'Agregar al pedido'}
      </button>
    `;

        listaProductos.appendChild(tarjeta);
    });
}

function valorFiltro(nombre) {
    return document.querySelector(`input[name="${nombre}"]:checked`)?.value;
}

function actualizarContadorFiltros(capacidad, tipo, soloFavoritos) {
    const activos = [capacidad !== 'todas', tipo !== 'todos', soloFavoritos].filter(Boolean).length;
    document.getElementById('contador-filtros').textContent = activos || '';
}

function alternarFiltros(abrir) {
    document.body.classList.toggle('filtros-abiertos', abrir);
    document.body.classList.toggle('sin-desplazamiento', abrir);
    document.getElementById('abrir-filtros').setAttribute('aria-expanded', String(abrir));
}

function cargarOpcionesCapacidad() {
    const contenedor = document.getElementById('opciones-capacidad');

    const capacidades = [...new Set(
        productosDisponibles
            .filter((producto) => !producto.es_combo)
            .map((producto) => producto.capacidad_litros)
    )].sort((a, b) => Number(a) - Number(b));

    capacidades.forEach((capacidad) => {
        const cantidad = productosDisponibles.filter(
            (producto) => !producto.es_combo && producto.capacidad_litros === capacidad
        ).length;

        const etiqueta = document.createElement('label');
        etiqueta.className = 'opcion-filtro';
        etiqueta.innerHTML = `
            <input type="radio" name="capacidad" value="${escaparHtml(capacidad)}">
            <span>${escaparHtml(capacidad)} litros</span>
            <span class="cantidad-filtro">${cantidad}</span>
        `;

        contenedor.appendChild(etiqueta);
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
      descuento_por_envase,
      stock,
      activo,
      foto_url,
      es_combo,
      incluye_combo,
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

    const { data: calificaciones } = await supabaseCliente
        .rpc('obtener_calificaciones_distribuidoras');

    calificacionesDistribuidoras = {};
    (calificaciones || []).forEach((fila) => {
        calificacionesDistribuidoras[fila.distribuidora_id] = fila;
    });

    favoritosIds = new Set();

    const {
        data: { session: sesionFavoritos }
    } = await supabaseCliente.auth.getSession();

    if (sesionFavoritos) {
        const { data: favoritos } = await supabaseCliente.from('favoritos').select('producto_id');
        favoritosIds = new Set((favoritos || []).map((fila) => fila.producto_id));
    }

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

    const distribuidora = obtenerDistribuidora(producto);
    const carrito = obtenerCarrito();

    if (producto.stock != null) {
        const enCarrito = carrito.find((elemento) => elemento.id === idProducto)?.cantidad || 0;

        if (enCarrito + 1 > producto.stock) {
            mostrarNotificacion(
                producto.stock === 0
                    ? 'Este producto está sin stock.'
                    : `Solo quedan ${producto.stock} unidades disponibles.`
            );
            return;
        }
    }

    const productoExistente = carrito.find(
        (elemento) => elemento.id === idProducto
    );

    if (productoExistente) {
        productoExistente.cantidad += 1;
    } else {
        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: Number(producto.precio),
            descuento_por_envase: Number(producto.descuento_por_envase) || 0,
            capacidad_litros: producto.capacidad_litros,
            distribuidora_id: distribuidora.id,
            distribuidora_nombre: distribuidora.nombre,
            cantidad: 1,
            envases_devueltos: 0
        });
    }

    guardarCarrito(carrito);
    actualizarCantidadCarrito();
    mostrarNotificacion('Producto agregado a tu pedido.');
}

async function alternarFavorito(idProducto) {
    const {
        data: { session }
    } = await supabaseCliente.auth.getSession();

    if (!session) {
        abrirModalAcceso();
        return;
    }

    const eraFavorito = favoritosIds.has(idProducto);

    if (eraFavorito) {
        favoritosIds.delete(idProducto);
    } else {
        favoritosIds.add(idProducto);
    }

    renderizarProductos();

    const { error } = eraFavorito
        ? await supabaseCliente.from('favoritos').delete()
            .eq('usuario_id', session.user.id).eq('producto_id', idProducto)
        : await supabaseCliente.from('favoritos')
            .insert({ usuario_id: session.user.id, producto_id: idProducto });

    if (error) {
        if (eraFavorito) {
            favoritosIds.add(idProducto);
        } else {
            favoritosIds.delete(idProducto);
        }

        renderizarProductos();
        mostrarNotificacion('No pudimos actualizar tus favoritos.');
        return;
    }

    mostrarNotificacion(eraFavorito ? 'Quitado de favoritos.' : 'Guardado en favoritos.');
}

listaProductos.addEventListener('click', (evento) => {
    const botonFavorito = evento.target.closest('[data-favorito]');

    if (botonFavorito) {
        alternarFavorito(botonFavorito.dataset.favorito);
        return;
    }

    const boton = evento.target.closest('[data-agregar-producto]');

    if (!boton) {
        return;
    }

    agregarProducto(boton.dataset.agregarProducto);
});

buscadorProductos.addEventListener('input', renderizarProductos);
document.querySelector('.filtros-lateral').addEventListener('change', renderizarProductos);

document.getElementById('abrir-filtros').addEventListener('click', () => alternarFiltros(true));

['cerrar-filtros', 'aplicar-filtros', 'fondo-filtros'].forEach((id) => {
    document.getElementById(id).addEventListener('click', () => alternarFiltros(false));
});

document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && document.body.classList.contains('filtros-abiertos')) {
        alternarFiltros(false);
    }
});

window.matchMedia('(min-width: 821px)').addEventListener('change', (evento) => {
    if (evento.matches) {
        alternarFiltros(false);
    }
});

document.getElementById('limpiar-filtros').addEventListener('click', () => {
    buscadorProductos.value = '';
    filtroFavoritos.checked = false;
    document.querySelectorAll('.filtros-lateral input[type="radio"][value="todas"], .filtros-lateral input[type="radio"][value="todos"]')
        .forEach((opcion) => { opcion.checked = true; });
    renderizarProductos();
});

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

    window.location.href = 'carrito.html';
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

async function verificarSesion() {
    const {
        data: { session }
    } = await supabaseCliente.auth.getSession();

    navInvitado.classList.toggle('oculto', Boolean(session));
    navUsuario.classList.toggle('oculto', !session);
}

async function cerrarSesion() {
    await supabaseCliente.auth.signOut();
    localStorage.removeItem('aquatrack_carrito');
    window.location.href = 'login.html';
}

botonCerrarSesion.addEventListener('click', cerrarSesion);

actualizarCantidadCarrito();
cargarProductos().then(() => {
    const parametros = new URLSearchParams(window.location.search);
    const busqueda = parametros.get('buscar');
    if (busqueda) {
        buscadorProductos.value = busqueda;
        renderizarProductos();
    }
});
verificarSesion();