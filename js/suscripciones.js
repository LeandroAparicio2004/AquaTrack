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

function formatearFecha(valor) {
    if (!valor) {
        return '';
    }

    return new Date(`${valor}T00:00:00`).toLocaleDateString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
}

const etiquetasFrecuencia = {
    semanal: 'Semanal',
    quincenal: 'Quincenal',
    mensual: 'Mensual'
};

const etiquetasEstadoSuscripcion = {
    activa: 'Activa',
    pausada: 'Pausada',
    cancelada: 'Cancelada'
};

let usuarioIdActual = null;
let productosPorDistribuidora = [];

function fechaMinimaSuscripcion() {
    const hoy = new Date();
    return hoy.toISOString().slice(0, 10);
}

async function cargarDistribuidorasSelect() {
    const select = document.getElementById('distribuidora-suscripcion');

    const { data, error } = await supabaseCliente
        .from('distribuidoras')
        .select('id, nombre')
        .eq('estado', 'activa')
        .order('nombre');

    if (error || !data) {
        return;
    }

    data.forEach((distribuidora) => {
        const opcion = document.createElement('option');
        opcion.value = distribuidora.id;
        opcion.textContent = distribuidora.nombre;
        select.appendChild(opcion);
    });
}

async function cargarProductosSelect(idDistribuidora) {
    const selectProducto = document.getElementById('producto-suscripcion');
    selectProducto.innerHTML = '<option value="">Cargando productos...</option>';
    selectProducto.disabled = true;

    if (!idDistribuidora) {
        selectProducto.innerHTML = '<option value="">Elegí primero una distribuidora</option>';
        return;
    }

    const { data, error } = await supabaseCliente
        .from('productos')
        .select('id, nombre, capacidad_litros, precio, descuento_por_envase')
        .eq('distribuidora_id', idDistribuidora)
        .eq('activo', true)
        .order('nombre');

    if (error || !data || data.length === 0) {
        selectProducto.innerHTML = '<option value="">No hay productos disponibles</option>';
        return;
    }

    productosPorDistribuidora = data;

    selectProducto.innerHTML = '<option value="">Seleccioná un producto...</option>' + data.map((producto) => `
        <option value="${producto.id}">
            ${escaparHtml(producto.nombre)} (${producto.capacidad_litros}L) — ${formatearPrecio(producto.precio)}
        </option>
    `).join('');

    selectProducto.disabled = false;
}

document.getElementById('distribuidora-suscripcion').addEventListener('change', (evento) => {
    cargarProductosSelect(evento.target.value);
});

function abrirModalSuscripcion() {
    document.getElementById('formulario-suscripcion').reset();
    document.getElementById('producto-suscripcion').innerHTML = '<option value="">Elegí primero una distribuidora</option>';
    document.getElementById('producto-suscripcion').disabled = true;
    document.getElementById('fecha-suscripcion').min = fechaMinimaSuscripcion();
    document.getElementById('fecha-suscripcion').value = fechaMinimaSuscripcion();
    document.getElementById('mensaje-suscripcion').classList.add('oculto');
    document.getElementById('modal-suscripcion').classList.remove('oculto');
}

function cerrarModalSuscripcion() {
    document.getElementById('modal-suscripcion').classList.add('oculto');
}

document.getElementById('boton-nueva-suscripcion').addEventListener('click', abrirModalSuscripcion);
document.getElementById('boton-cerrar-modal-suscripcion').addEventListener('click', cerrarModalSuscripcion);

function mostrarMensajeSuscripcion(texto, tipo) {
    const mensaje = document.getElementById('mensaje-suscripcion');
    mensaje.textContent = texto;
    mensaje.className = `mensaje-estado ${tipo}`;
    mensaje.classList.remove('oculto');
}

document.getElementById('formulario-suscripcion').addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const botonGuardar = document.getElementById('boton-guardar-suscripcion');
    const idDistribuidora = document.getElementById('distribuidora-suscripcion').value;
    const idProducto = document.getElementById('producto-suscripcion').value;
    const cantidad = Number(document.getElementById('cantidad-suscripcion').value);
    const envases = Number(document.getElementById('envases-suscripcion').value) || 0;
    const frecuencia = document.getElementById('frecuencia-suscripcion').value;
    const fechaInicio = document.getElementById('fecha-suscripcion').value;
    const calle = document.getElementById('calle-suscripcion').value.trim();
    const numero = document.getElementById('numero-suscripcion').value.trim();
    const ciudad = document.getElementById('ciudad-suscripcion').value.trim();
    const provincia = document.getElementById('provincia-suscripcion').value.trim();
    const referencia = document.getElementById('referencia-suscripcion').value.trim();
    const metodoPago = document.querySelector('input[name="metodo-pago-suscripcion"]:checked').value;

    if (!idDistribuidora || !idProducto || !cantidad || cantidad < 1 || !frecuencia || !fechaInicio || !calle || !ciudad) {
        mostrarMensajeSuscripcion('Completá todos los campos obligatorios.', 'error');
        return;
    }

    botonGuardar.disabled = true;
    botonGuardar.textContent = 'Creando...';

    const { error } = await supabaseCliente
        .from('suscripciones')
        .insert({
            cliente_id: usuarioIdActual,
            distribuidora_id: idDistribuidora,
            producto_id: idProducto,
            cantidad,
            envases_devueltos: envases,
            frecuencia,
            fecha_inicio: fechaInicio,
            proxima_entrega: fechaInicio,
            estado: 'activa',
            direccion_calle: calle,
            direccion_numero: numero || null,
            direccion_ciudad: ciudad,
            direccion_provincia: provincia || null,
            direccion_referencia: referencia || null,
            metodo_pago: metodoPago
        });

    if (error) {
        mostrarMensajeSuscripcion('No pudimos crear la suscripción. Probá de nuevo.', 'error');
        botonGuardar.disabled = false;
        botonGuardar.textContent = 'Crear suscripción';
        return;
    }

    mostrarMensajeSuscripcion('¡Suscripción creada!', 'exito');

    setTimeout(async () => {
        cerrarModalSuscripcion();
        botonGuardar.disabled = false;
        botonGuardar.textContent = 'Crear suscripción';
        await cargarSuscripciones();
    }, 800);
});

function mostrarEstadoSuscripciones(texto) {
    const estado = document.getElementById('estado-suscripciones');
    estado.textContent = texto;
    estado.classList.remove('oculto');
}

async function cargarSuscripciones() {
    const lista = document.getElementById('lista-suscripciones');
    const estado = document.getElementById('estado-suscripciones');

    const { data, error } = await supabaseCliente
        .from('suscripciones')
        .select(`
            id, cantidad, envases_devueltos, frecuencia, fecha_inicio, proxima_entrega, estado, ultimo_pedido_id,
            distribuidoras ( nombre ),
            productos ( nombre, capacidad_litros, precio )
        `)
        .eq('cliente_id', usuarioIdActual)
        .order('creado_en', { ascending: false });

    if (error) {
        mostrarEstadoSuscripciones('No pudimos cargar tus suscripciones. Probá de nuevo más tarde.');
        return;
    }

    if (!data || data.length === 0) {
        lista.innerHTML = '';
        mostrarEstadoSuscripciones('Todavía no tenés ninguna suscripción. Creá una para recibir pedidos automáticos.');
        return;
    }

    estado.classList.add('oculto');

    lista.innerHTML = data.map((suscripcion) => {
        const producto = suscripcion.productos;
        const totalEstimado = (Number(producto?.precio) || 0) * suscripcion.cantidad;

        const acciones = suscripcion.estado === 'activa'
            ? `<button type="button" class="boton-pausar-suscripcion" data-pausar="${suscripcion.id}">Pausar</button>
               <button type="button" class="boton-cancelar-suscripcion" data-cancelar="${suscripcion.id}">Cancelar</button>`
            : suscripcion.estado === 'pausada'
                ? `<button type="button" class="boton-reactivar-suscripcion" data-reactivar="${suscripcion.id}">Reactivar</button>
                   <button type="button" class="boton-cancelar-suscripcion" data-cancelar="${suscripcion.id}">Cancelar</button>`
                : '';

        return `
            <div class="tarjeta-suscripcion">
                <div class="info-suscripcion">
                    <h3>${escaparHtml(producto?.nombre || 'Producto')} (${producto?.capacidad_litros || '?'}L) x${suscripcion.cantidad}</h3>
                    <p>${escaparHtml(suscripcion.distribuidoras?.nombre || 'AquaTrack')} — ${etiquetasFrecuencia[suscripcion.frecuencia] || suscripcion.frecuencia}</p>
                    <p>Estimado por entrega: ${formatearPrecio(totalEstimado)}</p>
                    ${suscripcion.estado !== 'cancelada'
                ? `<p>Próxima entrega: ${formatearFecha(suscripcion.proxima_entrega)}</p>`
                : `<p>Cancelada</p>`}
                    ${suscripcion.ultimo_pedido_id
                ? `<a href="ticket.html?pedido=${suscripcion.ultimo_pedido_id}">Ver último ticket generado</a>`
                : ''}
                </div>

                <div class="detalle-suscripcion">
                    <span class="etiqueta-estado-pedido ${suscripcion.estado}">${etiquetasEstadoSuscripcion[suscripcion.estado] || suscripcion.estado}</span>
                    <div class="acciones-suscripcion">${acciones}</div>
                </div>
            </div>
        `;
    }).join('');
}

document.getElementById('lista-suscripciones').addEventListener('click', async (evento) => {
    const botonPausar = evento.target.closest('[data-pausar]');
    const botonReactivar = evento.target.closest('[data-reactivar]');
    const botonCancelar = evento.target.closest('[data-cancelar]');

    if (botonPausar) {
        await supabaseCliente
            .from('suscripciones')
            .update({ estado: 'pausada', actualizado_en: new Date().toISOString() })
            .eq('id', botonPausar.dataset.pausar);
        await cargarSuscripciones();
        return;
    }

    if (botonReactivar) {
        const idSuscripcion = botonReactivar.dataset.reactivar;

        const { data: suscripcion } = await supabaseCliente
            .from('suscripciones')
            .select('proxima_entrega')
            .eq('id', idSuscripcion)
            .maybeSingle();

        const hoy = new Date().toISOString().slice(0, 10);
        const proximaEntrega = suscripcion?.proxima_entrega && suscripcion.proxima_entrega >= hoy
            ? suscripcion.proxima_entrega
            : hoy;

        await supabaseCliente
            .from('suscripciones')
            .update({ estado: 'activa', proxima_entrega: proximaEntrega, actualizado_en: new Date().toISOString() })
            .eq('id', idSuscripcion);

        await cargarSuscripciones();
        return;
    }

    if (botonCancelar) {
        if (!confirm('¿Seguro que querés cancelar esta suscripción? No se van a generar más pedidos automáticos.')) {
            return;
        }

        await supabaseCliente
            .from('suscripciones')
            .update({ estado: 'cancelada', actualizado_en: new Date().toISOString() })
            .eq('id', botonCancelar.dataset.cancelar);

        await cargarSuscripciones();
    }
});

async function verificarSesionNav() {
    const { data: { session } } = await supabaseCliente.auth.getSession();
    document.getElementById('nav-invitado').classList.toggle('oculto', Boolean(session));
    document.getElementById('nav-usuario').classList.toggle('oculto', !session);
}

document.getElementById('boton-cerrar-sesion').addEventListener('click', async () => {
    await supabaseCliente.auth.signOut();
    window.location.href = 'login.html';
});

async function inicializarSuscripciones() {
    const { data: { session } } = await supabaseCliente.auth.getSession();

    if (!session) {
        window.location.href = 'login.html?siguiente=suscripciones.html';
        return;
    }

    usuarioIdActual = session.user.id;

    cargarDistribuidorasSelect();
    cargarSuscripciones();
}

inicializarSuscripciones();
verificarSesionNav();