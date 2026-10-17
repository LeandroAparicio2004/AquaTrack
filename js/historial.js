function formatearPrecio(valor) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(valor || 0);
}

function formatearFecha(valor) {
    if (!valor) {
        return '';
    }

    return new Date(valor).toLocaleDateString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
}

const etiquetasEstadoPedidoHistorial = {
    pendiente: 'Pendiente de asignación',
    asignado: 'Asignado a un repartidor',
    en_camino: 'En camino',
    entregado: 'Entregado',
    cancelado: 'Cancelado'
};

let pedidosHistorial = [];
let filtroActualHistorial = 'todos';

function mostrarEstadoHistorial(texto) {
    const estado = document.getElementById('estado-historial');
    estado.textContent = texto;
    estado.classList.remove('oculto');
}

function renderizarHistorial() {
    const lista = document.getElementById('lista-historial');
    const estado = document.getElementById('estado-historial');

    const pedidosFiltrados = filtroActualHistorial === 'todos'
        ? pedidosHistorial
        : pedidosHistorial.filter((pedido) => pedido.estado === filtroActualHistorial);

    if (pedidosFiltrados.length === 0) {
        lista.innerHTML = '';
        estado.textContent = pedidosHistorial.length === 0
            ? 'Todavía no hiciste ningún pedido.'
            : 'No tenés pedidos con este estado.';
        estado.classList.remove('oculto');
        return;
    }

    estado.classList.add('oculto');

    lista.innerHTML = pedidosFiltrados.map((pedido) => {
        const puedeSeguirEnVivo = pedido.estado === 'asignado' || pedido.estado === 'en_camino';

        return `
            <div class="tarjeta-historial">
                <div class="info-historial">
                    <span class="numero-pedido-historial">Pedido #${pedido.id.slice(0, 8).toUpperCase()}</span>
                    <span class="distribuidora-historial">${pedido.distribuidoras?.nombre || 'AquaTrack'}</span>
                    <span class="fecha-historial">${formatearFecha(pedido.creado_en)}</span>
                </div>

                <div class="detalle-historial">
                    <span class="etiqueta-estado-pedido ${pedido.estado}">${etiquetasEstadoPedidoHistorial[pedido.estado] || pedido.estado}</span>
                    <span class="total-historial">${formatearPrecio(pedido.total)}</span>

                    <div class="acciones-historial">
                        <a href="ticket.html?pedido=${pedido.id}">Ver ticket</a>
                        ${obtenerBotonResena(pedido)}
                        ${(pedido.detalles_pedidos || []).length > 0 ? `<button type="button" class="boton-repetir-historial" data-repetir-pedido="${pedido.id}">Repetir pedido</button>` : ''}
                        ${puedeSeguirEnVivo ? `<a href="seguimiento.html?pedido=${pedido.id}">Seguir en vivo</a>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function obtenerResenaPedido(pedido) {
    return Array.isArray(pedido.resenas) ? pedido.resenas[0] : pedido.resenas;
}

function obtenerBotonResena(pedido) {
    if (pedido.estado !== 'entregado') {
        return '';
    }

    const resena = obtenerResenaPedido(pedido);

    if (resena) {
        return `<span class="resena-hecha-historial">Calificaste ${'★'.repeat(resena.estrellas_distribuidora)}</span>`;
    }

    return `<button type="button" class="boton-resena-historial" data-calificar-pedido="${pedido.id}">Calificar</button>`;
}

let pedidoAcalificar = null;
const valoresResena = { distribuidora: 0, repartidor: 0 };

function pintarEstrellasResena() {
    document.querySelectorAll('.estrellas-resena').forEach((grupo) => {
        const valor = valoresResena[grupo.dataset.grupo];

        grupo.querySelectorAll('button').forEach((boton) => {
            boton.classList.toggle('activa', Number(boton.dataset.valor) <= valor);
        });
    });
}

function abrirModalResena(idPedido) {
    const pedido = pedidosHistorial.find((p) => p.id === idPedido);

    if (!pedido) {
        return;
    }

    pedidoAcalificar = idPedido;
    valoresResena.distribuidora = 0;
    valoresResena.repartidor = 0;
    pintarEstrellasResena();

    document.getElementById('subtitulo-resena').textContent =
        `${pedido.distribuidoras?.nombre || 'AquaTrack'} · Pedido #${pedido.id.slice(0, 8).toUpperCase()}`;
    document.getElementById('comentario-resena').value = '';
    document.getElementById('error-resena').hidden = true;
    document.getElementById('btn-enviar-resena').disabled = false;
    document.getElementById('modal-resena').hidden = false;
}

function cerrarModalResena() {
    document.getElementById('modal-resena').hidden = true;
    pedidoAcalificar = null;
}

document.getElementById('lista-historial').addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-calificar-pedido]');

    if (boton) {
        abrirModalResena(boton.dataset.calificarPedido);
    }
});

document.querySelectorAll('.estrellas-resena').forEach((grupo) => {
    grupo.addEventListener('click', (evento) => {
        const boton = evento.target.closest('button');

        if (!boton) {
            return;
        }

        const grupoNombre = grupo.dataset.grupo;
        const valor = Number(boton.dataset.valor);

        valoresResena[grupoNombre] = valoresResena[grupoNombre] === valor ? 0 : valor;
        pintarEstrellasResena();
    });
});

document.getElementById('btn-cancelar-resena').addEventListener('click', cerrarModalResena);

document.getElementById('btn-enviar-resena').addEventListener('click', async () => {
    const error = document.getElementById('error-resena');

    if (!valoresResena.distribuidora) {
        error.textContent = 'Elegí las estrellas para la distribuidora.';
        error.hidden = false;
        return;
    }

    const boton = document.getElementById('btn-enviar-resena');
    boton.disabled = true;

    const { error: errorRpc } = await supabaseCliente.rpc('crear_resena', {
        p_pedido: pedidoAcalificar,
        p_estrellas_distribuidora: valoresResena.distribuidora,
        p_estrellas_repartidor: valoresResena.repartidor || null,
        p_comentario: document.getElementById('comentario-resena').value
    });

    if (errorRpc) {
        error.textContent = errorRpc.message.includes('Ya calificaste')
            ? 'Ya calificaste este pedido.'
            : 'No pudimos enviar tu reseña. Intentá de nuevo.';
        error.hidden = false;
        boton.disabled = false;
        return;
    }

    cerrarModalResena();
    cargarHistorial();
});

async function repetirPedido(idPedido, boton) {
    const pedido = pedidosHistorial.find((p) => p.id === idPedido);
    const detalles = pedido?.detalles_pedidos || [];

    if (detalles.length === 0) {
        return;
    }

    boton.disabled = true;
    const textoOriginal = boton.textContent;
    boton.textContent = 'Cargando...';

    const { data: productos, error } = await supabaseCliente
        .from('productos')
        .select(`
            id, nombre, precio, descuento_por_envase, capacidad_litros, activo,
            distribuidoras!inner ( id, nombre, estado )
        `)
        .in('id', detalles.map((d) => d.producto_id))
        .eq('activo', true)
        .eq('distribuidoras.estado', 'activa');

    boton.disabled = false;
    boton.textContent = textoOriginal;

    if (error || !productos || productos.length === 0) {
        alert('Los productos de este pedido ya no están disponibles.');
        return;
    }

    if (productos.length < detalles.length) {
        const seguir = confirm('Algunos productos de este pedido ya no están disponibles. ¿Querés agregar los que sí están?');

        if (!seguir) {
            return;
        }
    }

    let carrito = [];

    try {
        carrito = JSON.parse(localStorage.getItem('aquatrack_carrito')) || [];
    } catch {
        carrito = [];
    }

    detalles.forEach((detalle) => {
        const producto = productos.find((p) => p.id === detalle.producto_id);

        if (!producto) {
            return;
        }

        const existente = carrito.find((item) => item.id === producto.id);

        if (existente) {
            existente.cantidad += detalle.cantidad;
            return;
        }

        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: Number(producto.precio),
            descuento_por_envase: Number(producto.descuento_por_envase) || 0,
            capacidad_litros: producto.capacidad_litros,
            distribuidora_id: producto.distribuidoras.id,
            distribuidora_nombre: producto.distribuidoras.nombre,
            cantidad: detalle.cantidad,
            envases_devueltos: 0
        });
    });

    localStorage.setItem('aquatrack_carrito', JSON.stringify(carrito));
    window.location.href = 'carrito.html';
}

document.getElementById('lista-historial').addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-repetir-pedido]');

    if (boton) {
        repetirPedido(boton.dataset.repetirPedido, boton);
    }
});

function configurarFiltrosHistorial() {
    const contenedorFiltros = document.getElementById('filtros-historial');

    contenedorFiltros.addEventListener('click', (evento) => {
        const boton = evento.target.closest('.chip-filtro-historial');

        if (!boton) {
            return;
        }

        contenedorFiltros.querySelectorAll('.chip-filtro-historial').forEach((elemento) => {
            elemento.classList.remove('activo');
        });

        boton.classList.add('activo');
        filtroActualHistorial = boton.dataset.filtro;
        renderizarHistorial();
    });
}

async function cargarHistorial() {
    const { data: { session } } = await supabaseCliente.auth.getSession();

    if (!session) {
        window.location.href = 'login.html?siguiente=historial.html';
        return;
    }

    mostrarEstadoHistorial('Cargando tus pedidos...');

    const { data: pedidos, error } = await supabaseCliente
        .from('pedidos')
        .select(`
            id, estado, total, creado_en,
            distribuidoras ( nombre ),
            detalles_pedidos ( producto_id, cantidad )
        `)
        .eq('cliente_id', session.user.id)
        .order('creado_en', { ascending: false });

    if (error) {
        mostrarEstadoHistorial('No pudimos cargar tu historial de pedidos. Probá de nuevo más tarde.');
        return;
    }

    pedidosHistorial = pedidos || [];
    renderizarHistorial();
}

async function verificarSesionNav() {
    const { data: { session } } = await supabaseCliente.auth.getSession();
    document.getElementById('nav-invitado').classList.toggle('oculto', Boolean(session));
    document.getElementById('nav-usuario').classList.toggle('oculto', !session);
}

document.getElementById('boton-cerrar-sesion').addEventListener('click', async () => {
    await supabaseCliente.auth.signOut();
    localStorage.removeItem('aquatrack_carrito');
    window.location.href = 'login.html';
});

configurarFiltrosHistorial();
cargarHistorial();
verificarSesionNav();

document.getElementById('btn-atras')?.addEventListener('click', () => {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = 'index.html';
    }
});