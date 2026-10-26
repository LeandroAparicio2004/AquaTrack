const etiquetasEstadoCuenta = {
    pendiente: 'Programada',
    asignado: 'Programada',
    en_camino: 'En camino',
    entregado: 'Entregada'
};

function dineroCuenta(valor) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(valor || 0);
}

function fechaCuenta(valor) {
    if (!valor) {
        return '-';
    }

    return new Date(`${valor}T00:00:00`).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function calcularCuentaSuscripcion(pedidos) {
    const filas = (pedidos || [])
        .filter((pedido) => pedido.estado !== 'cancelado')
        .map((pedido) => {
            const total = Number(pedido.total) || 0;
            const entregado = pedido.estado === 'entregado';
            const entrega = (pedido.entregas || []).find((item) => item.monto_cobrado != null);
            let pagado = 0;
            let textoPago;

            if (pedido.metodo_pago === 'efectivo') {
                if (entregado) {
                    pagado = entrega ? Number(entrega.monto_cobrado) : total;
                    textoPago = `Cobrado en efectivo (${dineroCuenta(pagado)})`;
                } else {
                    textoPago = 'Se cobra en efectivo al entregar';
                }
            } else if (pedido.pagos_transferencia?.estado === 'confirmado') {
                pagado = total;
                textoPago = 'Pagado por transferencia';
            } else if (pedido.pagos_transferencia?.estado === 'rechazado') {
                textoPago = 'Pago rechazado';
            } else {
                textoPago = 'Transferencia en verificación';
            }

            return {
                fecha: pedido.fecha_entrega,
                estado: etiquetasEstadoCuenta[pedido.estado] || pedido.estado,
                entregado,
                total,
                pagado,
                textoPago
            };
        });

    const hechas = filas.filter((fila) => fila.entregado);
    const entregadoTotal = hechas.reduce((suma, fila) => suma + fila.total, 0);
    const pagadoTotal = filas.reduce((suma, fila) => suma + fila.pagado, 0);

    return {
        filas,
        entregasHechas: hechas.length,
        entregasTotales: filas.length,
        entregadoTotal,
        pagadoTotal,
        saldo: entregadoTotal - pagadoTotal
    };
}

async function obtenerCuentaSuscripcion(idSuscripcion) {
    const { data, error } = await supabaseCliente
        .from('pedidos')
        .select(`
            id, fecha_entrega, estado, total, metodo_pago,
            pagos_transferencia ( estado ),
            entregas ( monto_cobrado )
        `)
        .eq('suscripcion_id', idSuscripcion)
        .order('fecha_entrega', { ascending: true });

    if (error) {
        return null;
    }

    return calcularCuentaSuscripcion(data);
}

function htmlCuentaSuscripcion(cuenta) {
    if (!cuenta || cuenta.filas.length === 0) {
        return '<p class="estado-suscripciones">Todavía no hay entregas en esta suscripción.</p>';
    }

    const etiquetaSaldo = cuenta.saldo > 0 ? 'Falta pagar' : cuenta.saldo < 0 ? 'Saldo a favor' : 'Saldo';

    return `
        <div class="cuenta-totales">
            <div><span>Entregas hechas</span><strong>${cuenta.entregasHechas} de ${cuenta.entregasTotales}</strong></div>
            <div><span>Entregado</span><strong>${dineroCuenta(cuenta.entregadoTotal)}</strong></div>
            <div><span>Pagado</span><strong>${dineroCuenta(cuenta.pagadoTotal)}</strong></div>
            <div><span>${etiquetaSaldo}</span><strong>${dineroCuenta(Math.abs(cuenta.saldo))}</strong></div>
        </div>

        <div class="cuenta-lista">
            ${cuenta.filas.map((fila) => `
                <div class="cuenta-fila ${fila.entregado ? 'hecha' : ''}">
                    <div>
                        <strong>${fechaCuenta(fila.fecha)}</strong>
                        <span>${fila.estado}</span>
                    </div>
                    <div>
                        <strong>${dineroCuenta(fila.total)}</strong>
                        <span>${fila.textoPago}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}