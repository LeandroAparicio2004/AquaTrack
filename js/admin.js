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

        let accionPago;

        if (estaPagada) {
            const enlaceComprobanteLiquidacion = item.liquidacion?.comprobante_url
                ? `<a href="${escaparHtml(item.liquidacion.comprobante_url)}" target="_blank" rel="noopener" class="enlace-comprobante-pago">Ver comprobante</a>`
                : '';

            accionPago = `<span class="etiqueta-pagada-distribuidora">
                 ✓ Pagada el ${escaparHtml(new Date(item.liquidacion.pagado_en).toLocaleDateString('es-AR'))}
               </span>${enlaceComprobanteLiquidacion}`;
        } else if (!pago.comprobante_url) {
            accionPago = `<button type="button" class="btn btn-secundario btn-chico" disabled>
                 Esperando comprobante del cliente
               </button>`;
        } else {
            accionPago = `<button type="button" class="btn btn-secundario btn-chico" data-marcar-pagada="${pago.id}" data-distribuidora="${item.distribuidora_id}" data-monto="${item.monto}">
                 Adjuntar comprobante y pagar
               </button>`;
        }

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
        <div class="desglose-pago">${desglose || '<p>Sin pedidos asociados.</p>'}</div>`;

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

    const { data: movimientosNombres } = await supabaseCliente.rpc('obtener_movimientos_admin', {
        p_desde: null,
        p_hasta: null
    });
    const mapaClientes = new Map((movimientosNombres || []).map((mov) => [mov.pago_id, mov.cliente]));

    for (const pago of data) {
        pago.usuarios = { nombre: mapaClientes.get(pago.id) || '', apellido: '' };

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
            .select('distribuidora_id, pagado, pagado_en, comprobante_url')
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

async function marcarDistribuidoraPagada(idPago, idDistribuidora, monto, boton, archivo) {
    boton.disabled = true;
    boton.textContent = 'Subiendo comprobante...';

    const extension = (archivo.name.split('.').pop() || 'jpg').toLowerCase();
    const ruta = `${idPago}/${idDistribuidora}-${Date.now()}.${extension}`;

    const { error: errorSubida } = await supabaseCliente.storage
        .from('comprobantes-liquidacion')
        .upload(ruta, archivo);

    if (errorSubida) {
        console.error('Error al subir comprobante:', errorSubida);
        alert('No pudimos subir el comprobante. Intentá de nuevo.');
        boton.disabled = false;
        boton.textContent = 'Adjuntar comprobante y pagar';
        return;
    }

    const { data: urlPublica } = supabaseCliente.storage
        .from('comprobantes-liquidacion')
        .getPublicUrl(ruta);

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
            comprobante_url: urlPublica.publicUrl,
            pagado: true,
            pagado_por: session?.user?.id || null,
            pagado_en: new Date().toISOString()
        }, { onConflict: 'pago_transferencia_id,distribuidora_id' });

    if (error) {
        console.error('Error al marcar distribuidora como pagada:', error);
        alert('No pudimos guardar el pago a la distribuidora. Intentá de nuevo.');
        boton.disabled = false;
        boton.textContent = 'Adjuntar comprobante y pagar';
        return;
    }

    const { data: pedidosDelPago } = await supabaseCliente
        .from('pedidos')
        .select('distribuidora_id')
        .eq('pago_transferencia_id', idPago);

    const distribuidorasUnicas = new Set(
        (pedidosDelPago || []).map((pedido) => pedido.distribuidora_id)
    );

    const { data: liquidacionesPagadas } = await supabaseCliente
        .from('liquidaciones_distribuidora')
        .select('distribuidora_id')
        .eq('pago_transferencia_id', idPago)
        .eq('pagado', true);

    if (distribuidorasUnicas.size > 0 && (liquidacionesPagadas || []).length >= distribuidorasUnicas.size) {
        await supabaseCliente
            .from('pagos_transferencia')
            .update({
                estado: 'confirmado',
                confirmado_por: session?.user?.id || null,
                confirmado_en: new Date().toISOString()
            })
            .eq('id', idPago);
    }

    await cargarPagosTransferencia();
}

document.getElementById('lista-pagos-transferencia')?.addEventListener('click', (evento) => {
    const botonMarcarPagada = evento.target.closest('[data-marcar-pagada]');

    if (botonMarcarPagada) {
        const entradaArchivo = document.createElement('input');
        entradaArchivo.type = 'file';
        entradaArchivo.accept = 'image/*,application/pdf';

        entradaArchivo.addEventListener('change', () => {
            const archivo = entradaArchivo.files[0];

            if (!archivo) {
                return;
            }

            const confirmado = confirm(
                '¿Confirmás que ya le transferiste a esta distribuidora lo que le corresponde y que este es el comprobante?'
            );

            if (confirmado) {
                marcarDistribuidoraPagada(
                    botonMarcarPagada.dataset.marcarPagada,
                    botonMarcarPagada.dataset.distribuidora,
                    botonMarcarPagada.dataset.monto,
                    botonMarcarPagada,
                    archivo
                );
            }
        });

        entradaArchivo.click();
    }
});

let movimientosCargados = [];

function formatearFechaMovimiento(valor) {
    return new Date(valor).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function textoEstadoMovimiento(mov) {
    if (/^cancel/i.test(mov.estado_pago)) return 'Cancelado';
    if (mov.pagado) return `Pagado el ${formatearFechaMovimiento(mov.pagado_en)}`;
    if (!mov.tiene_comprobante) return 'Sin comprobante';
    return 'Pendiente de pago a la distribuidora';
}

function renderizarMovimientos() {
    const cuerpo = document.getElementById('lista-movimientos');
    const resumen = document.getElementById('resumen-movimientos');
    const estado = document.getElementById('estado-movimientos');

    if (movimientosCargados.length === 0) {
        cuerpo.innerHTML = '';
        resumen.innerHTML = '';
        estado.textContent = 'No hay movimientos en este período.';
        estado.classList.remove('oculto');
        return;
    }

    estado.classList.add('oculto');

    const vigentes = movimientosCargados.filter((mov) => !/^cancel/i.test(mov.estado_pago) && mov.tiene_comprobante);
    const suma = (filas, campo) => filas.reduce((total, fila) => total + Number(fila[campo] || 0), 0);

    resumen.innerHTML = `
        <div class="tarjeta-resumen-cobro"><span>Total transferido</span><strong>${formatearPrecioAdmin(suma(vigentes, 'bruto'))}</strong></div>
        <div class="tarjeta-resumen-cobro"><span>Comisión AquaTrack</span><strong>${formatearPrecioAdmin(suma(vigentes, 'comision'))}</strong></div>
        <div class="tarjeta-resumen-cobro"><span>Rendido a distribuidoras</span><strong>${formatearPrecioAdmin(suma(vigentes.filter((m) => m.pagado), 'neto'))}</strong></div>
        <div class="tarjeta-resumen-cobro"><span>Pendiente de rendir</span><strong>${formatearPrecioAdmin(suma(vigentes.filter((m) => !m.pagado && m.tiene_comprobante), 'neto'))}</strong></div>
    `;

    cuerpo.innerHTML = movimientosCargados.map((mov) => `
        <tr>
            <td>${formatearFechaMovimiento(mov.fecha)}</td>
            <td>${escaparHtml(mov.cliente || 'Cliente')}</td>
            <td>${escaparHtml(mov.distribuidora)}</td>
            <td>${formatearPrecioAdmin(mov.bruto)}</td>
            <td>${formatearPrecioAdmin(mov.comision)} (${Number(mov.comision_porcentaje)}%)</td>
            <td><strong>${formatearPrecioAdmin(mov.neto)}</strong></td>
            <td>${escaparHtml(textoEstadoMovimiento(mov))}</td>
        </tr>
    `).join('');
}

async function cargarMovimientos() {
    const estado = document.getElementById('estado-movimientos');
    const desde = document.getElementById('movimientos-desde').value || null;
    const hasta = document.getElementById('movimientos-hasta').value || null;

    const { data, error } = await supabaseCliente.rpc('obtener_movimientos_admin', {
        p_desde: desde,
        p_hasta: hasta
    });

    if (error) {
        estado.textContent = 'No pudimos cargar los movimientos. Recargá la página.';
        estado.classList.remove('oculto');
        return;
    }

    movimientosCargados = data || [];
    renderizarMovimientos();
}

document.getElementById('btn-filtrar-movimientos').addEventListener('click', cargarMovimientos);

document.getElementById('btn-exportar-movimientos').addEventListener('click', () => {
    if (movimientosCargados.length === 0) {
        alert('No hay movimientos para exportar.');
        return;
    }

    const filas = movimientosCargados.map((mov) => ({
        'Fecha': formatearFechaMovimiento(mov.fecha),
        'Cliente': mov.cliente,
        'Distribuidora': mov.distribuidora,
        'Pedidos': mov.cantidad_pedidos,
        'Monto bruto': Number(mov.bruto),
        'Comisión (%)': Number(mov.comision_porcentaje),
        'Comisión ($)': Number(mov.comision),
        'Neto a rendir': Number(mov.neto),
        'Estado': textoEstadoMovimiento(mov)
    }));

    const hoja = XLSX.utils.json_to_sheet(filas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Movimientos');
    XLSX.writeFile(libro, 'aquatrack-movimientos.xlsx');
});

const pestanas = document.querySelectorAll('.panel-pestana');
const secciones = {
    pendientes: document.getElementById('seccion-pendientes'),
    todas: document.getElementById('seccion-todas'),
    pagos: document.getElementById('seccion-pagos'),
    movimientos: document.getElementById('seccion-movimientos'),
    publicidad: document.getElementById('seccion-publicidad-admin')
};
let seccionTodasCargada = false;
let seccionPagosCargada = false;
let seccionPublicidadAdminCargada = false;
let usuarioActualId = null;

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

        if (pestana.dataset.pestana === 'movimientos') {
            cargarMovimientos();
        }

        if (pestana.dataset.pestana === 'publicidad' && !seccionPublicidadAdminCargada) {
            seccionPublicidadAdminCargada = true;
            cargarPublicidadAdmin();
        }
    });
});

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

    if (perfil?.rol !== 'admin') {
        window.location.href = 'productos.html';
        return;
    }

    document.getElementById('panel-cargando').classList.add('oculto');
    document.getElementById('panel-header').classList.remove('oculto');
    document.getElementById('panel-main').classList.remove('oculto');

    cargarPendientes();
}

function abrirPestanaDesdeHash() {
    const nombre = window.location.hash.replace('#', '');

    if (nombre) {
        document.querySelector(`.panel-pestana[data-pestana="${nombre}"]`)?.click();
    }
}

window.addEventListener('hashchange', abrirPestanaDesdeHash);
inicializarPanel().then(abrirPestanaDesdeHash);

document.getElementById('boton-cerrar-sesion').addEventListener('click', async () => {
    await supabaseCliente.auth.signOut();
    localStorage.removeItem('aquatrack_carrito');
    window.location.href = 'login.html';
});

// ---------- Publicidad (admin) ----------

function formatearFechaAdmin(valor) {
    if (!valor) return '—';
    return new Date(valor).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

async function cargarPublicidadAdmin() {
    const lista = document.getElementById('lista-publicidad-admin');
    const estadoVacio = document.getElementById('estado-publicidad-admin');

    const { data, error } = await supabaseCliente
        .from('anuncios')
        .select(`
            id, titulo, descripcion, imagen_url, monto, comprobante_url, estado, creado_en, fecha_fin, renovacion_solicitada,
            distribuidoras ( nombre )
        `)
        .in('estado', ['pendiente_aprobacion', 'activo'])
        .order('estado', { ascending: true })
        .order('creado_en', { ascending: true });

    lista.innerHTML = '';

    if (error) {
        estadoVacio.textContent = 'No pudimos cargar los anuncios. Recargá la página.';
        estadoVacio.classList.remove('oculto');
        return;
    }

    if (!data || data.length === 0) {
        estadoVacio.textContent = 'No hay anuncios pendientes ni activos.';
        estadoVacio.classList.remove('oculto');
        return;
    }

    estadoVacio.classList.add('oculto');

    data.forEach((anuncio) => {
        const tarjeta = document.createElement('article');
        tarjeta.className = 'tarjeta-producto-panel';

        const esPendiente = anuncio.estado === 'pendiente_aprobacion';
        const esRenovacion = Boolean(anuncio.renovacion_solicitada);
        const requiereRevision = esPendiente || esRenovacion;

        const comprobante = anuncio.comprobante_url
            ? `<a href="${escaparHtml(anuncio.comprobante_url)}" target="_blank" rel="noopener" class="enlace-comprobante-pago">Ver comprobante</a>`
            : '<span class="texto-sin-comprobante">Sin comprobante.</span>';

        const acciones = requiereRevision
            ? `
                <button type="button" class="btn btn-principal btn-chico" data-aprobar-anuncio="${anuncio.id}">${esRenovacion ? 'Aprobar renovación' : 'Aprobar'}</button>
                <button type="button" class="btn btn-secundario btn-chico btn-peligro" data-rechazar-anuncio="${anuncio.id}"
                    data-renovacion="${esRenovacion ? '1' : ''}" data-estado="${anuncio.estado}">Rechazar</button>
            `
            : `
                <button type="button" class="btn btn-secundario btn-chico btn-peligro" data-desactivar-anuncio="${anuncio.id}">Desactivar</button>
            `;

        tarjeta.innerHTML = `
            <div class="tarjeta-producto-panel-superior">
                <h3>${escaparHtml(anuncio.titulo)}</h3>
                <span class="etiqueta-estado-producto ${esPendiente ? 'pendiente' : 'activo'}">
                    ${esPendiente ? 'En revisión' : esRenovacion ? 'Renovación pendiente' : 'Activo'}
                </span>
            </div>
            <p class="tarjeta-producto-panel-descripcion">${escaparHtml(anuncio.distribuidoras?.nombre || 'Distribuidora')}</p>
            ${anuncio.descripcion ? `<p class="tarjeta-producto-panel-descripcion">${escaparHtml(anuncio.descripcion)}</p>` : ''}
            <p class="tarjeta-producto-panel-descripcion">Monto: ${formatearPrecioAdmin(anuncio.monto)}</p>
            ${!esPendiente ? `<p class="tarjeta-producto-panel-descripcion">Vence: ${formatearFechaAdmin(anuncio.fecha_fin)}</p>` : ''}
            <p class="tarjeta-producto-panel-descripcion">${comprobante}</p>
            <div class="tarjeta-producto-panel-acciones">${acciones}</div>
        `;

        lista.appendChild(tarjeta);
    });
}

document.getElementById('lista-publicidad-admin').addEventListener('click', async (evento) => {
    const botonAprobar = evento.target.closest('[data-aprobar-anuncio]');
    const botonRechazar = evento.target.closest('[data-rechazar-anuncio]');
    const botonDesactivar = evento.target.closest('[data-desactivar-anuncio]');

    if (botonDesactivar) {
        if (!confirm('¿Seguro que querés desactivar este anuncio? Dejará de mostrarse a los clientes.')) return;

        botonDesactivar.disabled = true;

        const { error } = await supabaseCliente
            .from('anuncios')
            .update({ estado: 'vencido' })
            .eq('id', botonDesactivar.dataset.desactivarAnuncio);

        if (error) {
            alert('No pudimos desactivar el anuncio. Intentá de nuevo.');
            botonDesactivar.disabled = false;
            return;
        }

        await cargarPublicidadAdmin();
        return;
    }

    if (botonAprobar) {
        botonAprobar.disabled = true;

        const ahora = new Date();

        const { data: anuncioActual } = await supabaseCliente
            .from('anuncios')
            .select('estado, fecha_fin')
            .eq('id', botonAprobar.dataset.aprobarAnuncio)
            .single();

        const base = anuncioActual?.estado === 'activo' && anuncioActual.fecha_fin && new Date(anuncioActual.fecha_fin) > ahora
            ? new Date(anuncioActual.fecha_fin)
            : new Date(ahora);

        const vencimiento = new Date(base);
        vencimiento.setMonth(vencimiento.getMonth() + 1);

        const { error } = await supabaseCliente
            .from('anuncios')
            .update({
                estado: 'activo',
                renovacion_solicitada: false,
                aprobado_por: usuarioActualId,
                aprobado_en: ahora.toISOString(),
                fecha_fin: vencimiento.toISOString()
            })
            .eq('id', botonAprobar.dataset.aprobarAnuncio);

        if (error) {
            alert('No pudimos aprobar el anuncio. Intentá de nuevo.');
            botonAprobar.disabled = false;
            return;
        }

        await cargarPublicidadAdmin();
    }

    if (botonRechazar) {
        if (!confirm('¿Seguro que querés rechazar este anuncio?')) return;

        botonRechazar.disabled = true;

        const esRechazoRenovacion = botonRechazar.dataset.renovacion === '1';

        const { error } = await supabaseCliente
            .from('anuncios')
            .update(esRechazoRenovacion
                ? {
                    renovacion_solicitada: false,
                    estado: botonRechazar.dataset.estado === 'activo' ? 'activo' : 'vencido'
                }
                : {
                    estado: 'rechazado',
                    aprobado_por: usuarioActualId,
                    aprobado_en: new Date().toISOString()
                })
            .eq('id', botonRechazar.dataset.rechazarAnuncio);

        if (error) {
            alert('No pudimos rechazar el anuncio. Intentá de nuevo.');
            botonRechazar.disabled = false;
            return;
        }

        await cargarPublicidadAdmin();
    }
});