function escaparHtml(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, (caracter) => {
        const caracteresEspeciales = {
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
        };
        return caracteresEspeciales[caracter];
    });
}

function formatearPrecio(valor) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(valor || 0);
}

function mostrarError(texto) {
    const estado = document.getElementById('estado-ticket');
    estado.textContent = texto;
    estado.classList.remove('oculto');
}

let pedidoActualTicket = null;

async function cargarTicket() {
    const idPedido = new URLSearchParams(window.location.search).get('pedido');

    if (!idPedido) {
        mostrarError('No encontramos ningún pedido para mostrar.');
        return;
    }

    const { data: { session } } = await supabaseCliente.auth.getSession();

    if (!session) {
        window.location.href = `login.html?siguiente=ticket.html?pedido=${idPedido}`;
        return;
    }

    const { data: pedido, error } = await supabaseCliente
        .from('pedidos')
        .select(`
            id, direccion_calle, direccion_numero, direccion_ciudad, direccion_referencia,
            subtotal, descuento_envases, total,
            usuarios!pedidos_cliente_id_fkey ( nombre, apellido, dni ),
            distribuidoras ( nombre ),
            detalles_pedidos ( cantidad, precio_unitario, subtotal, productos ( nombre ) )
        `)
        .eq('id', idPedido)
        .maybeSingle();

    if (error || !pedido) {
        mostrarError('No pudimos encontrar este pedido, o no tenés acceso a él.');
        return;
    }

    pedidoActualTicket = pedido;

    document.getElementById('distribuidora-ticket').textContent = `Pedido a ${pedido.distribuidoras?.nombre || ''}`;
    document.getElementById('nombre-ticket').textContent = pedido.usuarios?.nombre || '';
    document.getElementById('apellido-ticket').textContent = pedido.usuarios?.apellido || '';

    if (pedido.usuarios?.dni) {
        document.getElementById('dni-ticket').textContent = pedido.usuarios.dni;
        document.getElementById('fila-dni-ticket').classList.remove('oculto');
    }

    const domicilio = [
        `${pedido.direccion_calle} ${pedido.direccion_numero || ''}`.trim(),
        pedido.direccion_ciudad,
        pedido.direccion_referencia ? `Ref: ${pedido.direccion_referencia}` : ''
    ].filter(Boolean).join(', ');
    document.getElementById('domicilio-ticket').textContent = domicilio;

    document.getElementById('items-ticket').innerHTML = (pedido.detalles_pedidos || []).map((item) => `
        <div class="fila-item-ticket">
            <span>${item.cantidad}x ${escaparHtml(item.productos?.nombre || 'Producto')}
                <small>${formatearPrecio(item.precio_unitario)} c/u</small>
            </span>
            <span>${formatearPrecio(item.subtotal)}</span>
        </div>
    `).join('');

    document.getElementById('subtotal-ticket').textContent = formatearPrecio(pedido.subtotal);

    if (pedido.descuento_envases > 0) {
        document.getElementById('descuento-ticket').textContent = `-${formatearPrecio(pedido.descuento_envases)}`;
        document.getElementById('fila-descuento-ticket').classList.remove('oculto');
    }

    document.getElementById('total-ticket').textContent = formatearPrecio(pedido.total);

    new QRCode(document.getElementById('qr-ticket'), {
        text: pedido.id,
        width: 160,
        height: 160
    });

    document.getElementById('codigo-manual-ticket').textContent = pedido.id.slice(0, 8).toUpperCase();
    document.getElementById('enlace-seguimiento-ticket').href = `seguimiento.html?pedido=${pedido.id}`;

    document.getElementById('ticket').classList.remove('oculto');
    document.getElementById('acciones-descarga-ticket').classList.remove('oculto');
}

function fondoCapturaTicket() {
    return document.documentElement.getAttribute('data-tema') === 'oscuro' ? '#0f1a1f' : '#ffffff';
}

function nombreArchivoTicket(extension) {
    const codigo = pedidoActualTicket ? pedidoActualTicket.id.slice(0, 8) : 'pedido';
    return `ticket-aquatrack-${codigo}.${extension}`;
}

async function generarCanvasTicket() {
    const elementoTicket = document.getElementById('ticket');

    return html2canvas(elementoTicket, {
        scale: 2,
        backgroundColor: fondoCapturaTicket(),
        useCORS: true
    });
}

async function descargarTicketComoJpg() {
    const botonJpg = document.getElementById('boton-descargar-jpg');
    botonJpg.disabled = true;
    botonJpg.textContent = 'Generando...';

    try {
        const canvas = await generarCanvasTicket();
        const enlace = document.createElement('a');
        enlace.download = nombreArchivoTicket('jpg');
        enlace.href = canvas.toDataURL('image/jpeg', 0.95);
        enlace.click();
    } catch (error) {
        mostrarError('No pudimos generar la imagen del ticket. Probá de nuevo.');
    } finally {
        botonJpg.disabled = false;
        botonJpg.textContent = 'Descargar JPG';
    }
}

async function descargarTicketComoPdf() {
    const botonPdf = document.getElementById('boton-descargar-pdf');
    botonPdf.disabled = true;
    botonPdf.textContent = 'Generando...';

    try {
        const canvas = await generarCanvasTicket();
        const imagenDatos = canvas.toDataURL('image/jpeg', 0.95);

        const { jsPDF } = window.jspdf;
        const anchoMm = 80;
        const altoMm = (canvas.height * anchoMm) / canvas.width;

        const documentoPdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [anchoMm, altoMm]
        });

        documentoPdf.addImage(imagenDatos, 'JPEG', 0, 0, anchoMm, altoMm);
        documentoPdf.save(nombreArchivoTicket('pdf'));
    } catch (error) {
        mostrarError('No pudimos generar el PDF del ticket. Probá de nuevo.');
    } finally {
        botonPdf.disabled = false;
        botonPdf.textContent = 'Descargar PDF';
    }
}

document.getElementById('boton-descargar-jpg').addEventListener('click', descargarTicketComoJpg);
document.getElementById('boton-descargar-pdf').addEventListener('click', descargarTicketComoPdf);

async function verificarSesionNav() {
    const { data: { session } } = await supabaseCliente.auth.getSession();
    document.getElementById('nav-invitado').classList.toggle('oculto', Boolean(session));
    document.getElementById('nav-usuario').classList.toggle('oculto', !session);
}

document.getElementById('boton-cerrar-sesion').addEventListener('click', async () => {
    await supabaseCliente.auth.signOut();
    window.location.href = 'login.html';
});

document.getElementById('boton-volver-ticket').addEventListener('click', () => {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = 'historial.html';
    }
});

cargarTicket();
verificarSesionNav();