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

const etiquetasEstado = {
    pendiente_aprobacion: { clase: 'pendiente', texto: 'Pendiente' },
    activa: { clase: 'activo', texto: 'Activa' },
    rechazada: { clase: 'rechazada', texto: 'Rechazada' },
    suspendida: { clase: 'suspendida', texto: 'Suspendida' }
};

function crearTarjetaDistribuidora(distribuidora, conAcciones) {
    const etiqueta = etiquetasEstado[distribuidora.estado] || { clase: 'inactivo', texto: distribuidora.estado };

    const direccion = [distribuidora.calle, distribuidora.numero, distribuidora.ciudad, distribuidora.provincia]
        .filter(Boolean)
        .join(', ') || 'Sin dirección cargada';

    const acciones = conAcciones
        ? `
      <div class="tarjeta-producto-panel-acciones">
        <button type="button" class="btn btn-principal btn-chico" data-aprobar="${distribuidora.id}">Aprobar</button>
        <button type="button" class="btn btn-secundario btn-peligro btn-chico" data-rechazar="${distribuidora.id}">Rechazar</button>
      </div>
    `
        : '';

    const tarjeta = document.createElement('article');
    tarjeta.className = 'tarjeta-producto-panel';

    tarjeta.innerHTML = `
    <div class="tarjeta-producto-panel-superior">
      <h3>${escaparHtml(distribuidora.nombre)}</h3>
      <span class="etiqueta-estado-producto ${etiqueta.clase}">${etiqueta.texto}</span>
    </div>
    <p class="tarjeta-producto-panel-descripcion">${escaparHtml(direccion)}</p>
    <div class="tarjeta-producto-panel-detalle">
      <span>${escaparHtml(distribuidora.telefono || 'Sin teléfono')}</span>
      <span>${escaparHtml(distribuidora.email || 'Sin email')}</span>
    </div>
    ${acciones}
  `;

    return tarjeta;
}

async function cargarPendientes() {
    const lista = document.getElementById('lista-pendientes');
    const estadoVacio = document.getElementById('estado-pendientes');

    const { data, error } = await supabaseCliente
        .from('distribuidoras')
        .select('id, nombre, telefono, email, calle, numero, ciudad, provincia, estado')
        .eq('estado', 'pendiente_aprobacion')
        .order('creado_en');

    lista.innerHTML = '';

    if (error) {
        estadoVacio.textContent = 'No pudimos cargar las solicitudes. Recargá la página.';
        estadoVacio.classList.remove('oculto');
        return;
    }

    if (!data || data.length === 0) {
        estadoVacio.textContent = 'No hay distribuidoras pendientes de aprobación por ahora.';
        estadoVacio.classList.remove('oculto');
        return;
    }

    estadoVacio.classList.add('oculto');

    data.forEach((distribuidora) => {
        lista.appendChild(crearTarjetaDistribuidora(distribuidora, true));
    });
}

async function cargarTodas() {
    const lista = document.getElementById('lista-todas');
    const estadoVacio = document.getElementById('estado-todas');

    const { data, error } = await supabaseCliente
        .from('distribuidoras')
        .select('id, nombre, telefono, email, calle, numero, ciudad, provincia, estado')
        .order('creado_en', { ascending: false });

    lista.innerHTML = '';

    if (error) {
        estadoVacio.textContent = 'No pudimos cargar las distribuidoras. Recargá la página.';
        estadoVacio.classList.remove('oculto');
        return;
    }

    if (!data || data.length === 0) {
        estadoVacio.textContent = 'Todavía no hay ninguna distribuidora registrada.';
        estadoVacio.classList.remove('oculto');
        return;
    }

    estadoVacio.classList.add('oculto');

    data.forEach((distribuidora) => {
        lista.appendChild(crearTarjetaDistribuidora(distribuidora, false));
    });
}

async function resolverSolicitud(id, nuevoEstado, boton) {
    boton.disabled = true;

    const { error } = await supabaseCliente
        .from('distribuidoras')
        .update({ estado: nuevoEstado })
        .eq('id', id);

    if (error) {
        alert('No pudimos actualizar la distribuidora. Intentá de nuevo.');
        boton.disabled = false;
        return;
    }

    await cargarPendientes();
}

document.getElementById('lista-pendientes').addEventListener('click', (evento) => {
    const botonAprobar = evento.target.closest('[data-aprobar]');
    const botonRechazar = evento.target.closest('[data-rechazar]');

    if (botonAprobar) {
        resolverSolicitud(botonAprobar.dataset.aprobar, 'activa', botonAprobar);
    }

    if (botonRechazar) {
        const confirmado = confirm('¿Seguro que querés rechazar esta distribuidora?');

        if (confirmado) {
            resolverSolicitud(botonRechazar.dataset.rechazar, 'rechazada', botonRechazar);
        }
    }
});

function formatearPrecioAdmin(precio) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0
    }).format(Number(precio) || 0);
}

function crearTarjetaPago(pago) {
    const cliente = pago.usuarios
        ? `${pago.usuarios.nombre || ''} ${pago.usuarios.apellido || ''}`.trim()
        : 'Cliente';

    const fecha = pago.creado_en
        ? new Date(pago.creado_en).toLocaleString('es-AR')
        : '';

    const desglose = (pago.desglose || []).map((item) => {
        const estaPagada = Boolean(item.liquidacion?.pagado);

        const accionPago = estaPagada
            ? `<span class="etiqueta-pagada-distribuidora">
                 ✓ Pagada el ${escaparHtml(new Date(item.liquidacion.pagado_en).toLocaleDateString('es-AR'))}
               </span>`
            : `<button type="button" class="btn btn-secundario btn-chico" data-marcar-pagada="${pago.id}" data-distribuidora="${item.distribuidora_id}" data-monto="${item.monto}">
                 Marcar como pagada
               </button>`;

        return `
        <div class="fila-desglose-pago">
            <div class="fila-desglose-pago-info">
                <strong>${escaparHtml(item.nombre)}</strong>
                <div class="chips-desglose-pago">
                    <span class="chip-dato-pago">Alias: <strong>${escaparHtml(item.alias || 'No cargado')}</strong></span>
                    <span class="chip-dato-pago">CBU: <strong>${escaparHtml(item.cbu || 'No cargado')}</strong></span>
                    <span class="chip-dato-pago">Titular: <strong>${escaparHtml(item.titular_cuenta || 'No cargado')}</strong></span>
                </div>
            </div>
            <div class="fila-desglose-pago-derecha">
                <div class="fila-desglose-pago-monto">${formatearPrecioAdmin(item.monto)}</div>
                ${accionPago}
            </div>
        </div>
        `;
    }).join('');

    const comprobante = pago.comprobante_url
        ? `<a href="${escaparHtml(pago.comprobante_url)}" target="_blank" rel="noopener" class="enlace-comprobante-pago">Ver comprobante</a>`
        : `<span class="texto-sin-comprobante">El cliente todavía no subió el comprobante.</span>`;

    const tarjeta = document.createElement('article');
    tarjeta.className = 'tarjeta-pago-transferencia';

    tarjeta.innerHTML = `
        <div class="tarjeta-pago-superior">
            <div>
                <h3>${escaparHtml(cliente)}</h3>
                <p class="tarjeta-pago-fecha">${escaparHtml(fecha)}</p>
            </div>
            <span class="etiqueta-estado-producto pendiente">Pendiente</span>
        </div>

        <div class="tarjeta-pago-totales">
            <div class="fila-resumen">
                <span>Monto total transferido</span>
                <strong>${formatearPrecioAdmin(pago.monto_total)}</strong>
            </div>
            <div class="fila-resumen">
                <span>Comisión AquaTrack (${Number(pago.comision_porcentaje) || 0}%)</span>
                <strong>${formatearPrecioAdmin((Number(pago.monto_total) || 0) * (Number(pago.comision_porcentaje) || 0) / 100)}</strong>
            </div>
        </div>

        <div class="tarjeta-pago-comprobante">${comprobante}</div>

        <h4 class="titulo-desglose-pago">A rendir a cada distribuidora</h4>
        <div class="desglose-pago">${desglose || '<p>Sin pedidos asociados.</p>'}</div>

        <div class="tarjeta-producto-panel-acciones">
            <button type="button" class="btn btn-principal btn-chico" data-confirmar-pago="${pago.id}">
                Confirmar pago recibido
            </button>
        </div>
    `;

    return tarjeta;
}

async function cargarPagosTransferencia() {
    const lista = document.getElementById('lista-pagos-transferencia');
    const estadoVacio = document.getElementById('estado-pagos');

    const { data, error } = await supabaseCliente
        .from('pagos_transferencia')
        .select(`
            id, monto_total, comision_porcentaje, comprobante_url, estado, creado_en,
            usuarios!pagos_transferencia_cliente_id_fkey ( nombre, apellido )
        `)
        .eq('estado', 'pendiente')
        .order('creado_en', { ascending: false });

    lista.innerHTML = '';

    if (error) {
        console.error('Error al cargar pagos_transferencia:', error);
        estadoVacio.textContent = 'No pudimos cargar los pagos. Recargá la página.';
        estadoVacio.classList.remove('oculto');
        return;
    }

    if (!data || data.length === 0) {
        estadoVacio.textContent = 'No hay pagos por transferencia pendientes de confirmar.';
        estadoVacio.classList.remove('oculto');
        return;
    }

    estadoVacio.classList.add('oculto');

    for (const pago of data) {
        const { data: pedidosDelPago } = await supabaseCliente
            .from('pedidos')
            .select('total, distribuidoras ( id, nombre, alias, cbu, titular_cuenta )')
            .eq('pago_transferencia_id', pago.id);

        const mapaDesglose = new Map();

        // Porce%
        const comisionDelPago = Number(pago.comision_porcentaje) || 0;

        (pedidosDelPago || []).forEach((pedido) => {
            const idDistribuidora = pedido.distribuidoras?.id;

            if (!idDistribuidora) {
                return;
            }

            if (!mapaDesglose.has(idDistribuidora)) {
                mapaDesglose.set(idDistribuidora, {
                    distribuidora_id: idDistribuidora,
                    nombre: pedido.distribuidoras?.nombre || 'Distribuidora',
                    alias: pedido.distribuidoras?.alias,
                    cbu: pedido.distribuidoras?.cbu,
                    titular_cuenta: pedido.distribuidoras?.titular_cuenta,
                    monto: 0
                });
            }

            const totalPedido = Number(pedido.total) || 0;
            const montoNeto = totalPedido * (1 - comisionDelPago / 100);

            mapaDesglose.get(idDistribuidora).monto += montoNeto;
        });

        const { data: liquidaciones } = await supabaseCliente
            .from('liquidaciones_distribuidora')
            .select('distribuidora_id, pagado, pagado_en')
            .eq('pago_transferencia_id', pago.id);

        const mapaLiquidaciones = new Map(
            (liquidaciones || []).map((liq) => [liq.distribuidora_id, liq])
        );

        pago.desglose = Array.from(mapaDesglose.values()).map((item) => ({
            ...item,
            liquidacion: mapaLiquidaciones.get(item.distribuidora_id) || null
        }));

        lista.appendChild(crearTarjetaPago(pago));
    }
}

async function confirmarPago(id, boton) {
    boton.disabled = true;
    boton.textContent = 'Confirmando...';

    const {
        data: { session }
    } = await supabaseCliente.auth.getSession();

    const { error } = await supabaseCliente
        .from('pagos_transferencia')
        .update({
            estado: 'confirmado',
            confirmado_por: session?.user?.id || null,
            confirmado_en: new Date().toISOString()
        })
        .eq('id', id);

    if (error) {
        alert('No pudimos confirmar el pago. Intentá de nuevo.');
        boton.disabled = false;
        boton.textContent = 'Confirmar pago recibido';
        return;
    }

    await cargarPagosTransferencia();
}

async function marcarDistribuidoraPagada(idPago, idDistribuidora, monto, boton) {
    boton.disabled = true;
    boton.textContent = 'Guardando...';

    const {
        data: { session }
    } = await supabaseCliente.auth.getSession();

    const { error } = await supabaseCliente
        .from('liquidaciones_distribuidora')
        .upsert({
            pago_transferencia_id: idPago,
            distribuidora_id: idDistribuidora,
            monto: monto,
            pagado: true,
            pagado_por: session?.user?.id || null,
            pagado_en: new Date().toISOString()
        }, { onConflict: 'pago_transferencia_id,distribuidora_id' });

    if (error) {
        console.error('Error al marcar distribuidora como pagada:', error);
        alert('No pudimos guardar el pago a la distribuidora. Intentá de nuevo.');
        boton.disabled = false;
        boton.textContent = 'Marcar como pagada';
        return;
    }

    await cargarPagosTransferencia();
}

document.getElementById('lista-pagos-transferencia')?.addEventListener('click', (evento) => {
    const botonConfirmar = evento.target.closest('[data-confirmar-pago]');
    const botonMarcarPagada = evento.target.closest('[data-marcar-pagada]');

    if (botonConfirmar) {
        const confirmado = confirm(
            '¿Confirmás que la transferencia llegó a la cuenta de AquaTrack?'
        );

        if (confirmado) {
            confirmarPago(botonConfirmar.dataset.confirmarPago, botonConfirmar);
        }
    }

    if (botonMarcarPagada) {
        const confirmado = confirm(
            '¿Confirmás que ya le transferiste a esta distribuidora lo que le corresponde?'
        );

        if (confirmado) {
            marcarDistribuidoraPagada(
                botonMarcarPagada.dataset.marcarPagada,
                botonMarcarPagada.dataset.distribuidora,
                botonMarcarPagada.dataset.monto,
                botonMarcarPagada
            );
        }
    }
});

const pestanas = document.querySelectorAll('.panel-pestana');
const secciones = {
    pendientes: document.getElementById('seccion-pendientes'),
    todas: document.getElementById('seccion-todas'),
    pagos: document.getElementById('seccion-pagos')
};
let seccionTodasCargada = false;
let seccionPagosCargada = false;

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

        if (pestana.dataset.pestana === 'todas' && !seccionTodasCargada) {
            seccionTodasCargada = true;
            cargarTodas();
        }

        if (pestana.dataset.pestana === 'pagos' && !seccionPagosCargada) {
            seccionPagosCargada = true;
            cargarPagosTransferencia();
        }
    });
});

async function inicializarPanel() {
    const { data: { session } } = await supabaseCliente.auth.getSession();

    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    const { data: perfil } = await supabaseCliente
        .from('usuarios')
        .select('rol')
        .eq('id', session.user.id)
        .single();

    if (perfil?.rol !== 'admin') {
        window.location.href = 'productos.html';
        return;
    }

    document.getElementById('panel-cargando').classList.add('oculto');
    document.getElementById('panel-header').classList.remove('oculto');
    document.getElementById('panel-main').classList.remove('oculto');

    cargarPendientes();
}

inicializarPanel();

document.getElementById('boton-cerrar-sesion').addEventListener('click', async () => {
    await supabaseCliente.auth.signOut();
    window.location.href = 'login.html';
});