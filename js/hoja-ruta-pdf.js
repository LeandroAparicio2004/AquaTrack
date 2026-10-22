function textoPagoHojaRuta(pedido, pagos) {
    if (pedido.metodo_pago !== 'transferencia') {
        return 'EFECTIVO\nCOBRAR AL ENTREGAR';
    }

    return pagos[pedido.pago_transferencia_id] === 'confirmado'
        ? 'TRANSFERENCIA\nYA PAGADO'
        : 'TRANSFERENCIA\nPAGO POR VERIFICAR';
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

            return [
                indice + 1,
                destino,
                `${pedido.usuarios?.nombre || ''} ${pedido.usuarios?.apellido || ''}`.trim(),
                pedido.usuarios?.telefono || '-',
                (pedido.detalles_pedidos || []).map((d) => `${d.cantidad} x ${d.productos?.nombre || 'Producto'}`).join('\n'),
                cantidad,
                dinero(pedido.total),
                textoPagoHojaRuta(pedido, pagos),
                ''
            ];
        });

        const { jsPDF } = window.jspdf;
        const documento = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

        documento.setFontSize(16);
        documento.text(`Hoja de ruta - ${distribuidoraActual.nombre}`, 14, 15);
        documento.setFontSize(10);
        documento.text(`Repartidor: ${nombreRepartidor}`, 14, 22);
        documento.text(`Fecha: ${fecha}`, 14, 27);
        documento.text(`Paradas: ${entregas.length}   |   Bidones/productos: ${totalBidones}`, 14, 32);

        documento.autoTable({
            startY: 36,
            head: [['N.', 'Destino', 'Cliente', 'Teléfono', 'Pedido', 'Cant.', 'Monto', 'Pago', 'Firma de recibido']],
            body: filas,
            styles: { fontSize: 8.5, cellPadding: 2, valign: 'middle', lineColor: [150, 150, 150], lineWidth: 0.2 },
            headStyles: { fillColor: [11, 113, 143], textColor: 255 },
            columnStyles: {
                0: { cellWidth: 9, halign: 'center' },
                1: { cellWidth: 55 },
                2: { cellWidth: 35 },
                3: { cellWidth: 26 },
                4: { cellWidth: 45 },
                5: { cellWidth: 12, halign: 'center' },
                6: { cellWidth: 22, halign: 'right' },
                7: { cellWidth: 32 },
                8: { cellWidth: 'auto' }
            },
            bodyStyles: { minCellHeight: 16 }
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