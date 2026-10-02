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

let usuarioActual = null;
let archivoFotoRepartidor = null;

const etiquetasEstadoEntrega = {
    asignada: 'Asignada',
    en_camino: 'En camino'
};

function claseEstadoEntrega(estado) {
    return estado === 'en_camino' ? 'en_camino' : 'asignada';
}

async function cargarMisEntregas() {
    const estadoVacio = document.getElementById('estado-entregas-repartidor');
    const lista = document.getElementById('lista-entregas-repartidor');

    const { data, error } = await supabaseCliente
        .from('entregas')
        .select(`
            id, estado, asignada_en,
            pedidos (
                id, direccion_calle, direccion_numero, direccion_ciudad, direccion_referencia,
                total, metodo_pago,
                usuarios!pedidos_cliente_id_fkey ( nombre, apellido, telefono ),
                detalles_pedidos ( cantidad, productos ( nombre ) )
            )
        `)
        .eq('repartidor_id', usuarioActual.id)
        .in('estado', ['asignada', 'en_camino'])
        .order('asignada_en', { ascending: true });

    if (error) {
        estadoVacio.textContent = 'No pudimos cargar tus entregas. Recargá la página.';
        estadoVacio.classList.remove('oculto');
        return;
    }

    lista.innerHTML = '';

    if (!data || data.length === 0) {
        estadoVacio.textContent = 'No tenés entregas asignadas por ahora.';
        estadoVacio.classList.remove('oculto');
        return;
    }

    estadoVacio.classList.add('oculto');

    data.forEach((entrega) => {
        const pedido = entrega.pedidos;
        const nombreCliente = `${pedido.usuarios?.nombre || ''} ${pedido.usuarios?.apellido || ''}`.trim();

        const itemsHtml = (pedido.detalles_pedidos || []).map((item) => `
            <p class="tarjeta-producto-panel-descripcion">
                ${item.cantidad}x ${escaparHtml(item.productos?.nombre || 'Producto')}
            </p>
        `).join('');

        const tarjeta = document.createElement('article');
        tarjeta.className = 'tarjeta-producto-panel';
        tarjeta.innerHTML = `
            <div class="tarjeta-producto-panel-superior">
                <h3>${escaparHtml(nombreCliente)}</h3>
                <span class="etiqueta-estado-producto ${claseEstadoEntrega(entrega.estado)}">
                    ${etiquetasEstadoEntrega[entrega.estado]}
                </span>
            </div>
            <p class="tarjeta-producto-panel-descripcion">
                ${escaparHtml(pedido.direccion_calle)} ${escaparHtml(pedido.direccion_numero || '')},
                ${escaparHtml(pedido.direccion_ciudad)}
                ${pedido.direccion_referencia ? `— ${escaparHtml(pedido.direccion_referencia)}` : ''}
            </p>
            ${pedido.usuarios?.telefono ? `<p class="tarjeta-producto-panel-descripcion">Tel: ${escaparHtml(pedido.usuarios.telefono)}</p>` : ''}
            ${itemsHtml}
            <div class="tarjeta-producto-panel-detalle">
                <span>${pedido.metodo_pago === 'transferencia' ? 'Transferencia' : 'Efectivo'}</span>
                <strong>${formatearPrecio(pedido.total)}</strong>
            </div>
            <div class="tarjeta-producto-panel-acciones">
                ${entrega.estado === 'asignada'
                ? `<button type="button" class="btn btn-principal btn-chico" data-salir-entregar="${entrega.id}">Salir a entregar</button>`
                : `<button type="button" class="btn btn-principal btn-chico" data-confirmar-entrega="${entrega.id}">Confirmar entrega</button>`}
            </div>
        `;

        lista.appendChild(tarjeta);
    });
}

function formatearPrecio(valor) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(valor || 0);
}

document.getElementById('lista-entregas-repartidor').addEventListener('click', async (evento) => {
    const botonSalir = evento.target.closest('[data-salir-entregar]');
    const botonConfirmar = evento.target.closest('[data-confirmar-entrega]');
    if (!botonSalir && !botonConfirmar) return;

    const boton = botonSalir || botonConfirmar;
    boton.disabled = true;

    const cambios = botonSalir
        ? { estado: 'en_camino', iniciada_en: new Date().toISOString() }
        : { estado: 'entregada', entregada_en: new Date().toISOString() };

    const { error } = await supabaseCliente
        .from('entregas')
        .update(cambios)
        .eq('id', boton.dataset.salirEntregar || boton.dataset.confirmarEntrega);

    if (error) {
        alert('No pudimos actualizar la entrega. Intentá de nuevo.');
        boton.disabled = false;
        return;
    }

    await cargarMisEntregas();
});

async function precargarPerfilRepartidor() {
    const { data: perfil, error } = await supabaseCliente
        .from('usuarios')
        .select('dni, foto_url, marca_vehiculo, modelo_vehiculo, patente_vehiculo, numero_licencia')
        .eq('id', usuarioActual.id)
        .single();

    if (error || !perfil) {
        return;
    }

    document.getElementById('dni-repartidor-perfil').value = perfil.dni || '';
    document.getElementById('marca-vehiculo').value = perfil.marca_vehiculo || '';
    document.getElementById('modelo-vehiculo').value = perfil.modelo_vehiculo || '';
    document.getElementById('patente-vehiculo').value = perfil.patente_vehiculo || '';
    document.getElementById('numero-licencia').value = perfil.numero_licencia || '';

    if (perfil.foto_url) {
        const vistaFoto = document.getElementById('panel-foto-vista');
        vistaFoto.innerHTML = `<img src="${perfil.foto_url}" alt="Tu foto">`;
        vistaFoto.classList.add('tiene-foto');
    }
}

document.getElementById('foto-repartidor').addEventListener('change', (evento) => {
    const archivo = evento.target.files[0];

    if (!archivo) {
        return;
    }

    archivoFotoRepartidor = archivo;

    const vistaFoto = document.getElementById('panel-foto-vista');
    vistaFoto.innerHTML = `<img src="${URL.createObjectURL(archivo)}" alt="Tu foto">`;
    vistaFoto.classList.add('tiene-foto');
});

document.getElementById('formulario-perfil-repartidor').addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const btnGuardar = document.getElementById('btn-guardar-perfil-repartidor');
    const mensaje = document.getElementById('mensaje-perfil-repartidor');

    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';

    try {
        const datosPerfil = {
            dni: document.getElementById('dni-repartidor-perfil').value.trim(),
            marca_vehiculo: document.getElementById('marca-vehiculo').value.trim(),
            modelo_vehiculo: document.getElementById('modelo-vehiculo').value.trim(),
            patente_vehiculo: document.getElementById('patente-vehiculo').value.trim(),
            numero_licencia: document.getElementById('numero-licencia').value.trim()
        };

        if (archivoFotoRepartidor) {
            const rutaArchivo = `${usuarioActual.id}/${crypto.randomUUID()}-${archivoFotoRepartidor.name}`;

            const { error: errorSubida } = await supabaseCliente.storage
                .from('repartidores-fotos')
                .upload(rutaArchivo, archivoFotoRepartidor);

            if (errorSubida) {
                throw new Error('No pudimos subir la foto. Probá con otra imagen.');
            }

            const { data } = supabaseCliente.storage
                .from('repartidores-fotos')
                .getPublicUrl(rutaArchivo);

            datosPerfil.foto_url = data.publicUrl;
        }

        const { error } = await supabaseCliente
            .from('usuarios')
            .update(datosPerfil)
            .eq('id', usuarioActual.id);

        if (error) {
            mensaje.textContent = 'No pudimos guardar los cambios. Intentá de nuevo.';
            mensaje.className = 'mensaje-estado error';
            return;
        }

        archivoFotoRepartidor = null;
        mensaje.textContent = 'Cambios guardados correctamente.';
        mensaje.className = 'mensaje-estado exito';
    } catch (errorSubida) {
        mensaje.textContent = errorSubida.message || 'Ocurrió un error. Intentá de nuevo.';
        mensaje.className = 'mensaje-estado error';
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar cambios';
    }
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

    if (perfil?.rol !== 'repartidor') {
        window.location.href = 'productos.html';
        return;
    }

    usuarioActual = session.user;

    const { data: membresia } = await supabaseCliente
        .from('miembros_distribuidoras')
        .select('distribuidoras (nombre)')
        .eq('usuario_id', usuarioActual.id)
        .eq('rol', 'repartidor')
        .eq('estado', 'activo')
        .single();

    document.getElementById('nombre-distribuidora-repartidor').textContent =
        membresia?.distribuidoras?.nombre || 'Sin distribuidora asignada';

    document.getElementById('panel-cargando').classList.add('oculto');
    document.getElementById('panel-header').classList.remove('oculto');
    document.getElementById('panel-main').classList.remove('oculto');

    precargarPerfilRepartidor();
    cargarMisEntregas();
}

const seccionesRepartidor = {
    entregas: document.getElementById('seccion-entregas'),
    perfil: document.getElementById('seccion-perfil')
};

document.querySelectorAll('.panel-pestana').forEach((pestana) => {
    pestana.addEventListener('click', () => {
        document.querySelectorAll('.panel-pestana').forEach((boton) => {
            boton.classList.remove('activa');
            boton.setAttribute('aria-selected', 'false');
        });
        pestana.classList.add('activa');
        pestana.setAttribute('aria-selected', 'true');

        Object.values(seccionesRepartidor).forEach((seccion) => seccion.classList.add('oculto'));
        seccionesRepartidor[pestana.dataset.pestana].classList.remove('oculto');

        if (pestana.dataset.pestana === 'entregas') {
            cargarMisEntregas();
        }
    });
});

inicializarPanel();

document.getElementById('boton-cerrar-sesion').addEventListener('click', async () => {
    await supabaseCliente.auth.signOut();
    window.location.href = 'login.html';
});