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
                        ${puedeSeguirEnVivo ? `<a href="seguimiento.html?pedido=${pedido.id}">Seguir en vivo</a>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

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
            distribuidoras ( nombre )
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
    window.location.href = 'login.html';
});

configurarFiltrosHistorial();
cargarHistorial();
verificarSesionNav();