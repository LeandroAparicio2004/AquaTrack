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

function formatearPrecio(valor) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(valor || 0);
}

const etiquetasEstadoPedidoSeguimiento = {
    pendiente: 'Preparando pedido',
    asignado: 'Asignado a un repartidor',
    en_camino: 'En camino',
    entregado: 'Entregado',
    cancelado: 'Cancelado'
};

const ayudaEstadoSeguimiento = {
    pendiente: 'Tu pedido todavía no fue asignado a un repartidor.',
    asignado: 'Tu repartidor ya tiene el pedido, pronto va a salir.',
    en_camino: 'Tu repartidor está en camino a tu dirección.',
    entregado: 'Tu pedido ya fue entregado. ¡Gracias por elegir AquaTrack!',
    cancelado: 'Este pedido fue cancelado.'
};

let mapaSeguimientoInstancia = null;
let marcadorRepartidor = null;
let marcadorDestino = null;
let intervaloSeguimiento = null;
let idEntregaActual = null;

function dibujarMapaBase(latitudDestino, longitudDestino) {
    mapaSeguimientoInstancia = L.map('mapa-seguimiento').setView([latitudDestino, longitudDestino], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(mapaSeguimientoInstancia);

    marcadorDestino = L.marker([latitudDestino, longitudDestino]).addTo(mapaSeguimientoInstancia).bindPopup('Tu dirección');
}

function actualizarMarcadorRepartidor(latitud, longitud) {
    if (!mapaSeguimientoInstancia) {
        return;
    }

    if (!marcadorRepartidor) {
        const icono = L.divIcon({
            className: '',
            html: '<div class="marcador-repartidor-seguimiento"></div>',
            iconSize: [18, 18]
        });

        marcadorRepartidor = L.marker([latitud, longitud], { icon: icono })
            .addTo(mapaSeguimientoInstancia)
            .bindPopup('Tu repartidor');
    } else {
        marcadorRepartidor.setLatLng([latitud, longitud]);
    }

    if (marcadorDestino) {
        mapaSeguimientoInstancia.fitBounds([
            marcadorRepartidor.getLatLng(),
            marcadorDestino.getLatLng()
        ], { padding: [40, 40] });
    }
}

let destinoSeguimiento = null;

function textoFechaEntrega(fecha) {
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });

    if (fecha === hoy) {
        return 'hoy';
    }

    return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: '2-digit' });
}

function minutosEstimados(latitudA, longitudA, latitudB, longitudB) {
    const radio = 6371;
    const rad = (grados) => grados * Math.PI / 180;
    const dLat = rad(latitudB - latitudA);
    const dLon = rad(longitudB - longitudA);
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(rad(latitudA)) * Math.cos(rad(latitudB)) * Math.sin(dLon / 2) ** 2;
    const km = 2 * radio * Math.asin(Math.sqrt(a));

    return Math.round((km * 1.4 / 25) * 60);
}

async function consultarUbicacionRepartidor() {
    if (!idEntregaActual) {
        return;
    }

    const { data, error } = await supabaseCliente
        .from('ubicaciones_entregas')
        .select('latitud, longitud, registrado_en')
        .eq('entrega_id', idEntregaActual)
        .order('registrado_en', { ascending: false })
        .limit(1)
        .maybeSingle();

    const notaMapa = document.getElementById('nota-mapa-seguimiento');

    if (error || !data) {
        notaMapa.textContent = 'Todavía no recibimos la ubicación de tu repartidor.';
        return;
    }

    actualizarMarcadorRepartidor(data.latitud, data.longitud);

    if (destinoSeguimiento && !Number.isNaN(destinoSeguimiento.latitud)) {
        const minutos = minutosEstimados(data.latitud, data.longitud, destinoSeguimiento.latitud, destinoSeguimiento.longitud);

        document.getElementById('texto-ayuda-estado').textContent = minutos < 2
            ? 'Tu repartidor está llegando a tu dirección.'
            : `Tu repartidor está en camino. Llega en unos ${minutos} minutos (aproximado).`;
    }
    notaMapa.textContent = 'Última actualización: ' + new Date(data.registrado_en).toLocaleTimeString('es-AR');
}

function iniciarPollingUbicacion() {
    if (intervaloSeguimiento) {
        return;
    }

    consultarUbicacionRepartidor();
    intervaloSeguimiento = setInterval(consultarUbicacionRepartidor, 10000);
}

function detenerPollingUbicacion() {
    if (intervaloSeguimiento) {
        clearInterval(intervaloSeguimiento);
        intervaloSeguimiento = null;
    }
}

function renderizarItems(detalles) {
    const contenedor = document.getElementById('items-seguimiento');

    contenedor.innerHTML = (detalles || []).map((item) => `
        <div class="fila-item-seguimiento">
            <span>${item.cantidad}x ${escaparHtml(item.productos?.nombre || 'Producto')}</span>
            <span>${formatearPrecio(item.precio_unitario * item.cantidad)}</span>
        </div>
    `).join('');
}

async function cargarSeguimiento() {
    const parametros = new URLSearchParams(window.location.search);
    const idPedido = parametros.get('pedido');

    const estadoDiv = document.getElementById('estado-seguimiento');
    const textoEstado = document.getElementById('texto-estado-seguimiento');
    const contenido = document.getElementById('contenido-seguimiento');

    if (!idPedido) {
        textoEstado.textContent = 'No encontramos ningún pedido para mostrar.';
        estadoDiv.classList.remove('oculto');
        return;
    }

    const { data: { session } } = await supabaseCliente.auth.getSession();

    if (!session) {
        window.location.href = `login.html?siguiente=seguimiento.html?pedido=${idPedido}`;
        return;
    }

    const { data: pedido, error } = await supabaseCliente
        .from('pedidos')
        .select(`
            id, estado, direccion_calle, direccion_numero, direccion_ciudad, direccion_referencia,
            latitud, longitud, total, fecha_entrega,
            detalles_pedidos ( cantidad, precio_unitario, productos ( nombre ) ),
            entregas ( id, estado, repartidor_id, usuarios!entregas_repartidor_id_fkey ( nombre, apellido, telefono ) )
        `)
        .eq('id', idPedido)
        .maybeSingle();

    if (error || !pedido) {
        textoEstado.textContent = 'No pudimos encontrar este pedido, o no tenés acceso a él.';
        estadoDiv.classList.remove('oculto');
        return;
    }

    document.getElementById('titulo-seguimiento').textContent = `Pedido #${pedido.id.slice(0, 8)}`;

    const etiquetaEstado = document.getElementById('etiqueta-estado-pedido');
    etiquetaEstado.textContent = etiquetasEstadoPedidoSeguimiento[pedido.estado] || pedido.estado;
    etiquetaEstado.className = `etiqueta-estado-pedido ${pedido.estado}`;
    destinoSeguimiento = { latitud: Number(pedido.latitud), longitud: Number(pedido.longitud) };

    let textoAyuda = ayudaEstadoSeguimiento[pedido.estado] || '';

    if ((pedido.estado === 'pendiente' || pedido.estado === 'asignado') && pedido.fecha_entrega) {
        textoAyuda += ` Entrega prevista: ${textoFechaEntrega(pedido.fecha_entrega)}.`;
    }

    document.getElementById('texto-ayuda-estado').textContent = textoAyuda;

    const direccionTexto = [
        `${pedido.direccion_calle} ${pedido.direccion_numero || ''}`.trim(),
        pedido.direccion_ciudad,
        pedido.direccion_referencia ? `Referencia: ${pedido.direccion_referencia}` : ''
    ].filter(Boolean).join(', ');
    document.getElementById('direccion-seguimiento').textContent = direccionTexto;

    renderizarItems(pedido.detalles_pedidos);
    document.getElementById('total-seguimiento').textContent = formatearPrecio(pedido.total);

    const entrega = pedido.entregas;
    const nombreRepartidorEl = document.getElementById('nombre-repartidor-seguimiento');
    const telefonoRepartidorEl = document.getElementById('telefono-repartidor-seguimiento');

    if (entrega && entrega.usuarios) {
        nombreRepartidorEl.textContent = `${entrega.usuarios.nombre || ''} ${entrega.usuarios.apellido || ''}`.trim();
        telefonoRepartidorEl.textContent = entrega.usuarios.telefono ? `Tel: ${entrega.usuarios.telefono}` : '';
    } else {
        nombreRepartidorEl.textContent = 'Todavía no te asignaron un repartidor.';
        telefonoRepartidorEl.textContent = '';
    }

    estadoDiv.classList.add('oculto');
    contenido.classList.remove('oculto');

    const notaMapa = document.getElementById('nota-mapa-seguimiento');

    if (!pedido.latitud || !pedido.longitud) {
        document.getElementById('mapa-seguimiento').classList.add('oculto');
        notaMapa.textContent = 'No tenemos la ubicación de tu dirección guardada para mostrarla en el mapa.';
        return;
    }

    if (entrega && entrega.estado === 'en_camino') {
        dibujarMapaBase(Number(pedido.latitud), Number(pedido.longitud));
        idEntregaActual = entrega.id;
        notaMapa.textContent = 'Buscando la ubicación de tu repartidor...';
        iniciarPollingUbicacion();
        return;
    }

    document.getElementById('mapa-seguimiento').classList.add('oculto');

    if (entrega && entrega.estado === 'asignada') {
        notaMapa.textContent = 'Tu repartidor todavía no salió a entregar. El mapa aparece cuando sale.';
    } else if (pedido.estado === 'entregado' || pedido.estado === 'cancelado') {
        notaMapa.textContent = '';
    } else {
        notaMapa.textContent = 'El mapa en vivo aparece cuando el repartidor sale a entregar.';
    }
}

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        detenerPollingUbicacion();
    } else if (idEntregaActual) {
        iniciarPollingUbicacion();
    }
});

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

document.getElementById('boton-volver-seguimiento').addEventListener('click', () => {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = 'historial.html';
    }
});

cargarSeguimiento();
verificarSesionNav();