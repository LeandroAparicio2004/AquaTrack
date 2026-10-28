function textoPagoHojaRuta(pedido, pagos, dinero) {
    if (pedido.metodo_pago !== 'transferencia') {
        return `COBRAR ${dinero(pedido.total)}\n(efectivo)`;
    }

    return pagos[pedido.pago_transferencia_id] === 'confirmado'
        ? 'PAGADO\n(transferencia)'
        : 'NO COBRAR\n(transferencia en verificación)';
}

async function generarHojaRutaPdf(idRepartidor, boton) {
    const textoOriginal = boton.textContent;
    boton.disabled = true;
    boton.textContent = 'Generando...';

    try {
        const { data: entregas, error } = await supabaseCliente
            .from('entregas')
            .select(`
                id, asignada_en,
                pedidos!inner (
                    id, total, metodo_pago, pago_transferencia_id, distribuidora_id,
                    direccion_calle, direccion_numero, direccion_ciudad, direccion_referencia,
                    usuarios!pedidos_cliente_id_fkey ( nombre, apellido, telefono ),
                    detalles_pedidos ( cantidad, productos ( nombre ) )
                )
            `)
            .eq('repartidor_id', idRepartidor)
            .eq('pedidos.distribuidora_id', distribuidoraActual.id)
            .in('estado', ['asignada', 'en_camino'])
            .order('asignada_en', { ascending: true });

        if (error || !entregas || entregas.length === 0) {
            alert('Este repartidor no tiene entregas asignadas para imprimir.');
            return;
        }

        const idsPagos = entregas.map((e) => e.pedidos.pago_transferencia_id).filter(Boolean);
        const pagos = {};

        if (idsPagos.length > 0) {
            const { data } = await supabaseCliente
                .from('pagos_transferencia')
                .select('id, estado')
                .in('id', idsPagos);

            (data || []).forEach((pago) => { pagos[pago.id] = pago.estado; });
        }

        const repartidor = repartidoresTablero.find((m) => m.usuario_id === idRepartidor);
        const nombreRepartidor = `${repartidor?.usuarios?.nombre || ''} ${repartidor?.usuarios?.apellido || ''}`.trim() || 'Repartidor';
        const fecha = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
        const dinero = (valor) => `$ ${Number(valor || 0).toLocaleString('es-AR')}`;

        let totalBidones = 0;
        let totalCobrar = 0;
        let totalPagado = 0;

        const filas = entregas.map((entrega, indice) => {
            const pedido = entrega.pedidos;
            const cantidad = (pedido.detalles_pedidos || []).reduce((suma, d) => suma + d.cantidad, 0);
            const pagado = pedido.metodo_pago === 'transferencia' && pagos[pedido.pago_transferencia_id] === 'confirmado';

            totalBidones += cantidad;

            if (pagado) {
                totalPagado += Number(pedido.total);
            } else if (pedido.metodo_pago !== 'transferencia') {
                totalCobrar += Number(pedido.total);
            }

            const destino = [
                `${pedido.direccion_calle || ''} ${pedido.direccion_numero || ''}`.trim(),
                pedido.direccion_ciudad,
                pedido.direccion_referencia ? `(${pedido.direccion_referencia})` : ''
            ].filter(Boolean).join(', ');

            const cliente = `${pedido.usuarios?.nombre || ''} ${pedido.usuarios?.apellido || ''}`.trim();
            const referencia = String(pedido.id).slice(-6).toUpperCase();

            return [
                indice + 1,
                `${cliente}\n${destino}\nTel: ${pedido.usuarios?.telefono || '-'}`,
                `${(pedido.detalles_pedidos || []).map((d) => `${d.cantidad} x ${d.productos?.nombre || 'Producto'}`).join('\n')}\nRef. ${referencia}`,
                textoPagoHojaRuta(pedido, pagos, dinero),
                ''
            ];
        });

        const { jsPDF } = window.jspdf;
        const documento = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

        documento.setFontSize(16);
        documento.text(`Hoja de ruta - ${distribuidoraActual.nombre}`, 14, 15);
        documento.setFontSize(10);
        documento.text(`Repartidor: ${nombreRepartidor}`, 14, 22);
        documento.text(`Fecha: ${fecha}`, 14, 27);        documento.text(`Paradas: ${entregas.length}   |   Bidones: ${totalBidones}`, 14, 32);

        documento.autoTable({
            startY: 36,
            head: [['N.', 'Cliente y dirección', 'Pedido', 'Cobrar', 'Firma del cliente']],
            body: filas,
            styles: { fontSize: 9, cellPadding: 2.5, valign: 'middle', lineColor: [150, 150, 150], lineWidth: 0.2 },
            headStyles: { fillColor: [11, 113, 143], textColor: 255 },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 90 },
                2: { cellWidth: 50 },
                3: { cellWidth: 40 },
                4: { cellWidth: 'auto' }
            },
            bodyStyles: { minCellHeight: 20 }
        });


        let y = documento.lastAutoTable.finalY + 8;

        if (y > 185) {
            documento.addPage();
            y = 20;
        }

        documento.setFontSize(10);
        documento.text(`Total a cobrar en efectivo: ${dinero(totalCobrar)}`, 14, y);
        documento.text(`Ya pagado por transferencia: ${dinero(totalPagado)}`, 14, y + 6);
        documento.line(180, y + 8, 270, y + 8);
        documento.text('Firma del repartidor', 180, y + 13);

        const nombreArchivo = `hoja-ruta-${nombreRepartidor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`;
        documento.save(nombreArchivo);
    } catch (errorGeneral) {
        console.error('Error al generar la hoja de ruta:', errorGeneral);
        alert('No pudimos generar la hoja de ruta. Intentá de nuevo.');
    } finally {
        boton.disabled = false;
        boton.textContent = textoOriginal;
    }
}

document.addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-imprimir-ruta]');

    if (boton) {
        generarHojaRutaPdf(boton.dataset.imprimirRuta, boton);
    }
});