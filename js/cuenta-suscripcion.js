function dineroCuenta(valor) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(valor || 0);
}

function nombreMesCuenta(periodo) {
    const texto = new Date(`${periodo}T00:00:00`).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

(function agregarEstilosCuenta() {
    const estilo = document.createElement('style');
    estilo.textContent = `
        .cuenta-estado { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 0.85rem; font-weight: 700; }
        .cuenta-estado.pagado { background: #dcfce7; color: #166534; }
        .cuenta-estado.atrasado { background: #fee2e2; color: #b91c1c; }
        .cuenta-estado.pendiente { background: #fef3c7; color: #92400e; }
        .cuenta-fila .btn { margin-top: 6px; }
    `;
    document.head.appendChild(estilo);
})();

async function obtenerCuentaSuscripcion(idSuscripcion) {
    const { data, error } = await supabaseCliente.rpc('pagos_mensuales_suscripcion', {
        p_suscripcion_id: idSuscripcion
    });

    if (error) {
        return null;
    }

    return { id: idSuscripcion, meses: data || [] };
}

function htmlCuentaSuscripcion(cuenta) {
    if (!cuenta || cuenta.meses.length === 0) {
        return '<p class="estado-suscripciones">Todavía no hay entregas en esta suscripción.</p>';
    }

    const esVendedor = !!document.getElementById('lista-suscripciones-panel');

    return `
        <div class="cuenta-lista">
            ${cuenta.meses.map((mes) => {
                const clase = mes.pagado ? 'pagado' : mes.atrasado ? 'atrasado' : 'pendiente';
                const texto = mes.pagado ? 'Pagado' : mes.atrasado ? 'Atrasado' : 'Por pagar';
                const boton = esVendedor
                    ? `<br><button type="button" class="btn btn-secundario btn-chico" data-marcar-mes="${mes.periodo}" data-suscripcion="${cuenta.id}" data-pagado="${mes.pagado ? 'no' : 'si'}">${mes.pagado ? 'Deshacer' : 'Marcar pagado'}</button>`
                    : '';

                return `
                    <div class="cuenta-fila">
                        <div>
                            <strong>${nombreMesCuenta(mes.periodo)}</strong>
                            <span>${mes.entregas} entrega${mes.entregas === 1 ? '' : 's'}</span>
                        </div>
                        <div>
                            <strong>${dineroCuenta(mes.monto)}</strong>
                            <span class="cuenta-estado ${clase}">${texto}</span>${boton}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
        <p class="estado-suscripciones">El monto del mes suma las entregas que ya se programaron.</p>
    `;
}

document.addEventListener('click', async (evento) => {
    const boton = evento.target.closest('[data-marcar-mes]');

    if (!boton) {
        return;
    }

    boton.disabled = true;

    const { error } = await supabaseCliente.rpc('marcar_mes_pagado', {
        p_suscripcion_id: boton.dataset.suscripcion,
        p_periodo: boton.dataset.marcarMes,
        p_pagado: boton.dataset.pagado === 'si'
    });

    if (error) {
        boton.disabled = false;
        alert('No pudimos guardar el pago. Probá de nuevo.');
        return;
    }

    const cuenta = await obtenerCuentaSuscripcion(boton.dataset.suscripcion);
    document.getElementById('contenido-cuenta-suscripcion').innerHTML = htmlCuentaSuscripcion(cuenta);
});