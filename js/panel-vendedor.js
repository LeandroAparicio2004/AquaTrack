let distribuidoraActual = null;
let productosDelPanel = [];
let usuarioActualId = null;
let pedidosDelPanel = [];
let repartidoresTablero = [];
let entregasTablero = [];

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

function formatearPrecio(precio) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0
    }).format(Number(precio));
}

function renderizarProductosPanel() {
    const lista = document.getElementById('lista-productos-panel');
    const estadoVacio = document.getElementById('estado-productos-panel');

    lista.innerHTML = '';

    if (productosDelPanel.length === 0) {
        estadoVacio.textContent = 'Todavía no cargaste ningún producto. Hacé clic en "+ Agregar producto" para sumar el primero.';
        estadoVacio.classList.remove('oculto');
        return;
    }

    estadoVacio.classList.add('oculto');

    productosDelPanel.forEach((producto) => {
        const tarjeta = document.createElement('article');
        tarjeta.className = 'tarjeta-producto-panel';

        tarjeta.innerHTML = `
            <div class="tarjeta-producto-panel-foto">
                ${producto.foto_url
                ? `<img src="${escaparHtml(producto.foto_url)}" alt="${escaparHtml(producto.nombre)}">`
                : '<span>Sin foto</span>'}
            </div>

            <div class="tarjeta-producto-panel-superior">
                <h3>${escaparHtml(producto.nombre)}</h3>
                <span class="etiqueta-estado-producto ${producto.activo ? 'activo' : 'inactivo'}">
                    ${producto.activo ? 'Activo' : 'Inactivo'}
                </span>
            </div>
            <p class="tarjeta-producto-panel-descripcion">
                ${escaparHtml(producto.descripcion || 'Sin descripción.')}
            </p>
            <div class="tarjeta-producto-panel-detalle">
                <span>${producto.es_combo ? 'Combo' : `${escaparHtml(producto.capacidad_litros)} litros`}${producto.stock === 0 ? ' · Sin stock' : producto.stock != null ? ` · Stock: ${producto.stock}` : ''}</span>

                <div class="tarjeta-producto-panel-precios">
                    <strong>${formatearPrecio(producto.precio)}</strong>

                    ${Number(producto.descuento_por_envase) > 0
                ? `<span class="tarjeta-producto-panel-envase">Con envase: ${formatearPrecio(producto.precio - producto.descuento_por_envase)}</span>`
                : ''}
                </div>
            </div>
            <div class="tarjeta-producto-panel-acciones">
                <button type="button" class="btn btn-secundario btn-chico" data-editar="${producto.id}">Editar</button>
                <button type="button" class="btn ${producto.activo ? 'btn-secundario' : 'btn-principal'} btn-chico" data-alternar="${producto.id}">
                    ${producto.activo ? 'Desactivar' : 'Activar'}
                </button>
            </div>
        `;

        lista.appendChild(tarjeta);
    });
}

async function cargarProductosPanel() {
    const { data, error } = await supabaseCliente
        .from('productos')
        .select('id, nombre, descripcion, capacidad_litros, precio, descuento_por_envase, activo, foto_url, es_combo, incluye_combo, stock')
        .eq('distribuidora_id', distribuidoraActual.id)
        .order('creado_en', { ascending: false });

    if (error) {
        const estadoVacio = document.getElementById('estado-productos-panel');
        estadoVacio.textContent = 'No pudimos cargar tus productos. Recargá la página.';
        estadoVacio.classList.remove('oculto');
        return;
    }

    productosDelPanel = data || [];
    renderizarProductosPanel();
}

const etiquetasEstadoPedido = {
    pendiente: 'Pendiente',
    asignado: 'Asignado',
    en_camino: 'En camino',
    entregado: 'Entregado',
    cancelado: 'Cancelado'
};

function claseEstadoPedido(estado) {
    if (estado === 'entregado') return 'activo';
    if (estado === 'pendiente') return 'pendiente';
    if (estado === 'cancelado') return 'rechazada';
    return 'inactivo';
}

function renderizarPedidosPanel() {
    const lista = document.getElementById('lista-pedidos-panel');
    const estadoVacio = document.getElementById('estado-pedidos-panel');
    const filtro = document.getElementById('filtro-estado-pedidos').value;

    const pedidosFiltrados = filtro === 'todos'
        ? pedidosDelPanel
        : pedidosDelPanel.filter((pedido) => pedido.estado === filtro);

    lista.innerHTML = '';

    if (pedidosFiltrados.length === 0) {
        estadoVacio.textContent = 'No hay pedidos para este filtro.';
        estadoVacio.classList.remove('oculto');
        return;
    }

    estadoVacio.classList.add('oculto');

    pedidosFiltrados.forEach((pedido) => {
        const tarjeta = document.createElement('article');
        tarjeta.className = 'tarjeta-producto-panel';

        const nombreCliente = `${pedido.usuarios?.nombre || ''} ${pedido.usuarios?.apellido || ''}`.trim() || 'Cliente';

        const itemsHtml = (pedido.detalles_pedidos || []).map((item) => `
            <p class="tarjeta-producto-panel-descripcion">
                ${item.cantidad}x ${escaparHtml(item.productos?.nombre || 'Producto')}
            </p>
        `).join('');

        tarjeta.innerHTML = `
            <div class="tarjeta-producto-panel-superior">
                <h3>${escaparHtml(nombreCliente)}</h3>
                <span class="etiqueta-estado-producto ${claseEstadoPedido(pedido.estado)}">
                    ${etiquetasEstadoPedido[pedido.estado] || pedido.estado}
                </span>
            </div>
            <p class="tarjeta-producto-panel-descripcion">
                ${escaparHtml(pedido.direccion_calle)} ${escaparHtml(pedido.direccion_numero || '')},
                ${escaparHtml(pedido.direccion_ciudad)}
            </p>
            ${itemsHtml}
            <div class="tarjeta-producto-panel-detalle">
                <span>${pedido.metodo_pago === 'transferencia' ? 'Transferencia' : 'Efectivo'}</span>
                <strong>${formatearPrecio(pedido.total)}</strong>
            </div>
            <div class="tarjeta-producto-panel-acciones">
                ${pedido.estado === 'pendiente'
                ? `<button type="button" class="btn btn-secundario btn-chico btn-peligro" data-cancelar-pedido="${pedido.id}">Cancelar pedido</button>`
                : ''}
                <button type="button" class="btn-icono-circular btn-chat-pedido" data-chat-cliente="${pedido.cliente_id}" aria-label="Chatear con el cliente" title="Chatear con el cliente">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                </button>
            </div>
        `;

        lista.appendChild(tarjeta);
    });
}

async function cargarPedidosPanel() {
    const estadoVacio = document.getElementById('estado-pedidos-panel');

    const { data, error } = await supabaseCliente
        .from('pedidos')
        .select(`
            id, estado, direccion_calle, direccion_numero, direccion_ciudad, total, metodo_pago, cliente_id,
            usuarios!pedidos_cliente_id_fkey ( nombre, apellido ),
            detalles_pedidos ( cantidad, productos ( nombre ) )
        `)
        .eq('distribuidora_id', distribuidoraActual.id)
        .order('creado_en', { ascending: false });

    if (error) {
        estadoVacio.textContent = 'No pudimos cargar tus pedidos. Recargá la página.';
        estadoVacio.classList.remove('oculto');
        return;
    }

    pedidosDelPanel = data || [];
    renderizarPedidosPanel();
}

document.getElementById('filtro-estado-pedidos').addEventListener('change', renderizarPedidosPanel);

document.getElementById('lista-pedidos-panel').addEventListener('click', async (evento) => {
    const botonCancelar = evento.target.closest('[data-cancelar-pedido]');
    if (!botonCancelar) return;

    if (!confirm('¿Seguro que querés cancelar este pedido?')) return;

    const idPedido = botonCancelar.dataset.cancelarPedido;
    botonCancelar.disabled = true;

    const { error } = await supabaseCliente
        .from('pedidos')
        .update({ estado: 'cancelado' })
        .eq('id', idPedido);

    if (error) {
        alert('No pudimos cancelar el pedido. Intentá de nuevo.');
        botonCancelar.disabled = false;
        return;
    }

    await supabaseCliente.from('historial_pedidos').insert({
        pedido_id: idPedido,
        estado: 'cancelado',
        cambiado_por: usuarioActualId,
        comentario: 'Cancelado por el vendedor'
    });

    await cargarPedidosPanel();
});

document.getElementById('lista-pedidos-panel').addEventListener('click', (evento) => {
    const botonChat = evento.target.closest('[data-chat-cliente]');
    if (!botonChat) return;
    window.location.href = `chat.html?usuario=${botonChat.dataset.chatCliente}`;
});

const etiquetasFrecuenciaPanel = {
    semanal: 'Semanal',
    quincenal: 'Quincenal',
    mensual: 'Mensual'
};

const etiquetasEstadoSuscripcionPanel = {
    activa: 'Activa',
    pausada: 'Pausada',
    cancelada: 'Cancelada'
};

function formatearFechaPanel(valor) {
    if (!valor) {
        return '';
    }

    return new Date(`${valor}T00:00:00`).toLocaleDateString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
}

function diasHastaFechaPanel(valor) {
    if (!valor) {
        return null;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaObjetivo = new Date(`${valor}T00:00:00`);

    return Math.round((fechaObjetivo - hoy) / (1000 * 60 * 60 * 24));
}

async function cargarSuscripcionesPanel() {
    const estadoVacio = document.getElementById('estado-suscripciones-panel');

    const { data, error } = await supabaseCliente
        .from('suscripciones')
        .select(`
            id, cantidad, envases_devueltos, frecuencia, proxima_entrega, estado,
            metodo_pago, pagada_hasta,
            direccion_calle, direccion_numero, direccion_ciudad, direccion_referencia,
            usuarios ( nombre, apellido, telefono ),
            productos ( nombre, capacidad_litros )
        `)
        .eq('distribuidora_id', distribuidoraActual.id)
        .order('proxima_entrega', { ascending: true });

    if (error) {
        estadoVacio.textContent = 'No pudimos cargar las suscripciones. Recargá la página.';
        estadoVacio.classList.remove('oculto');
        return;
    }

    suscripcionesDelPanel = data || [];

    const { data: repartidores } = await supabaseCliente.rpc('obtener_repartidores_suscripciones', {
        p_distribuidora_id: distribuidoraActual.id
    });

    repartidoresPorSuscripcion = {};
    (repartidores || []).forEach((fila) => {
        repartidoresPorSuscripcion[fila.suscripcion_id] = fila;
    });

    renderizarSuscripcionesPanel();
}

function renderizarSuscripcionesPanel() {
    const estadoVacio = document.getElementById('estado-suscripciones-panel');
    const lista = document.getElementById('lista-suscripciones-panel');
    const filtro = document.getElementById('filtro-estado-suscripciones').value;

    const suscripcionesFiltradas = suscripcionesDelPanel.filter((suscripcion) => {
        if (filtro === 'todas') return true;
        if (filtro === 'activa_pausada') return suscripcion.estado === 'activa' || suscripcion.estado === 'pausada';
        return suscripcion.estado === filtro;
    });

    if (suscripcionesFiltradas.length === 0) {
        lista.innerHTML = '';
        estadoVacio.textContent = suscripcionesDelPanel.length === 0
            ? 'Todavía ningún cliente tiene una suscripción activa con tu distribuidora.'
            : 'No hay suscripciones con este filtro.';
        estadoVacio.classList.remove('oculto');
        return;
    }

    estadoVacio.classList.add('oculto');

    lista.innerHTML = suscripcionesFiltradas.map((suscripcion) => {
        const cliente = suscripcion.usuarios;
        const producto = suscripcion.productos;
        const nombreCliente = `${cliente?.nombre || ''} ${cliente?.apellido || ''}`.trim() || 'Cliente';
        const nombreRepartidor = repartidoresPorSuscripcion[suscripcion.id]?.repartidor || '';

        const direccion = [
            `${suscripcion.direccion_calle || ''} ${suscripcion.direccion_numero || ''}`.trim(),
            suscripcion.direccion_ciudad,
            suscripcion.direccion_referencia ? `Ref: ${suscripcion.direccion_referencia}` : ''
        ].filter(Boolean).join(', ');

        let proximaEntregaHtml = '';
        if (suscripcion.estado !== 'cancelada') {
            const dias = diasHastaFechaPanel(suscripcion.proxima_entrega);
            let claseDias = '';
            let textoDias = '';

            if (dias !== null) {
                if (dias < 0) {
                    claseDias = 'vencida';
                    textoDias = ' (atrasada)';
                } else if (dias === 0) {
                    claseDias = 'vencida';
                    textoDias = ' (hoy)';
                } else if (dias <= 3) {
                    claseDias = 'proxima';
                    textoDias = ` (en ${dias} día${dias === 1 ? '' : 's'})`;
                }
            }

            proximaEntregaHtml = `
                <p class="tarjeta-producto-panel-descripcion">
                    Próxima entrega:
                    <span class="proxima-entrega-suscripcion ${claseDias}">
                        ${formatearFechaPanel(suscripcion.proxima_entrega)}${textoDias}
                    </span>
                </p>
            `;
        }

        return `
            <article class="tarjeta-producto-panel">
                <div class="tarjeta-producto-panel-superior">
                    <h3>${escaparHtml(nombreCliente)}</h3>
                    <span class="etiqueta-estado-producto ${suscripcion.estado}">
                        ${etiquetasEstadoSuscripcionPanel[suscripcion.estado] || suscripcion.estado}
                    </span>
                </div>
                ${cliente?.telefono ? `<p class="tarjeta-producto-panel-descripcion">Tel: ${escaparHtml(cliente.telefono)}</p>` : ''}
                <p class="tarjeta-producto-panel-descripcion">
                    ${escaparHtml(producto?.nombre || 'Producto')} (${producto?.capacidad_litros || '?'}L) x${suscripcion.cantidad}
                    — ${etiquetasFrecuenciaPanel[suscripcion.frecuencia] || suscripcion.frecuencia}
                </p>
                <p class="tarjeta-producto-panel-descripcion">${escaparHtml(direccion)}</p>
                ${suscripcion.envases_devueltos > 0
                ? `<p class="tarjeta-producto-panel-descripcion">Devuelve ${suscripcion.envases_devueltos} envase(s) por entrega</p>`
                : ''}
                ${proximaEntregaHtml}
                ${suscripcion.estado !== 'cancelada'
                ? `<p class="tarjeta-producto-panel-descripcion">Repartidor: <strong class="${!nombreRepartidor && (diasHastaFechaPanel(suscripcion.proxima_entrega) ?? 1) <= 0 ? 'texto-sin-asignar' : ''}">${nombreRepartidor ? escaparHtml(nombreRepartidor) : 'Sin asignar'}</strong></p>`
                : ''}
                <p class="tarjeta-producto-panel-descripcion">
                    Pago: ${suscripcion.metodo_pago === 'transferencia'
                ? `Transferencia${suscripcion.pagada_hasta ? ` · paga hasta ${formatearFechaPanel(suscripcion.pagada_hasta)}` : ''}`
                : 'Efectivo'}
                </p>
                ${suscripcion.estado !== 'cancelada'
                ? `<div class="tarjeta-producto-panel-acciones">
                       <button type="button" class="btn btn-secundario btn-peligro btn-chico" data-cancelar-suscripcion="${suscripcion.id}">Cancelar suscripción</button>
                   </div>`
                : ''}
            </article>
        `;
    }).join('');
}

document.getElementById('filtro-estado-suscripciones').addEventListener('change', renderizarSuscripcionesPanel);

document.getElementById('lista-suscripciones-panel').addEventListener('click', async (evento) => {
    const boton = evento.target.closest('[data-cancelar-suscripcion]');

    if (!boton) {
        return;
    }

    const motivo = prompt(
        'Vas a cancelar esta suscripción. Se anulan las entregas pendientes y se avisa al cliente.\n\nEscribí el motivo (el cliente lo va a ver):'
    );

    if (motivo === null) {
        return;
    }

    if (!motivo.trim()) {
        alert('Escribí un motivo para el cliente.');
        return;
    }

    boton.disabled = true;

    const { error } = await supabaseCliente.rpc('cancelar_suscripcion_vendedor', {
        p_suscripcion_id: boton.dataset.cancelarSuscripcion,
        p_motivo: motivo.trim()
    });

    if (error) {
        alert('No pudimos cancelar la suscripción. Intentá de nuevo.');
        boton.disabled = false;
        return;
    }

    await cargarSuscripcionesPanel();
});

async function cargarTableroEntregas() {
    const estadoVacio = document.getElementById('estado-tablero');

    const { data: miembros, error: errorMiembros } = await supabaseCliente
        .from('miembros_distribuidoras')
        .select('id, usuario_id, usuarios!usuario_id ( nombre, apellido )')
        .eq('distribuidora_id', distribuidoraActual.id)
        .eq('rol', 'repartidor')
        .eq('estado', 'activo')
        .eq('disponible', true)
        .order('creado_en', { ascending: true });

    const { data: pendientes, error: errorPendientes } = await supabaseCliente
        .from('pedidos')
        .select(`
            id, suscripcion_id, fecha_entrega, direccion_calle, direccion_numero, direccion_ciudad,
            usuarios!pedidos_cliente_id_fkey ( nombre, apellido ),
            detalles_pedidos ( cantidad, productos ( nombre ) )
        `)
        .eq('distribuidora_id', distribuidoraActual.id)
        .eq('estado', 'pendiente')
        .order('creado_en', { ascending: true });

    const { data: entregas, error: errorEntregas } = await supabaseCliente
        .from('entregas')
        .select(`
            id, estado, repartidor_id,
            pedidos!inner ( id, direccion_calle, direccion_numero, direccion_ciudad, distribuidora_id,
                usuarios!pedidos_cliente_id_fkey ( nombre, apellido ),
                detalles_pedidos ( cantidad, productos ( nombre ) ) )
        `)
        .eq('pedidos.distribuidora_id', distribuidoraActual.id)
        .in('estado', ['asignada', 'en_camino']);

    if (errorMiembros || errorPendientes || errorEntregas) {
        estadoVacio.textContent = 'No pudimos cargar el tablero. Recargá la página.';
        estadoVacio.classList.remove('oculto');
        return;
    }

    estadoVacio.classList.add('oculto');
    repartidoresTablero = miembros || [];
    pedidosSinAsignar = pendientes || [];
    entregasTablero = entregas || [];

    mapaEntregaPorPedido = {};
    entregasTablero.forEach((entrega) => {
        mapaEntregaPorPedido[entrega.pedidos.id] = entrega.id;
    });

    renderizarTablero();
}

function resumenItemsPedido(pedido) {
    return (pedido.detalles_pedidos || [])
        .map((item) => `${item.cantidad}x ${item.productos?.nombre || 'Producto'}`)
        .join(', ');
}

function diasDeAtrasoPedido(pedido) {
    if (!pedido.suscripcion_id || !pedido.fecha_entrega) {
        return null;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const [anio, mes, dia] = pedido.fecha_entrega.split('-').map(Number);

    return Math.round((hoy - new Date(anio, mes - 1, dia)) / 86400000);
}

function claseUrgenciaPedido(pedido) {
    const dias = diasDeAtrasoPedido(pedido);

    if (dias === null) {
        return '';
    }

    return dias >= 0 ? 'pedido-urgente' : 'pedido-programado';
}

function etiquetaSuscripcionPedido(pedido) {
    const dias = diasDeAtrasoPedido(pedido);

    if (dias === null) {
        return '';
    }

    if (dias > 0) {
        return `<span class="etiqueta-urgencia">⚠ Suscripción atrasada (${dias} día${dias === 1 ? '' : 's'})</span>`;
    }

    if (dias === 0) {
        return '<span class="etiqueta-urgencia">⚠ Suscripción: entrega HOY</span>';
    }

    return `<span class="etiqueta-programada">Suscripción · ${formatearFechaPanel(pedido.fecha_entrega)}</span>`;
}

function puntajeUrgenciaPedido(pedido) {
    const dias = diasDeAtrasoPedido(pedido);
    return dias !== null && dias >= 0 ? dias + 1 : 0;
}

function pintarInsigniaAsignar(cantidad) {
    const insignia = document.getElementById('insignia-asignar');

    if (!insignia) {
        return;
    }

    insignia.textContent = cantidad;
    insignia.hidden = cantidad === 0;
}

async function cargarInsigniaAsignar() {
    if (!distribuidoraActual) {
        return;
    }

    const { count } = await supabaseCliente
        .from('pedidos')
        .select('id', { count: 'exact', head: true })
        .eq('distribuidora_id', distribuidoraActual.id)
        .eq('estado', 'pendiente')
        .not('suscripcion_id', 'is', null)
        .lte('fecha_entrega', new Date().toLocaleDateString('en-CA'));

    pintarInsigniaAsignar(count || 0);
}

function renderizarTablero() {
    pintarInsigniaAsignar(pedidosSinAsignar.filter((pedido) => puntajeUrgenciaPedido(pedido) > 0).length);
    const tablero = document.getElementById('tablero-entregas');
    tablero.innerHTML = '';

    const seleccionadosSinAsignar = pedidosSinAsignar.filter((pedido) => pedidosSeleccionados.has(pedido.id)).length;

    const columnaSinAsignar = document.createElement('div');
    columnaSinAsignar.className = 'columna-tablero';
    columnaSinAsignar.dataset.zonaDrop = 'sin-asignar';
    columnaSinAsignar.innerHTML = `
        <div class="columna-tablero-titulo">
            <span>Sin asignar</span>
            <span class="etiqueta-estado-producto inactivo">
                ${seleccionadosSinAsignar > 0 ? seleccionadosSinAsignar + ' sel.' : pedidosSinAsignar.length}
            </span>
        </div>
        <div class="zona-drop">
            ${[...pedidosSinAsignar].sort((a, b) => puntajeUrgenciaPedido(b) - puntajeUrgenciaPedido(a)).map((pedido) => `
                <div class="tarjeta-pedido-tablero tarjeta-seleccionable ${pedidosSeleccionados.has(pedido.id) ? 'seleccionada' : ''} ${claseUrgenciaPedido(pedido)}"
                    draggable="true" data-pedido-click="${pedido.id}">
                    ${etiquetaSuscripcionPedido(pedido)}
                    <strong>${escaparHtml(pedido.usuarios?.nombre || '')} ${escaparHtml(pedido.usuarios?.apellido || '')}</strong>
                    <span>${escaparHtml(pedido.direccion_calle)} ${escaparHtml(pedido.direccion_numero || '')}, ${escaparHtml(pedido.direccion_ciudad)}</span>
                    <span>${escaparHtml(resumenItemsPedido(pedido))}</span>
                </div>
            `).join('')}
        </div>
    `;
    tablero.appendChild(columnaSinAsignar);

    repartidoresTablero.forEach((miembro) => {
        const entregasDelRepartidor = entregasTablero.filter(
            (entrega) => entrega.repartidor_id === miembro.usuario_id
        );

        const seleccionadosEnColumna = entregasDelRepartidor.filter(
            (entrega) => pedidosSeleccionados.has(entrega.pedidos.id)
        ).length;

        const columna = document.createElement('div');
        columna.className = 'columna-tablero';
        columna.dataset.zonaDrop = 'repartidor';
        columna.dataset.repartidorId = miembro.usuario_id;

        const repartidorEnRuta = entregasDelRepartidor.some((entrega) => entrega.estado === 'en_camino');

        columna.innerHTML = `
            <div class="columna-tablero-titulo">
                <span>${escaparHtml(miembro.usuarios?.nombre || '')} ${escaparHtml(miembro.usuarios?.apellido || '')}</span>
                <span class="etiqueta-estado-producto inactivo">
                    ${seleccionadosEnColumna > 0 ? seleccionadosEnColumna + ' sel.' : entregasDelRepartidor.length}
                </span>
            </div>
            ${entregasDelRepartidor.length ? `<button type="button" class="btn btn-secundario btn-chico" data-imprimir-ruta="${miembro.usuario_id}">Imprimir hoja de ruta (PDF)</button>` : ''}
            ${repartidorEnRuta ? '<p class="aviso-repartidor-en-ruta">En ruta, no le puedes asignar pedidos ahora mismo</p>' : ''}
            <div class="zona-drop">
                ${entregasDelRepartidor.map((entrega) => {
            const puedeMoverse = entrega.estado === 'asignada';
            const nombreCliente = `${entrega.pedidos.usuarios?.nombre || ''} ${entrega.pedidos.usuarios?.apellido || ''}`;
            const direccion = `${entrega.pedidos.direccion_calle} ${entrega.pedidos.direccion_numero || ''}, ${entrega.pedidos.direccion_ciudad}`;
            const etiqueta = `
                        <span class="etiqueta-estado-producto ${entrega.estado === 'en_camino' ? 'en_camino' : 'asignada'}">
                            ${entrega.estado === 'en_camino' ? 'Enviado (no se puede mover)' : 'Asignada'}
                        </span>
                    `;

            const items = `<span>${escaparHtml(resumenItemsPedido(entrega.pedidos))}</span>`;

            if (!puedeMoverse) {
                return `
                            <div class="tarjeta-pedido-tablero">
                                <strong>${escaparHtml(nombreCliente)}</strong>
                                <span>${escaparHtml(direccion)}</span>
                                ${items}
                                ${etiqueta}
                            </div>
                        `;
            }

            return `
                        <div class="tarjeta-pedido-tablero tarjeta-seleccionable ${pedidosSeleccionados.has(entrega.pedidos.id) ? 'seleccionada' : ''}"
                            draggable="true" data-pedido-click="${entrega.pedidos.id}">
                            <strong>${escaparHtml(nombreCliente)}</strong>
                            <span>${escaparHtml(direccion)}</span>
                            ${items}
                            ${etiqueta}
                        </div>
                    `;
        }).join('')}
            </div>
        `;

        tablero.appendChild(columna);
    });

    if (repartidoresTablero.length === 0) {
        const aviso = document.createElement('p');
        aviso.className = 'estado-productos-panel';
        aviso.textContent = 'No tenés repartidores disponibles. Activalos desde la pestaña Repartidores.';
        tablero.appendChild(aviso);
    }

    habilitarDragAndDrop();
}

async function moverPedidoEnTablero(datos, idRepartidorDestino, idRuta, orden) {
    const { pedidoId, entregaId } = datos;
    let error;

    if (idRepartidorDestino === null) {
        if (entregaId) {
            ({ error } = await supabaseCliente
                .from('entregas')
                .update({ repartidor_id: null, ruta_id: null, orden: null })
                .eq('id', entregaId));
        }
        if (!error) {
            ({ error } = await supabaseCliente
                .from('pedidos')
                .update({ estado: 'pendiente' })
                .eq('id', pedidoId));
        }
    } else if (entregaId) {
        ({ error } = await supabaseCliente
            .from('entregas')
            .update({ repartidor_id: idRepartidorDestino, ruta_id: idRuta || null, orden: orden ?? null })
            .eq('id', entregaId));

        if (!error) {
            ({ error } = await supabaseCliente
                .from('pedidos')
                .update({ estado: 'asignado' })
                .eq('id', pedidoId));
        }
    } else {
        ({ error } = await supabaseCliente
            .from('entregas')
            .insert({ pedido_id: pedidoId, repartidor_id: idRepartidorDestino, ruta_id: idRuta || null, orden: orden ?? null }));
    }

    return !error;
}

async function moverGrupoEnTablero(items, idRepartidorDestino) {
    if (idRepartidorDestino) {
        const repartidorEnRuta = entregasTablero.some(
            (entrega) => entrega.repartidor_id === idRepartidorDestino && entrega.estado === 'en_camino'
        );

        if (repartidorEnRuta) {
            alert('Este repartidor ya salió a repartir. No podés asignarle más pedidos hasta que vuelva.');
            return;
        }
    }

    let idRuta = null;

    if (items.length > 1 && idRepartidorDestino) {
        const { data: ruta, error: errorRuta } = await supabaseCliente
            .from('rutas')
            .insert({ distribuidora_id: distribuidoraActual.id, repartidor_id: idRepartidorDestino })
            .select('id')
            .single();

        if (errorRuta) {
            alert('No pudimos crear la ruta. Intentá de nuevo.');
            return;
        }

        idRuta = ruta.id;
    }

    let huboError = false;

    for (let indice = 0; indice < items.length; indice++) {
        const ok = await moverPedidoEnTablero(items[indice], idRepartidorDestino, idRuta, indice);
        if (!ok) huboError = true;
    }

    if (huboError) {
        alert('Algunos pedidos no se pudieron mover. Revisá el tablero.');
    }

    pedidosSeleccionados.clear();
    await cargarTableroEntregas();
    if (seccionPedidosCargada) cargarPedidosPanel();
}

function habilitarDragAndDrop() {
    document.querySelectorAll('[data-pedido-click]').forEach((tarjeta) => {
        tarjeta.addEventListener('click', () => {
            const id = tarjeta.dataset.pedidoClick;
            if (pedidosSeleccionados.has(id)) {
                pedidosSeleccionados.delete(id);
            } else {
                pedidosSeleccionados.add(id);
            }
            renderizarTablero();
        });

        tarjeta.addEventListener('dragstart', (evento) => {
            const id = tarjeta.dataset.pedidoClick;
            const idsAMover = pedidosSeleccionados.size > 1 && pedidosSeleccionados.has(id)
                ? Array.from(pedidosSeleccionados)
                : [id];

            const payload = idsAMover.map((idPedido) => ({
                pedidoId: idPedido,
                entregaId: mapaEntregaPorPedido[idPedido] || null
            }));

            evento.dataTransfer.setData('text/plain', JSON.stringify(payload));
        });
    });

    document.querySelectorAll('.columna-tablero').forEach((columna) => {
        columna.addEventListener('dragover', (evento) => {
            evento.preventDefault();
            columna.classList.add('zona-sobre-drop');
        });

        columna.addEventListener('dragleave', () => {
            columna.classList.remove('zona-sobre-drop');
        });

        columna.addEventListener('drop', (evento) => {
            evento.preventDefault();
            columna.classList.remove('zona-sobre-drop');

            const textoDrag = evento.dataTransfer.getData('text/plain');
            if (!textoDrag) return;

            const items = JSON.parse(textoDrag);
            const destino = columna.dataset.zonaDrop === 'repartidor'
                ? columna.dataset.repartidorId
                : null;

            moverGrupoEnTablero(items, destino);
        });
    });
}

const configuracionEstados = {
    pendiente_aprobacion: {
        clase: 'aviso-pendiente',
        titulo: 'Tu distribuidora está pendiente de aprobación',
        texto: 'Podés cargar tus productos mientras tanto, pero no van a verse en el catálogo público hasta que un administrador la apruebe.'
    },
    suspendida: {
        clase: 'aviso-peligro',
        titulo: 'Tu distribuidora está suspendida',
        texto: 'No podés recibir pedidos nuevos mientras esté en este estado. Contactá a soporte para más información.'
    },
    rechazada: {
        clase: 'aviso-peligro',
        titulo: 'Tu solicitud fue rechazada',
        texto: 'Contactá a soporte si creés que se trata de un error.'
    }
};

function renderizarAvisoEstado(estado) {
    const avisoEstado = document.getElementById('aviso-estado');
    const configuracion = configuracionEstados[estado];

    if (!configuracion) {
        avisoEstado.classList.add('oculto');
        return;
    }

    avisoEstado.classList.remove('oculto', 'aviso-pendiente', 'aviso-peligro');
    avisoEstado.classList.add(configuracion.clase);
    document.getElementById('aviso-estado-titulo').textContent = configuracion.titulo;
    document.getElementById('aviso-estado-texto').textContent = configuracion.texto;
}

async function inicializarPanel() {
    const { data: { session } } = await supabaseCliente.auth.getSession();

    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    usuarioActualId = session.user.id;

    const { data: perfil } = await supabaseCliente
        .from('usuarios')
        .select('rol')
        .eq('id', session.user.id)
        .single();

    if (perfil?.rol !== 'vendedor') {
        window.location.href = 'productos.html';
        return;
    }

    const { data: membresia, error: errorMembresia } = await supabaseCliente
        .from('miembros_distribuidoras')
        .select(`
            distribuidoras (
                id, nombre, descripcion, estado, calle, numero, ciudad, provincia,
                acepta_efectivo, acepta_transferencia, alias, cbu, titular_cuenta, foto_url, cupo_diario, max_bidones_por_pedido, latitud, longitud
            )
        `)
        .eq('usuario_id', session.user.id)
        .eq('rol', 'vendedor')
        .eq('estado', 'activo')
        .single();

    if (errorMembresia || !membresia?.distribuidoras) {
        document.getElementById('panel-cargando').innerHTML =
            '<p>No pudimos encontrar tu distribuidora. Contactá a soporte.</p>';
        return;
    }

    distribuidoraActual = membresia.distribuidoras;

    document.getElementById('nombre-distribuidora').textContent = distribuidoraActual.nombre;
    renderizarAvisoEstado(distribuidoraActual.estado);

    document.getElementById('panel-cargando').classList.add('oculto');
    document.getElementById('panel-header').classList.remove('oculto');
    document.getElementById('panel-main').classList.remove('oculto');

    cargarProductosPanel();
    precargarFormularioPerfil();
    document.getElementById('cupo-diario').value = distribuidoraActual.cupo_diario ?? '';
    document.getElementById('max-bidones').value = distribuidoraActual.max_bidones_por_pedido ?? '';
}

function precargarFormularioPerfil() {
    cargarUbicacionNegocio(distribuidoraActual);
    document.getElementById('descripcion-negocio').value = distribuidoraActual.descripcion || '';
    document.getElementById('calle-perfil').value = distribuidoraActual.calle || '';
    document.getElementById('numero-perfil').value = distribuidoraActual.numero || '';
    document.getElementById('ciudad-perfil').value = distribuidoraActual.ciudad || '';
    document.getElementById('provincia-perfil').value = distribuidoraActual.provincia || '';
    document.getElementById('acepta-efectivo').checked = Boolean(distribuidoraActual.acepta_efectivo);
    document.getElementById('acepta-transferencia').checked = Boolean(distribuidoraActual.acepta_transferencia);
    document.getElementById('alias-transferencia').value = distribuidoraActual.alias || '';
    document.getElementById('cbu-transferencia').value = distribuidoraActual.cbu || '';
    document.getElementById('titular-cuenta').value = distribuidoraActual.titular_cuenta || '';

    document.getElementById('campo-alias').classList.toggle('oculto', !distribuidoraActual.acepta_transferencia);
    document.getElementById('campo-cbu').classList.toggle('oculto', !distribuidoraActual.acepta_transferencia);
    document.getElementById('campo-titular').classList.toggle('oculto', !distribuidoraActual.acepta_transferencia);

    if (distribuidoraActual.foto_url) {
        const vistaFoto = document.getElementById('panel-foto-vista');
        vistaFoto.innerHTML = `<img src="${distribuidoraActual.foto_url}" alt="Foto de la distribuidora">`;
        vistaFoto.classList.add('tiene-foto');
    } if (distribuidoraActual.foto_url) {
        const vistaFoto = document.getElementById('panel-foto-vista');
        vistaFoto.innerHTML = `<img src="${distribuidoraActual.foto_url}" alt="Foto de la distribuidora">`;
        vistaFoto.classList.add('tiene-foto');
    }
}

function abrirPestanaDesdeHash() {
    const nombre = window.location.hash.replace('#', '');

    if (nombre) {
        document.querySelector(`.panel-pestana[data-pestana="${nombre}"]`)?.click();
    }
}

window.addEventListener('hashchange', abrirPestanaDesdeHash);
let viendoResenas = false;

function alternarVistaResenas(mostrarResenas) {
    viendoResenas = mostrarResenas;
    document.getElementById('formulario-perfil').hidden = mostrarResenas;
    document.getElementById('bloque-resenas-perfil').hidden = !mostrarResenas;

    const boton = document.getElementById('enlace-ver-resenas');

    if (boton) {
        boton.textContent = mostrarResenas ? 'Ver perfil' : 'Ver reseñas';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function textoEstrellasResena(valor) {
    const llenas = Math.round(valor);
    return '★'.repeat(llenas) + '☆'.repeat(5 - llenas);
}

async function cargarResenasPanel() {
    if (!distribuidoraActual) {
        return;
    }

    const { data, error } = await supabaseCliente
        .from('resenas')
        .select('id, estrellas_distribuidora, estrellas_repartidor, comentario, creado_en')
        .eq('distribuidora_id', distribuidoraActual.id)
        .order('creado_en', { ascending: false });

    const resumen = document.getElementById('resumen-resenas-panel');
    const lista = document.getElementById('lista-resenas-panel');
    const perfil = document.getElementById('calificacion-perfil');

    if (error) {
        resumen.innerHTML = '';
        lista.innerHTML = '<p class="vacio-resenas-panel">No pudimos cargar las reseñas.</p>';
        return;
    }

    const resenas = data || [];

    if (resenas.length === 0) {
        perfil.innerHTML = '<span class="calificacion-vacia">Todavía no tenés reseñas.</span>';
        resumen.innerHTML = '';
        lista.innerHTML = '<p class="vacio-resenas-panel">Todavía no tenés reseñas. Aparecen cuando un cliente califica un pedido entregado.</p>';
        return;
    }

    const promedio = resenas.reduce((suma, r) => suma + r.estrellas_distribuidora, 0) / resenas.length;
    const promedioTexto = promedio.toFixed(1).replace('.', ',');
    const cantidadTexto = `${resenas.length} ${resenas.length === 1 ? 'reseña' : 'reseñas'}`;

    perfil.innerHTML = `
        <span class="calificacion-estrellas">${textoEstrellasResena(promedio)}</span>
        <strong>${promedioTexto}</strong>
        <span>· ${cantidadTexto}</span>
        <button type="button" class="enlace-resenas" id="enlace-ver-resenas">${viendoResenas ? 'Ver perfil' : 'Ver reseñas'}</button>
    `;

    document.getElementById('enlace-ver-resenas').addEventListener('click', () => {
        alternarVistaResenas(!viendoResenas);
    });

    const barras = [5, 4, 3, 2, 1].map((estrellas) => {
        const cantidad = resenas.filter((r) => r.estrellas_distribuidora === estrellas).length;
        const porcentaje = Math.round((cantidad / resenas.length) * 100);

        return `
            <div class="barra-resena">
                <span>${estrellas} ★</span>
                <div class="barra-resena-fondo"><div class="barra-resena-relleno" style="width:${porcentaje}%"></div></div>
                <span>${cantidad}</span>
            </div>
        `;
    }).join('');

    resumen.innerHTML = `
        <div class="resumen-resenas-promedio">
            <strong>${promedioTexto}</strong>
            <span class="calificacion-estrellas">${textoEstrellasResena(promedio)}</span>
            <span>${cantidadTexto}</span>
        </div>
        <div class="resumen-resenas-barras">${barras}</div>
    `;

    lista.innerHTML = resenas.map((r) => `
        <article class="tarjeta-resena-panel">
            <div class="cabecera-resena-panel">
                <span class="calificacion-estrellas">${textoEstrellasResena(r.estrellas_distribuidora)}</span>
                <span class="fecha-resena-panel">${formatearFechaCobro(r.creado_en)}</span>
            </div>
            ${r.comentario ? `<p class="comentario-resena-panel">${escaparHtml(r.comentario)}</p>` : '<p class="comentario-resena-panel sin-comentario">Sin comentario.</p>'}
            ${r.estrellas_repartidor ? `<p class="repartidor-resena-panel">Repartidor: <span class="calificacion-estrellas">${textoEstrellasResena(r.estrellas_repartidor)}</span></p>` : ''}
        </article>
    `).join('');
}

inicializarPanel().then(() => {
    cargarInsigniaAsignar();
    cargarResenasPanel();
    abrirPestanaDesdeHash();
});

const pestanas = document.querySelectorAll('.panel-pestana');
const secciones = {
    productos: document.getElementById('seccion-productos'),
    pedidos: document.getElementById('seccion-pedidos'),
    asignar: document.getElementById('seccion-asignar'),
    repartidores: document.getElementById('seccion-repartidores'),
    suscripciones: document.getElementById('seccion-suscripciones'),
    perfil: document.getElementById('seccion-perfil'),
    publicidad: document.getElementById('seccion-publicidad'),
    cobros: document.getElementById('seccion-cobros'),
    rutas: document.getElementById('seccion-rutas')
};
let seccionRepartidoresCargada = false;
let seccionPedidosCargada = false;
let seccionTableroCargada = false;
let seccionSuscripcionesCargada = false;
let seccionListaSuscripcionesCargada = false;
let seccionPublicidadCargada = false;
let mesCalendarioActual = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let suscripcionesDelPanel = [];
let repartidoresPorSuscripcion = {};
let pedidosSinAsignar = [];
let mapaEntregaPorPedido = {};
let pedidosSeleccionados = new Set();

pestanas.forEach((pestana) => {
    pestana.addEventListener('click', () => {
        pestanas.forEach((otra) => {
            otra.classList.remove('activa');
            otra.setAttribute('aria-selected', 'false');
        });

        pestana.classList.add('activa');
        pestana.setAttribute('aria-selected', 'true');

        Object.entries(secciones).forEach(([nombre, seccion]) => {
            seccion.classList.toggle('oculto', nombre !== pestana.dataset.pestana);
        });

        if (pestana.dataset.pestana === 'perfil') {
            mostrarMapaNegocio();
        }

        if (pestana.dataset.pestana === 'repartidores' && !seccionRepartidoresCargada) {
            seccionRepartidoresCargada = true;
            cargarRepartidores();
        }

        if (pestana.dataset.pestana === 'pedidos' && !seccionPedidosCargada) {
            seccionPedidosCargada = true;
            cargarPedidosPanel();
        }

        if (pestana.dataset.pestana === 'asignar') {
            seccionTableroCargada = true;
            cargarTableroEntregas();
        }

        if (pestana.dataset.pestana === 'suscripciones' && !seccionSuscripcionesCargada) {
            seccionSuscripcionesCargada = true;
            cargarCalendario();
        }

        if (pestana.dataset.pestana === 'cobros') {
            cargarCobros();
        }

        if (pestana.dataset.pestana === 'rutas') {
            window.cargarHojasRuta();
        }

        if (pestana.dataset.pestana === 'publicidad' && !seccionPublicidadCargada) {
            seccionPublicidadCargada = true;
            cargarAnunciosPanel();
        }
    });
});

let cobrosCargados = [];

function formatearFechaCobro(valor) {
    return new Date(valor).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function renderizarCobros() {
    const cuerpo = document.getElementById('lista-cobros');
    const resumen = document.getElementById('resumen-cobros');
    const estado = document.getElementById('estado-cobros');

    if (cobrosCargados.length === 0) {
        cuerpo.innerHTML = '';
        resumen.innerHTML = '';
        estado.textContent = 'Todavía no tenés cobros por transferencia.';
        estado.classList.remove('oculto');
        return;
    }

    estado.classList.add('oculto');

    const sumar = (filas) => filas.reduce((total, fila) => total + Number(fila.neto || 0), 0);
    const totalPagado = sumar(cobrosCargados.filter((c) => c.pagado));
    const totalPendiente = sumar(cobrosCargados.filter((c) => !c.pagado));
    const totalComision = cobrosCargados.reduce((total, c) => total + Number(c.comision || 0), 0);

    resumen.innerHTML = `
        <div class="tarjeta-resumen-cobro"><span>Ya cobrado</span><strong>${formatearPrecio(totalPagado)}</strong></div>
        <div class="tarjeta-resumen-cobro"><span>Pendiente de pago</span><strong>${formatearPrecio(totalPendiente)}</strong></div>
        <div class="tarjeta-resumen-cobro"><span>Comisión AquaTrack</span><strong>${formatearPrecio(totalComision)}</strong></div>
    `;

    cuerpo.innerHTML = cobrosCargados.map((cobro) => `
        <tr>
            <td>${formatearFechaCobro(cobro.fecha)}</td>
            <td>${cobro.cantidad_pedidos}</td>
            <td>${formatearPrecio(cobro.bruto)}</td>
            <td>${formatearPrecio(cobro.comision)} (${Number(cobro.comision_porcentaje)}%)</td>
            <td><strong>${formatearPrecio(cobro.neto)}</strong></td>
            <td>${cobro.pagado
            ? `<span class="etiqueta-estado-producto activo">Pagado el ${formatearFechaCobro(cobro.pagado_en)}</span>`
            : '<span class="etiqueta-estado-producto pendiente">Pendiente</span>'}</td>
            <td>${cobro.comprobante_liquidacion_url
            ? `<a href="${escaparHtml(cobro.comprobante_liquidacion_url)}" target="_blank" rel="noopener">Ver comprobante</a>`
            : '—'}</td>
        </tr>
    `).join('');
}

async function cargarCobros() {
    const estado = document.getElementById('estado-cobros');

    const { data, error } = await supabaseCliente.rpc('obtener_cobros_distribuidora', {
        p_distribuidora_id: distribuidoraActual.id
    });

    if (error) {
        estado.textContent = 'No pudimos cargar los cobros. Recargá la página.';
        estado.classList.remove('oculto');
        return;
    }

    cobrosCargados = data || [];
    renderizarCobros();
}

document.getElementById('btn-exportar-cobros').addEventListener('click', () => {
    if (cobrosCargados.length === 0) {
        alert('No hay cobros para exportar.');
        return;
    }

    const filas = cobrosCargados.map((cobro) => ({
        'Fecha': formatearFechaCobro(cobro.fecha),
        'Pedidos': cobro.cantidad_pedidos,
        'Monto bruto': Number(cobro.bruto),
        'Comisión (%)': Number(cobro.comision_porcentaje),
        'Comisión ($)': Number(cobro.comision),
        'Monto neto': Number(cobro.neto),
        'Estado': cobro.pagado ? 'Pagado' : 'Pendiente',
        'Fecha de pago': cobro.pagado_en ? formatearFechaCobro(cobro.pagado_en) : ''
    }));

    const hoja = XLSX.utils.json_to_sheet(filas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Cobros');
    XLSX.writeFile(libro, `aquatrack-cobros-${distribuidoraActual.nombre}.xlsx`);
});

const modalProducto = document.getElementById('modal-producto');
const btnAgregarProducto = document.getElementById('btn-agregar-producto');
const btnCerrarModalProducto = document.getElementById('boton-cerrar-modal-producto');

const formularioProducto = document.getElementById('formulario-producto');
const btnGuardarProducto = document.getElementById('btn-guardar-producto');
const inputFotoProducto = document.getElementById('foto-producto');
const vistaFotoProducto = document.getElementById('vista-foto-producto');
let productoEnEdicion = null;
let archivoFotoProducto = null;

function mostrarVistaFoto(url) {
    vistaFotoProducto.innerHTML = url
        ? `<img src="${url}" alt="Foto del producto">`
        : '<span>Sin foto</span>';
}

const checkboxEsCombo = document.getElementById('es-combo-producto');
const campoIncluyeCombo = document.getElementById('campo-incluye-combo');
const inputIncluyeCombo = document.getElementById('incluye-combo-producto');
const inputLitrosProducto = document.getElementById('litros-producto');
const campoLitrosProducto = inputLitrosProducto.closest('.campo');

function actualizarVisibilidadCombo() {
    const esCombo = checkboxEsCombo.checked;

    campoIncluyeCombo.classList.toggle('oculto', !esCombo);
    campoLitrosProducto.classList.toggle('oculto', esCombo);
    inputLitrosProducto.required = !esCombo;
}

checkboxEsCombo.addEventListener('change', actualizarVisibilidadCombo);

function abrirModalProducto(producto) {
    productoEnEdicion = producto || null;
    archivoFotoProducto = null;
    inputFotoProducto.value = '';

    document.getElementById('titulo-modal-producto').textContent =
        producto ? 'Editar producto' : 'Agregar producto';

    formularioProducto.reset();
    mostrarVistaFoto(producto?.foto_url || null);

    if (producto) {
        document.getElementById('nombre-producto').value = producto.nombre;
        document.getElementById('descripcion-producto').value = producto.descripcion || '';
        document.getElementById('litros-producto').value = producto.capacidad_litros;
        document.getElementById('precio-producto').value = producto.precio;
        document.getElementById('descuento-envase-producto').value =
            producto.descuento_por_envase || 0;
        document.getElementById('stock-producto').value = producto.stock ?? '';
        checkboxEsCombo.checked = Boolean(producto.es_combo);
        inputIncluyeCombo.value = producto.incluye_combo || '';
    } else {
        checkboxEsCombo.checked = false;
        inputIncluyeCombo.value = '';
    }

    actualizarVisibilidadCombo();
    modalProducto.classList.remove('oculto');
}

inputFotoProducto.addEventListener('change', () => {
    const archivo = inputFotoProducto.files[0];

    if (!archivo) {
        return;
    }

    archivoFotoProducto = archivo;
    mostrarVistaFoto(URL.createObjectURL(archivo));
});

async function subirFotoProducto(archivo) {
    const rutaArchivo = `${distribuidoraActual.id}/${crypto.randomUUID()}-${archivo.name}`;

    const { error: errorSubida } = await supabaseCliente.storage
        .from('productos-fotos')
        .upload(rutaArchivo, archivo);

    if (errorSubida) {
        throw new Error('No pudimos subir la foto. Probá con otra imagen.');
    }

    const { data } = supabaseCliente.storage
        .from('productos-fotos')
        .getPublicUrl(rutaArchivo);

    return data.publicUrl;
}

btnAgregarProducto.addEventListener('click', () => {
    abrirModalProducto(null);
});

btnCerrarModalProducto.addEventListener('click', () => {
    modalProducto.classList.add('oculto');
});

modalProducto.addEventListener('click', (evento) => {
    if (evento.target === modalProducto) {
        modalProducto.classList.add('oculto');
    }
});

formularioProducto.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    btnGuardarProducto.disabled = true;
    btnGuardarProducto.textContent = 'Guardando...';

    try {
        const esCombo = checkboxEsCombo.checked;

        const datosProducto = {
            distribuidora_id: distribuidoraActual.id,
            nombre: document.getElementById('nombre-producto').value.trim(),
            descripcion: document.getElementById('descripcion-producto').value.trim(),
            capacidad_litros: Number(document.getElementById('litros-producto').value) || 0,
            precio: Number(document.getElementById('precio-producto').value),
            descuento_por_envase: Number(
                document.getElementById('descuento-envase-producto').value
            ),
            es_combo: esCombo,
            incluye_combo: esCombo ? inputIncluyeCombo.value.trim() : null,
            stock: document.getElementById('stock-producto').value.trim() === ''
                ? null
                : Math.max(0, Math.floor(Number(document.getElementById('stock-producto').value)))
        };

        if (archivoFotoProducto) {
            datosProducto.foto_url = await subirFotoProducto(archivoFotoProducto);
        }

        const { error } = productoEnEdicion
            ? await supabaseCliente
                .from('productos')
                .update(datosProducto)
                .eq('id', productoEnEdicion.id)
            : await supabaseCliente
                .from('productos')
                .insert(datosProducto);

        if (error) {
            alert('No pudimos guardar el producto. Revisá los datos e intentá de nuevo.');
            return;
        }

        modalProducto.classList.add('oculto');
        await cargarProductosPanel();
    } catch (errorSubida) {
        alert(errorSubida.message || 'Ocurrió un error. Intente de nuevo.');
    } finally {
        btnGuardarProducto.disabled = false;
        btnGuardarProducto.textContent = 'Guardar producto';
    }
});

document.getElementById('lista-productos-panel').addEventListener('click', async (evento) => {
    const botonEditar = evento.target.closest('[data-editar]');

    if (botonEditar) {
        const producto = productosDelPanel.find((item) => item.id === botonEditar.dataset.editar);
        abrirModalProducto(producto);
        return;
    }

    // Activar/Desactivar producto
    const botonAlternar = evento.target.closest('[data-alternar]');

    if (botonAlternar) {
        const producto = productosDelPanel.find((item) => item.id === botonAlternar.dataset.alternar);

        if (!producto) {
            return;
        }

        botonAlternar.disabled = true;

        const { error } = await supabaseCliente
            .from('productos')
            .update({ activo: !producto.activo })
            .eq('id', producto.id);

        if (error) {
            alert('No pudimos actualizar el producto. Intentá de nuevo.');
            botonAlternar.disabled = false;
            return;
        }

        await cargarProductosPanel();
    }
});

const checkTransferencia = document.getElementById('acepta-transferencia');
const campoAlias = document.getElementById('campo-alias');
const campoCbu = document.getElementById('campo-cbu');
const campoTitular = document.getElementById('campo-titular');

checkTransferencia.addEventListener('change', () => {
    campoAlias.classList.toggle('oculto', !checkTransferencia.checked);
    campoCbu.classList.toggle('oculto', !checkTransferencia.checked);
    campoTitular.classList.toggle('oculto', !checkTransferencia.checked);
});

let temporizadorMensajePerfil;

function mostrarMensajePerfil(texto, tipo) {
    const mensaje = document.getElementById('mensaje-perfil');
    mensaje.textContent = texto;
    mensaje.className = `mensaje-estado ${tipo}`;

    clearTimeout(temporizadorMensajePerfil);

    temporizadorMensajePerfil = setTimeout(() => {
        mensaje.classList.add('oculto');
    }, 3200);
}

document.getElementById('formulario-perfil').addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const btnGuardarPerfil = document.getElementById('btn-guardar-perfil');

    const datosDistribuidora = {
        ...leerUbicacionNegocio(),
        descripcion: document.getElementById('descripcion-negocio').value.trim(),
        calle: document.getElementById('calle-perfil').value.trim(),
        numero: document.getElementById('numero-perfil').value.trim(),
        ciudad: document.getElementById('ciudad-perfil').value.trim(),
        provincia: document.getElementById('provincia-perfil').value.trim(),
        acepta_efectivo: document.getElementById('acepta-efectivo').checked,
        acepta_transferencia: checkTransferencia.checked,
        alias: document.getElementById('alias-transferencia').value.trim() || null,
        cbu: document.getElementById('cbu-transferencia').value.trim() || null,
        titular_cuenta: document.getElementById('titular-cuenta').value.trim() || null
    };

    btnGuardarPerfil.disabled = true;
    btnGuardarPerfil.textContent = 'Guardando...';

    const { error } = await supabaseCliente
        .from('distribuidoras')
        .update(datosDistribuidora)
        .eq('id', distribuidoraActual.id);

    if (error) {
        mostrarMensajePerfil('No pudimos guardar los cambios. Intente de nuevo.', 'error');
    } else {
        Object.assign(distribuidoraActual, datosDistribuidora);
        mostrarMensajePerfil('Cambios guardados correctamente.', 'exito');
    }

    btnGuardarPerfil.disabled = false;
    btnGuardarPerfil.textContent = 'Guardar cambios';
});

document.getElementById('boton-cerrar-sesion').addEventListener('click', async () => {
    await supabaseCliente.auth.signOut();
    localStorage.removeItem('aquatrack_carrito');
    window.location.href = 'login.html';
});

function formatearClaveFecha(fecha) {
    return fecha.toISOString().slice(0, 10);
}

function etiquetaMes(fecha) {
    return fecha.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

async function cargarCalendario() {
    const grilla = document.getElementById('grilla-calendario');
    grilla.innerHTML = '<p class="estado-productos-panel">Cargando calendario...</p>';

    const primerDiaMes = new Date(mesCalendarioActual.getFullYear(), mesCalendarioActual.getMonth(), 1);
    const ultimoDiaMes = new Date(mesCalendarioActual.getFullYear(), mesCalendarioActual.getMonth() + 1, 0);

    const desde = formatearClaveFecha(primerDiaMes);
    const hasta = formatearClaveFecha(ultimoDiaMes);

    const { data: disponibilidad, error } = await supabaseCliente
        .rpc('obtener_disponibilidad_calendario', {
            p_distribuidora_id: distribuidoraActual.id,
            p_desde: desde,
            p_hasta: hasta
        });

    if (error) {
        grilla.innerHTML = '<p class="estado-productos-panel">No pudimos cargar el calendario. Recargá la página.</p>';
        return;
    }

    const conteoPorDia = {};
    const diasBloqueados = new Set();

    (disponibilidad || []).forEach((dia) => {
        conteoPorDia[dia.fecha] = dia.cantidad;
        if (dia.bloqueado) diasBloqueados.add(dia.fecha);
    });

    renderizarCalendario(primerDiaMes, ultimoDiaMes, conteoPorDia, diasBloqueados);
}

function renderizarCalendario(primerDiaMes, ultimoDiaMes, conteoPorDia, diasBloqueados) {
    document.getElementById('etiqueta-mes-calendario').textContent = etiquetaMes(mesCalendarioActual);

    const grilla = document.getElementById('grilla-calendario');
    grilla.innerHTML = '';

    const hoyClave = formatearClaveFecha(new Date());
    const cupo = distribuidoraActual.cupo_diario;

    for (let i = 0; i < primerDiaMes.getDay(); i++) {
        const celdaVacia = document.createElement('div');
        celdaVacia.className = 'dia-calendario dia-vacio';
        grilla.appendChild(celdaVacia);
    }

    for (let dia = 1; dia <= ultimoDiaMes.getDate(); dia++) {
        const fecha = new Date(mesCalendarioActual.getFullYear(), mesCalendarioActual.getMonth(), dia);
        const clave = formatearClaveFecha(fecha);
        const cantidad = conteoPorDia[clave] || 0;
        const bloqueado = diasBloqueados.has(clave);
        const lleno = !bloqueado && cupo != null && cantidad >= cupo;
        const esPasado = clave < hoyClave;

        const celda = document.createElement('div');
        celda.className = 'dia-calendario';
        if (clave === hoyClave) celda.classList.add('dia-hoy');
        if (bloqueado) celda.classList.add('dia-bloqueado');
        else if (lleno) celda.classList.add('dia-lleno');
        if (esPasado) celda.classList.add('dia-pasado');

        celda.innerHTML = `
            <span class="dia-calendario-numero">${dia}</span>
            <span class="dia-calendario-info">
                ${bloqueado ? 'Bloqueado' : `${cantidad}${cupo != null ? '/' + cupo : ''}`}
            </span>
        `;

        if (!esPasado) {
            celda.addEventListener('click', () => abrirModalDia(clave, bloqueado));
        }

        grilla.appendChild(celda);
    }
}

document.getElementById('btn-mes-anterior').addEventListener('click', () => {
    mesCalendarioActual = new Date(mesCalendarioActual.getFullYear(), mesCalendarioActual.getMonth() - 1, 1);
    cargarCalendario();
});

document.getElementById('btn-mes-siguiente').addEventListener('click', () => {
    mesCalendarioActual = new Date(mesCalendarioActual.getFullYear(), mesCalendarioActual.getMonth() + 1, 1);
    cargarCalendario();
});

let fechaModalDia = null;

async function abrirModalDia(clave, bloqueado) {
    fechaModalDia = clave;

    const fechaLegible = new Date(`${clave}T00:00:00`).toLocaleDateString('es-AR', {
        weekday: 'long', day: 'numeric', month: 'long'
    });

    document.getElementById('titulo-modal-dia').textContent = fechaLegible;

    const contenido = document.getElementById('detalle-dia-contenido');
    contenido.innerHTML = '<p class="estado-productos-panel">Cargando...</p>';

    const btnBloqueo = document.getElementById('btn-alternar-bloqueo-dia');
    btnBloqueo.classList.remove('oculto');
    btnBloqueo.textContent = bloqueado ? 'Desbloquear este día' : 'Bloquear este día';
    btnBloqueo.dataset.bloqueado = bloqueado ? '1' : '0';

    document.getElementById('modal-detalle-dia').classList.remove('oculto');

    const { data: detalle, error } = await supabaseCliente
        .rpc('obtener_detalle_dia_calendario', {
            p_distribuidora_id: distribuidoraActual.id,
            p_fecha: clave
        });

    if (error) {
        contenido.innerHTML = '<p class="estado-productos-panel">No pudimos cargar el detalle de este día.</p>';
        return;
    }

    const items = (detalle || []).map((item) => {
        if (item.tipo === 'pedido') {
            return `
                <div class="item-detalle-dia">
                    <span class="etiqueta-tipo-entrega">Pedido</span>
                    <strong>${escaparHtml(item.nombre_cliente || '')} ${escaparHtml(item.apellido_cliente || '')}</strong>
                    ${formatearPrecio(item.total)}
                </div>
            `;
        }

        return `
            <div class="item-detalle-dia">
                <span class="etiqueta-tipo-entrega">Suscripción</span>
                <strong>${escaparHtml(item.nombre_cliente || '')} ${escaparHtml(item.apellido_cliente || '')}</strong>
                ${escaparHtml(item.producto_nombre || '')} x${item.cantidad}
            </div>
        `;
    });

    contenido.innerHTML = items.length > 0
        ? `<div class="lista-detalle-dia">${items.join('')}</div>`
        : '<p class="estado-productos-panel">No hay entregas programadas para este día.</p>';
}

document.getElementById('boton-cerrar-modal-dia').addEventListener('click', () => {
    document.getElementById('modal-detalle-dia').classList.add('oculto');
});

document.getElementById('btn-alternar-bloqueo-dia').addEventListener('click', async (evento) => {
    const boton = evento.currentTarget;
    const estaBloqueado = boton.dataset.bloqueado === '1';

    boton.disabled = true;

    if (estaBloqueado) {
        await supabaseCliente
            .from('dias_bloqueados')
            .delete()
            .eq('distribuidora_id', distribuidoraActual.id)
            .eq('fecha', fechaModalDia);
    } else {
        await supabaseCliente
            .from('dias_bloqueados')
            .upsert({
                distribuidora_id: distribuidoraActual.id,
                fecha: fechaModalDia,
                creado_por: usuarioActualId
            }, { onConflict: 'distribuidora_id,fecha' });
    }

    boton.disabled = false;
    document.getElementById('modal-detalle-dia').classList.add('oculto');
    await cargarCalendario();
});

document.getElementById('formulario-cupo').addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const valorCupo = document.getElementById('cupo-diario').value;
    const valorMaximo = document.getElementById('max-bidones').value;
    const valor = valorCupo === '' ? null : Number(valorCupo);
    const maximo = valorMaximo === '' ? null : Number(valorMaximo);

    const { error } = await supabaseCliente
        .from('distribuidoras')
        .update({ cupo_diario: valor, max_bidones_por_pedido: maximo })
        .eq('id', distribuidoraActual.id);

    const mensaje = document.getElementById('mensaje-cupo');

    if (error) {
        mensaje.textContent = 'No pudimos guardar el cupo. Intentá de nuevo.';
        mensaje.className = 'mensaje-estado error';
    } else {
        distribuidoraActual.cupo_diario = valor;
        distribuidoraActual.max_bidones_por_pedido = maximo;
        mensaje.textContent = 'Límites guardados.';
        mensaje.className = 'mensaje-estado exito';
        cargarCalendario();
    }

    mensaje.classList.remove('oculto');
    setTimeout(() => mensaje.classList.add('oculto'), 3200);
});

document.getElementById('btn-alternar-vista-suscripciones').addEventListener('click', (evento) => {
    const boton = evento.currentTarget;
    const vistaCalendario = document.getElementById('vista-calendario-suscripciones');
    const vistaLista = document.getElementById('vista-lista-suscripciones');

    const mostrandoLista = !vistaLista.classList.contains('oculto');

    vistaCalendario.classList.toggle('oculto', !mostrandoLista);
    vistaLista.classList.toggle('oculto', mostrandoLista);
    boton.textContent = mostrandoLista ? 'Ver todas las suscripciones' : 'Ver calendario';

    if (!mostrandoLista && !seccionListaSuscripcionesCargada) {
        seccionListaSuscripcionesCargada = true;
        cargarSuscripcionesPanel();
    }
});

let repartidoresCargados = [];

function renderizarListaRepartidores(lista, contenedorId, estadoVacioId, conAcciones) {
    const contenedor = document.getElementById(contenedorId);
    const estadoVacio = document.getElementById(estadoVacioId);

    contenedor.innerHTML = '';

    if (lista.length === 0) {
        estadoVacio.textContent = conAcciones
            ? 'No hay solicitudes pendientes por ahora.'
            : 'Todavía no tenés repartidores en tu flota.';
        estadoVacio.classList.remove('oculto');
        return;
    }

    estadoVacio.classList.add('oculto');
    repartidoresCargados = lista;

    lista.forEach((miembro) => {
        const repartidor = miembro.usuarios || {};

        const acciones = conAcciones
            ? `<div class="tarjeta-producto-panel-acciones">
                   <button type="button" class="btn btn-secundario btn-chico" data-pausar-repartidor="${miembro.id}">
                       ${miembro.disponible === false ? 'Reactivar' : 'Pausar'}
                   </button>
               </div>`
            : '';

        const tarjeta = document.createElement('article');
        tarjeta.className = 'tarjeta-producto-panel';
        tarjeta.innerHTML = `
            <div class="tarjeta-repartidor-cabecera" data-detalle-repartidor="${miembro.id}">
                <div class="tarjeta-repartidor-foto">
                    ${repartidor.foto_url
                ? `<img src="${escaparHtml(repartidor.foto_url)}" alt="${escaparHtml(repartidor.nombre)}">`
                : '<span>Sin foto</span>'}
                </div>
                <div>
                    <h3>${escaparHtml(repartidor.nombre || 'Repartidor')}</h3>
                    <p class="tarjeta-repartidor-dni">DNI: ${escaparHtml(repartidor.dni || 'Sin cargar')}</p>
                </div>
            </div>
            <p class="tarjeta-producto-panel-descripcion">
                ${escaparHtml(repartidor.telefono || 'Sin teléfono')}
            </p>
            <p class="tarjeta-producto-panel-descripcion">
                ${escaparHtml(miembro.mensaje_solicitud || 'Sin mensaje adjunto.')}
            </p>
            ${acciones}
        `;

        contenedor.appendChild(tarjeta);
    });
}

document.getElementById('lista-flota').addEventListener('click', async (evento) => {
    const boton = evento.target.closest('[data-pausar-repartidor]');
    if (!boton) return;

    const miembroId = boton.dataset.pausarRepartidor;
    const miembro = repartidoresCargados.find((item) => item.id === miembroId);
    if (!miembro) return;

    boton.disabled = true;

    const { error } = await supabaseCliente
        .from('miembros_distribuidoras')
        .update({ disponible: !(miembro.disponible === true) })
        .eq('id', miembroId);

    if (error) {
        alert('No pudimos actualizar al repartidor. Intentá de nuevo.');
        boton.disabled = false;
        return;
    }

    await cargarRepartidores();
});

async function cargarRepartidores() {
    const { data: flota, error: errorFlota } = await supabaseCliente
        .from('miembros_distribuidoras')
        .select(`
            id, usuario_id, disponible,
            usuarios!usuario_id (
                nombre, telefono, dni, foto_url, tipo_vehiculo,
                marca_vehiculo, modelo_vehiculo, patente_vehiculo, numero_licencia
            )
        `)
        .eq('distribuidora_id', distribuidoraActual.id)
        .eq('rol', 'repartidor')
        .eq('estado', 'activo')
        .order('creado_en', { ascending: false });

    if (errorFlota) {
        document.getElementById('estado-flota').textContent =
            'No pudimos cargar tu flota. Recargá la página.';
        document.getElementById('estado-flota').classList.remove('oculto');
    } else {
        renderizarListaRepartidores(flota || [], 'lista-flota', 'estado-flota', true);
    }

    const { data: invitaciones, error: errorInvitaciones } = await supabaseCliente
        .from('invitaciones_repartidor')
        .select('id, nombre, email, dni, telefono, marca_vehiculo, modelo_vehiculo, creado_en')
        .eq('distribuidora_id', distribuidoraActual.id)
        .eq('estado', 'pendiente')
        .order('creado_en', { ascending: false });

    if (errorInvitaciones) {
        document.getElementById('estado-invitaciones').textContent =
            'No pudimos cargar las invitaciones. Recargá la página.';
        document.getElementById('estado-invitaciones').classList.remove('oculto');
        return;
    }

    const listaInvitaciones = document.getElementById('lista-invitaciones');
    const estadoInvitaciones = document.getElementById('estado-invitaciones');
    listaInvitaciones.innerHTML = '';

    if (!invitaciones || invitaciones.length === 0) {
        estadoInvitaciones.textContent = 'No tenés invitaciones esperando respuesta.';
        estadoInvitaciones.classList.remove('oculto');
        return;
    }

    estadoInvitaciones.classList.add('oculto');

    invitaciones.forEach((invitacion) => {
        const tarjeta = document.createElement('article');
        tarjeta.className = 'tarjeta-producto-panel';
        tarjeta.innerHTML = `
            <div class="tarjeta-producto-panel-superior">
                <h3>${escaparHtml(invitacion.nombre)}</h3>
                <span class="etiqueta-estado-producto pendiente">Esperando registro</span>
            </div>
            <p class="tarjeta-producto-panel-descripcion">${escaparHtml(invitacion.email)}</p>
            <p class="tarjeta-producto-panel-descripcion">
                ${escaparHtml([invitacion.marca_vehiculo, invitacion.modelo_vehiculo].filter(Boolean).join(' ') || 'Sin vehículo cargado')}
            </p>
        `;
        listaInvitaciones.appendChild(tarjeta);
    });
}

function abrirDetalleRepartidor(miembro) {
    const repartidor = miembro.usuarios || {};

    document.getElementById('titulo-modal-repartidor').textContent = repartidor.nombre || 'Repartidor';

    document.getElementById('detalle-repartidor-contenido').innerHTML = `
        <div class="detalle-repartidor-fila">
            <span>DNI</span>
            <span>${escaparHtml(repartidor.dni || 'Sin cargar')}</span>
        </div>
        <div class="detalle-repartidor-fila">
            <span>Teléfono</span>
            <span>${escaparHtml(repartidor.telefono || 'Sin cargar')}</span>
        </div>
        <div class="detalle-repartidor-fila">
            <span>Tipo de vehículo</span>
            <span>${escaparHtml({ a_pie: 'A pie', bicicleta: 'Bicicleta', moto: 'Moto', auto: 'Auto' }[repartidor.tipo_vehiculo] || 'Sin cargar')}</span>
        </div>
        <div class="detalle-repartidor-fila">
            <span>Vehículo</span>
            <span>${escaparHtml([repartidor.marca_vehiculo, repartidor.modelo_vehiculo].filter(Boolean).join(' ') || 'Sin cargar')}</span>
        </div>
        <div class="detalle-repartidor-fila">
            <span>Patente</span>
            <span>${escaparHtml(repartidor.patente_vehiculo || 'Sin cargar')}</span>
        </div>
        <div class="detalle-repartidor-fila">
            <span>N° de licencia</span>
            <span>${escaparHtml(repartidor.numero_licencia || 'Sin cargar')}</span>
        </div>
    `;

    document.getElementById('modal-detalle-repartidor').classList.remove('oculto');
}



document.getElementById('formulario-invitar-repartidor').addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const btnInvitar = document.getElementById('btn-invitar-repartidor');

    const datosInvitacion = {
        distribuidora_id: distribuidoraActual.id,
        invitado_por: usuarioActualId,
        nombre: document.getElementById('nombre-repartidor').value.trim(),
        email: document.getElementById('email-repartidor').value.trim(),
        dni: document.getElementById('dni-repartidor-invitar').value.trim() || null,
        telefono: document.getElementById('telefono-repartidor-invitar').value.trim() || null,
        tipo_vehiculo: document.getElementById('tipo-vehiculo-repartidor-invitar').value,
        marca_vehiculo: document.getElementById('marca-repartidor-invitar').value.trim() || null,
        modelo_vehiculo: document.getElementById('modelo-repartidor-invitar').value.trim() || null,
        patente_vehiculo: document.getElementById('patente-repartidor-invitar').value.trim() || null,
        numero_licencia: document.getElementById('licencia-repartidor-invitar').value.trim() || null
    };

    btnInvitar.disabled = true;
    btnInvitar.textContent = 'Generando...';

    const { error } = await supabaseCliente
        .from('invitaciones_repartidor')
        .insert(datosInvitacion);

    btnInvitar.disabled = false;
    btnInvitar.textContent = 'Generar invitación';

    if (error) {
        alert('No pudimos generar la invitación. Revisá los datos e intentá de nuevo.');
        return;
    }

    const link = `${window.location.origin}/registro-repartidor.html?email=${encodeURIComponent(datosInvitacion.email)}`;
    document.getElementById('link-invitacion').value = link;
    document.getElementById('tarjeta-link-invitacion').classList.remove('oculto');

    document.getElementById('formulario-invitar-repartidor').reset();
    await cargarRepartidores();
});

document.getElementById('btn-copiar-link').addEventListener('click', () => {
    const campoLink = document.getElementById('link-invitacion');
    campoLink.select();
    navigator.clipboard.writeText(campoLink.value);

    const boton = document.getElementById('btn-copiar-link');
    boton.textContent = '¡Copiado!';
    setTimeout(() => { boton.textContent = 'Copiar'; }, 1500);
});

document.getElementById('boton-cerrar-modal-repartidor').addEventListener('click', () => {
    document.getElementById('modal-detalle-repartidor').classList.add('oculto');
});

document.getElementById('modal-detalle-repartidor').addEventListener('click', (evento) => {
    if (evento.target.id === 'modal-detalle-repartidor') {
        document.getElementById('modal-detalle-repartidor').classList.add('oculto');
    }
});

document.getElementById('seccion-repartidores').addEventListener('click', (evento) => {
    const cabecera = evento.target.closest('[data-detalle-repartidor]');

    if (!cabecera) {
        return;
    }

    const miembro = repartidoresCargados.find((item) => item.id === cabecera.dataset.detalleRepartidor);

    if (miembro) {
        abrirDetalleRepartidor(miembro);
    }
});

// ---------- Publicidad ----------

let anunciosDelPanel = [];
let configuracionPagoAnuncio = null;
let anuncioEnCreacion = null;
let archivoImagenAnuncio = null;

const etiquetasEstadoAnuncio = {
    pendiente_pago: 'Esperando pago',
    pendiente_aprobacion: 'En revisión',
    activo: 'Activo',
    rechazado: 'Rechazado',
    vencido: 'Vencido'
};

function claseEstadoAnuncio(estado) {
    if (estado === 'activo') return 'activo';
    if (estado === 'rechazado') return 'rechazada';
    if (estado === 'vencido') return 'inactivo';
    return 'pendiente';
}

async function cargarAnunciosPanel() {
    const estadoVacio = document.getElementById('estado-publicidad');
    const lista = document.getElementById('lista-anuncios-panel');

    const { data, error } = await supabaseCliente
        .from('anuncios')
        .select('id, titulo, descripcion, imagen_url, monto, estado, creado_en, fecha_fin, renovacion_solicitada')
        .eq('distribuidora_id', distribuidoraActual.id)
        .order('creado_en', { ascending: false });

    if (error) {
        estadoVacio.textContent = 'No pudimos cargar tus anuncios. Recargá la página.';
        estadoVacio.classList.remove('oculto');
        return;
    }

    anunciosDelPanel = data || [];
    lista.innerHTML = '';

    if (anunciosDelPanel.length === 0) {
        estadoVacio.textContent = 'Todavía no creaste ningún anuncio.';
        estadoVacio.classList.remove('oculto');
        return;
    }

    estadoVacio.classList.add('oculto');

    anunciosDelPanel.forEach((anuncio) => {
        const tarjeta = document.createElement('article');
        tarjeta.className = 'tarjeta-producto-panel';
        tarjeta.innerHTML = `
            <div class="tarjeta-producto-panel-superior">
                <h3>${escaparHtml(anuncio.titulo)}</h3>
                <span class="etiqueta-estado-producto ${claseEstadoAnuncio(anuncio.estado)}">
                    ${etiquetasEstadoAnuncio[anuncio.estado] || anuncio.estado}
                </span>
            </div>
            ${anuncio.descripcion ? `<p class="tarjeta-producto-panel-descripcion">${escaparHtml(anuncio.descripcion)}</p>` : ''}
            <p class="tarjeta-producto-panel-descripcion">Monto: ${formatearPrecio(anuncio.monto)}</p>
            ${anuncio.estado === 'activo' && anuncio.fecha_fin
                ? `<p class="tarjeta-producto-panel-descripcion">Se vuelve a cobrar el: ${formatearFechaPanel(anuncio.fecha_fin.slice(0, 10))}</p>`
                : ''}
            ${anuncio.renovacion_solicitada
                ? '<p class="tarjeta-producto-panel-descripcion">Renovación en revisión.</p>'
                : (anuncio.estado === 'vencido' || (anuncio.estado === 'activo' && anuncio.fecha_fin && new Date(anuncio.fecha_fin) - Date.now() < 7 * 86400000))
                    ? `<div class="tarjeta-producto-panel-acciones">
                           <button type="button" class="btn btn-secundario btn-chico" data-renovar-anuncio="${anuncio.id}">Renovar</button>
                       </div>`
                    : ''}
        `;
        lista.appendChild(tarjeta);
    });
}

let anuncioEnRenovacion = null;

document.getElementById('lista-anuncios-panel').addEventListener('click', async (evento) => {
    const boton = evento.target.closest('[data-renovar-anuncio]');

    if (!boton) {
        return;
    }

    const anuncio = anunciosDelPanel.find((item) => item.id === boton.dataset.renovarAnuncio);

    if (!anuncio) {
        return;
    }

    anuncioEnRenovacion = anuncio;
    anuncioEnCreacion = anuncio.id;

    document.getElementById('titulo-modal-anuncio').textContent = 'Renovar anuncio';
    document.getElementById('monto-anuncio-texto').textContent = formatearPrecio(anuncio.monto);

    const configuracion = await cargarConfiguracionPagoAnuncio();
    document.getElementById('alias-anuncio').textContent = configuracion?.alias || '—';
    document.getElementById('cbu-anuncio').textContent = configuracion?.cbu || '—';
    document.getElementById('titular-anuncio').textContent = configuracion?.titular_cuenta || '—';
    document.getElementById('comprobante-anuncio').value = '';
    document.getElementById('nombre-archivo-comprobante-anuncio').textContent = '';
    document.getElementById('mensaje-anuncio').classList.add('oculto');

    formularioAnuncioDatos.classList.add('oculto');
    pasoPagoAnuncio.classList.remove('oculto');
    modalAnuncio.classList.remove('oculto');
});

async function cargarConfiguracionPagoAnuncio() {
    if (configuracionPagoAnuncio) return configuracionPagoAnuncio;

    const { data } = await supabaseCliente
        .from('configuracion_plataforma')
        .select('alias, cbu, titular_cuenta, precio_anuncio_producto, precio_anuncio_distribuidora')
        .single();

    configuracionPagoAnuncio = data;
    return data;
}

function precioAnuncioSegunSeleccion(configuracion) {
    const hayProducto = document.getElementById('producto-anuncio').value !== '';
    return hayProducto
        ? (configuracion?.precio_anuncio_producto || 0)
        : (configuracion?.precio_anuncio_distribuidora || 0);
}

function llenarSelectProductosAnuncio() {
    const select = document.getElementById('producto-anuncio');
    select.innerHTML = '<option value="">Destacar tu distribuidora</option>';

    productosDelPanel.forEach((producto) => {
        const opcion = document.createElement('option');
        opcion.value = producto.id;
        opcion.textContent = producto.nombre;
        select.appendChild(opcion);
    });
}

const modalAnuncio = document.getElementById('modal-anuncio');
const formularioAnuncioDatos = document.getElementById('formulario-anuncio-datos');
const pasoPagoAnuncio = document.getElementById('paso-pago-anuncio');
const vistaFotoAnuncio = document.getElementById('vista-foto-anuncio');

document.getElementById('btn-crear-anuncio').addEventListener('click', async () => {
    formularioAnuncioDatos.reset();
    formularioAnuncioDatos.classList.remove('oculto');
    pasoPagoAnuncio.classList.add('oculto');
    vistaFotoAnuncio.innerHTML = '<span>Sin imagen</span>';
    archivoImagenAnuncio = null;
    anuncioEnCreacion = null;
    anuncioEnRenovacion = null;
    document.getElementById('titulo-modal-anuncio').textContent = 'Crear anuncio';

    llenarSelectProductosAnuncio();

    const configuracion = await cargarConfiguracionPagoAnuncio();
    document.getElementById('precio-anuncio-texto').textContent =
        `Este anuncio cuesta ${formatearPrecio(precioAnuncioSegunSeleccion(configuracion))}.`;

    modalAnuncio.classList.remove('oculto');
});

document.getElementById('producto-anuncio').addEventListener('change', () => {
    if (!configuracionPagoAnuncio) return;
    document.getElementById('precio-anuncio-texto').textContent =
        `Este anuncio cuesta ${formatearPrecio(precioAnuncioSegunSeleccion(configuracionPagoAnuncio))}.`;
});

document.getElementById('boton-cerrar-modal-anuncio').addEventListener('click', () => {
    modalAnuncio.classList.add('oculto');
});

document.getElementById('imagen-anuncio').addEventListener('change', (evento) => {
    const archivo = evento.target.files[0];
    if (!archivo) return;

    archivoImagenAnuncio = archivo;
    vistaFotoAnuncio.innerHTML = `<img src="${URL.createObjectURL(archivo)}" alt="Imagen del anuncio">`;
});

formularioAnuncioDatos.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    if (!archivoImagenAnuncio) {
        alert('Subí una imagen para el anuncio.');
        return;
    }

    const btnGuardar = document.getElementById('btn-guardar-anuncio');
    btnGuardar.disabled = true;

    try {
        const rutaImagen = `${distribuidoraActual.id}/${crypto.randomUUID()}-${archivoImagenAnuncio.name}`;

        const { error: errorSubida } = await supabaseCliente.storage
            .from('anuncios-imagenes')
            .upload(rutaImagen, archivoImagenAnuncio);

        if (errorSubida) throw new Error('No pudimos subir la imagen.');

        const { data: urlData } = supabaseCliente.storage
            .from('anuncios-imagenes')
            .getPublicUrl(rutaImagen);

        const configuracion = await cargarConfiguracionPagoAnuncio();
        const montoAnuncio = precioAnuncioSegunSeleccion(configuracion);

        const { data: anuncioCreado, error: errorInsert } = await supabaseCliente
            .from('anuncios')
            .insert({
                distribuidora_id: distribuidoraActual.id,
                producto_id: document.getElementById('producto-anuncio').value || null,
                titulo: document.getElementById('titulo-anuncio').value.trim(),
                descripcion: document.getElementById('descripcion-anuncio').value.trim(),
                imagen_url: urlData.publicUrl,
                monto: montoAnuncio,
                creado_por: usuarioActualId
            })
            .select('id')
            .single();

        if (errorInsert) throw new Error('No pudimos crear el anuncio.');

        anuncioEnCreacion = anuncioCreado.id;

        document.getElementById('monto-anuncio-texto').textContent = formatearPrecio(montoAnuncio);
        document.getElementById('alias-anuncio').textContent = configuracion?.alias || '—';
        document.getElementById('cbu-anuncio').textContent = configuracion?.cbu || '—';
        document.getElementById('titular-anuncio').textContent = configuracion?.titular_cuenta || '—';

        formularioAnuncioDatos.classList.add('oculto');
        pasoPagoAnuncio.classList.remove('oculto');
    } catch (errorCreacion) {
        alert(errorCreacion.message || 'Ocurrió un error. Intentá de nuevo.');
    } finally {
        btnGuardar.disabled = false;
    }
});

document.getElementById('comprobante-anuncio').addEventListener('change', (evento) => {
    const archivo = evento.target.files[0];
    document.getElementById('nombre-archivo-comprobante-anuncio').textContent = archivo ? archivo.name : '';
});

document.getElementById('btn-enviar-comprobante-anuncio').addEventListener('click', async () => {
    const inputComprobante = document.getElementById('comprobante-anuncio');
    const archivo = inputComprobante.files[0];
    const mensaje = document.getElementById('mensaje-anuncio');

    if (!archivo) {
        mensaje.textContent = 'Subí el comprobante de la transferencia.';
        mensaje.className = 'mensaje-estado error';
        mensaje.classList.remove('oculto');
        return;
    }

    const btn = document.getElementById('btn-enviar-comprobante-anuncio');
    btn.disabled = true;

    try {
        const rutaComprobante = `${distribuidoraActual.id}/${crypto.randomUUID()}-${archivo.name}`;

        const { error: errorSubida } = await supabaseCliente.storage
            .from('anuncios-imagenes')
            .upload(rutaComprobante, archivo);

        if (errorSubida) throw new Error('No pudimos subir el comprobante.');

        const { data: urlData } = supabaseCliente.storage
            .from('anuncios-imagenes')
            .getPublicUrl(rutaComprobante);

        const { error: errorUpdate } = await supabaseCliente
            .from('anuncios')
            .update(anuncioEnRenovacion
                ? {
                    comprobante_url: urlData.publicUrl,
                    renovacion_solicitada: true,
                    estado: anuncioEnRenovacion.estado === 'activo' ? 'activo' : 'pendiente_aprobacion'
                }
                : { comprobante_url: urlData.publicUrl, estado: 'pendiente_aprobacion' })
            .eq('id', anuncioEnCreacion);

        if (errorUpdate) throw new Error('No pudimos enviar el comprobante.');

        mensaje.textContent = '¡Comprobante enviado! El admin lo va a revisar.';
        mensaje.className = 'mensaje-estado exito';
        mensaje.classList.remove('oculto');

        setTimeout(() => {
            modalAnuncio.classList.add('oculto');
            cargarAnunciosPanel();
        }, 1200);
    } catch (errorEnvio) {
        mensaje.textContent = errorEnvio.message || 'Ocurrió un error. Intentá de nuevo.';
        mensaje.className = 'mensaje-estado error';
        mensaje.classList.remove('oculto');
    } finally {
        btn.disabled = false;
    }
});