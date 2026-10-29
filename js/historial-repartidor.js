(function () {
    const seccion = document.getElementById('seccion-rutas');
    if (!seccion || typeof supabaseCliente === 'undefined') return;

    const vistaLista = document.getElementById('hist-lista-vista');
    const vistaDetalle = document.getElementById('hist-detalle-vista');
    const selectPeriodo = document.getElementById('hist-periodo');
    const estado = document.getElementById('hist-estado');
    const contenedorLista = document.getElementById('hist-salidas');
    const tituloDetalle = document.getElementById('hist-titulo-detalle');
    const resumenDetalle = document.getElementById('hist-resumen');
    const listaDetalle = document.getElementById('hist-paradas');

    let salidas = [];

    function escapar(valor) {
        const div = document.createElement('div');
        div.textContent = valor === null || valor === undefined ? '' : String(valor);
        return div.innerHTML;
    }

    function moneda(valor) {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(valor) || 0);
    }

    function fechaLarga(valor) {
        return new Date(valor).toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: '2-digit' });
    }

    function hora(valor) {
        return valor ? new Date(valor).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
    }

    function nombreCliente(pedido) {
        return `${pedido?.usuarios?.nombre || ''} ${pedido?.usuarios?.apellido || ''}`.trim() || 'Cliente';
    }

    function direccion(pedido) {
        return `${pedido?.direccion_calle || ''} ${pedido?.direccion_numero || ''}, ${pedido?.direccion_ciudad || ''}`.trim();
    }

    function productos(pedido) {
        return (pedido?.detalles_pedidos || []).map((d) => `${d.cantidad}x ${d.productos?.nombre || 'Producto'}`).join(' · ');
    }

    function mostrar(vista) {
        vistaLista.hidden = vista !== 'lista';
        vistaDetalle.hidden = vista !== 'detalle';
    }

    async function cargarHistorial() {
        mostrar('lista');

        const { data: { session } } = await supabaseCliente.auth.getSession();
        if (!session) return;

        const desde = new Date();
        desde.setDate(desde.getDate() - Number(selectPeriodo.value || 7));
        desde.setHours(0, 0, 0, 0);
        const desdeISO = desde.toISOString();

        const [entregas, intentos] = await Promise.all([
            supabaseCliente
                .from('entregas')
                .select(`
                    id, estado, iniciada_en, entregada_en, monto_cobrado,
                    pedidos ( total, metodo_pago, direccion_calle, direccion_numero, direccion_ciudad,
                        usuarios!pedidos_cliente_id_fkey ( nombre, apellido ),
                        detalles_pedidos ( cantidad, productos ( nombre ) ) )
                `)
                .eq('repartidor_id', session.user.id)
                .not('iniciada_en', 'is', null)
                .gte('iniciada_en', desdeISO)
                .order('iniciada_en', { ascending: false }),
            supabaseCliente
                .from('intentos_entrega')
                .select(`
                    id, motivo, creado_en,
                    pedidos ( total, metodo_pago, direccion_calle, direccion_numero, direccion_ciudad,
                        usuarios!pedidos_cliente_id_fkey ( nombre, apellido ),
                        detalles_pedidos ( cantidad, productos ( nombre ) ) )
                `)
                .eq('repartidor_id', session.user.id)
                .gte('creado_en', desdeISO)
                .order('creado_en', { ascending: false })
        ]);

        if (entregas.error || intentos.error) {
            contenedorLista.innerHTML = '';
            estado.textContent = 'No pudimos cargar tu historial. Recargá la página.';
            estado.classList.remove('oculto');
            return;
        }

        const grupos = {};

        (entregas.data || []).forEach((entrega) => {
            const clave = entrega.iniciada_en;
            grupos[clave] = grupos[clave] || { inicio: clave, hechas: [], fallidas: [], enCurso: 0 };

            if (entrega.estado === 'entregada') {
                grupos[clave].hechas.push(entrega);
            } else {
                grupos[clave].enCurso += 1;
            }
        });

        const inicios = Object.keys(grupos).sort((a, b) => new Date(b) - new Date(a));

        (intentos.data || []).forEach((intento) => {
            const instante = new Date(intento.creado_en);
            const inicio = inicios.find((clave) => new Date(clave) <= instante);

            if (inicio) {
                grupos[inicio].fallidas.push(intento);
            } else {
                grupos[intento.creado_en] = { inicio: intento.creado_en, hechas: [], fallidas: [intento], enCurso: 0 };
            }
        });

        salidas = Object.values(grupos).sort((a, b) => new Date(b.inicio) - new Date(a.inicio));

        if (salidas.length === 0) {
            contenedorLista.innerHTML = '';
            estado.textContent = 'Todavía no hiciste salidas en este período.';
            estado.classList.remove('oculto');
            return;
        }

        estado.classList.add('oculto');

        contenedorLista.innerHTML = salidas.map((salida, indice) => {
            const total = salida.hechas.reduce((suma, e) => suma + Number(e.pedidos?.total || 0), 0);

            return `
                <button type="button" class="tarjeta-salida" data-salida="${indice}">
                    <div>
                        <strong>Salida · ${escapar(fechaLarga(salida.inicio))}</strong>
                        <span>${hora(salida.inicio)} hs${salida.enCurso ? ' · En curso' : ''}</span>
                        <span>${salida.hechas.length} entregada${salida.hechas.length === 1 ? '' : 's'}${salida.fallidas.length ? ` · ${salida.fallidas.length} no entregada${salida.fallidas.length === 1 ? '' : 's'}` : ''}</span>
                    </div>
                    <b>${moneda(total)}</b>
                </button>
            `;
        }).join('');
    }

    function abrirDetalle(indice) {
        const salida = salidas[indice];
        if (!salida) return;

        const efectivo = salida.hechas
            .filter((e) => e.pedidos?.metodo_pago !== 'transferencia')
            .reduce((suma, e) => suma + Number(e.monto_cobrado || e.pedidos?.total || 0), 0);
        const transferencia = salida.hechas
            .filter((e) => e.pedidos?.metodo_pago === 'transferencia')
            .reduce((suma, e) => suma + Number(e.pedidos?.total || 0), 0);

        tituloDetalle.textContent = `Salida · ${fechaLarga(salida.inicio)} · ${hora(salida.inicio)}`;

        resumenDetalle.innerHTML = `
            <div><span>Entregadas</span><strong>${salida.hechas.length}</strong></div>
            <div><span>No entregadas</span><strong>${salida.fallidas.length}</strong></div>
            <div><span>Efectivo cobrado</span><strong>${moneda(efectivo)}</strong></div>
            <div><span>Transferencias</span><strong>${moneda(transferencia)}</strong></div>
        `;

        const filas = [
            ...salida.hechas.map((e) => ({ tipo: 'ok', momento: e.entregada_en, pedido: e.pedidos })),
            ...salida.fallidas.map((i) => ({ tipo: 'fallo', momento: i.creado_en, pedido: i.pedidos, motivo: i.motivo }))
        ].sort((a, b) => new Date(a.momento) - new Date(b.momento));

        listaDetalle.innerHTML = filas.map((fila) => `
            <article class="parada-historial ${fila.tipo === 'ok' ? 'ok' : 'fallo'}">
                <div class="parada-historial-cabecera">
                    <strong>${fila.tipo === 'ok' ? '✔' : '✖'} ${escapar(nombreCliente(fila.pedido))}</strong>
                    <span>${hora(fila.momento)}</span>
                </div>
                <p>${escapar(direccion(fila.pedido))}</p>
                <p>${escapar(productos(fila.pedido))}</p>
                <p class="parada-historial-pie">
                    ${fila.tipo === 'ok'
                ? `${fila.pedido?.metodo_pago === 'transferencia' ? 'Transferencia' : 'Efectivo'} · <b>${moneda(fila.pedido?.total)}</b>`
                : `No entregado: ${escapar(fila.motivo || 'sin motivo')}`}
                </p>
            </article>
        `).join('') || '<p class="estado-productos-panel">Esta salida no tiene paradas registradas.</p>';

        mostrar('detalle');
        window.scrollTo({ top: 0 });
    }

    contenedorLista.addEventListener('click', (evento) => {
        const tarjeta = evento.target.closest('[data-salida]');
        if (tarjeta) abrirDetalle(Number(tarjeta.dataset.salida));
    });

    document.getElementById('hist-volver').addEventListener('click', () => mostrar('lista'));
    selectPeriodo.addEventListener('change', cargarHistorial);

    window.cargarHojasRuta = cargarHistorial;
})();