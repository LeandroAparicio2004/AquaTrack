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
let entregasPedidosCache = {};
let entregaSeleccionadaValidacion = null;
let lectorQrEntrega = null;

const etiquetasEstadoEntrega = {
    asignada: 'Asignada',
    en_camino: 'En camino'
};

function claseEstadoEntrega(estado) {
    return estado === 'en_camino' ? 'en_camino' : 'asignada';
}

async function cargarResumenHoy() {
    const contenedor = document.getElementById('resumen-hoy-repartidor');

    if (!contenedor) {
        return;
    }

    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    const desde = inicio.toISOString();

    const [{ data: entregadas }, { data: fallidas }] = await Promise.all([
        supabaseCliente
            .from('entregas')
            .select(`
                id, entregada_en, monto_cobrado,
                pedidos ( total, metodo_pago, direccion_calle, direccion_numero,
                    usuarios!pedidos_cliente_id_fkey ( nombre, apellido ) )
            `)
            .eq('repartidor_id', usuarioActual.id)
            .eq('estado', 'entregada')
            .gte('entregada_en', desde)
            .order('entregada_en', { ascending: false }),
        supabaseCliente
            .from('intentos_entrega')
            .select('id, motivo, creado_en')
            .eq('repartidor_id', usuarioActual.id)
            .gte('creado_en', desde)
            .order('creado_en', { ascending: false })
    ]);

    const hechas = entregadas || [];
    const noHechas = fallidas || [];

    if (hechas.length === 0 && noHechas.length === 0) {
        contenedor.innerHTML = '';
        return;
    }

    const efectivo = hechas.reduce((suma, e) => suma + Number(e.monto_cobrado || 0), 0);
    const transferencia = hechas
        .filter((e) => e.pedidos?.metodo_pago === 'transferencia')
        .reduce((suma, e) => suma + Number(e.pedidos?.total || 0), 0);

    const hora = (fecha) => new Date(fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

    contenedor.innerHTML = `
        <h3>Hoy</h3>
        <div class="resumen-hoy-totales">
            <div><span>Efectivo cobrado (para entregar al vendedor)</span><strong>${formatearPrecio(efectivo)}</strong></div>
            <div><span>Ya pagado por transferencia</span><strong>${formatearPrecio(transferencia)}</strong></div>
            <div><span>Entregas hechas</span><strong>${hechas.length}</strong></div>
            <div><span>No entregadas</span><strong>${noHechas.length}</strong></div>
        </div>
        ${hechas.map((e) => `
            <div class="fila-resumen-hoy">
                <span>✔ ${escaparHtml(e.pedidos?.usuarios?.nombre || '')} ${escaparHtml(e.pedidos?.usuarios?.apellido || '')} · ${escaparHtml(e.pedidos?.direccion_calle || '')} ${escaparHtml(e.pedidos?.direccion_numero || '')}</span>
                <span>${e.pedidos?.metodo_pago === 'efectivo' ? 'Efectivo ' + formatearPrecio(e.monto_cobrado) : 'Transferencia'} · ${hora(e.entregada_en)}</span>
            </div>
        `).join('')}
        ${noHechas.map((i) => `
            <div class="fila-resumen-hoy fila-no-entregada">
                <span>✖ No entregado: ${escaparHtml(i.motivo)}</span>
                <span>${hora(i.creado_en)}</span>
            </div>
        `).join('')}
    `;
}

async function cargarMisEntregas() {
    cargarResumenHoy();

    const estadoVacio = document.getElementById('estado-entregas-repartidor');
    const lista = document.getElementById('lista-entregas-repartidor');

    const { data, error } = await supabaseCliente
        .from('entregas')
        .select(`
            id, estado, asignada_en, cerrada_en,
            pedidos (
                id, cliente_id, direccion_calle, direccion_numero, direccion_ciudad, direccion_referencia,
                latitud, longitud, total, metodo_pago,
                usuarios!pedidos_cliente_id_fkey ( nombre, apellido, telefono, dni ),
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

    entregasPedidosCache = {};
    (data || []).forEach((entrega) => {
        entregasPedidosCache[entrega.id] = entrega.pedidos?.id;
    });

    const barraSalir = document.getElementById('barra-salir-repartir');
    const asignadas = (data || []).filter((entrega) => entrega.estado === 'asignada');
    const botonSalir = document.getElementById('btn-salir-repartir');

    barraSalir.classList.toggle('oculto', asignadas.length === 0);
    botonSalir.disabled = false;
    botonSalir.textContent = 'Salir a repartir';

    const ordenConUbicacion = await dibujarMapaEntregas(data || []);
    const sinUbicacion = (data || []).filter((entrega) => !entrega.pedidos?.latitud || !entrega.pedidos?.longitud);
    const entregasOrdenadas = [...ordenConUbicacion, ...sinUbicacion];

    if ((data || []).some((entrega) => entrega.estado === 'en_camino')) {
        iniciarSeguimientoUbicacion();
    }

    lista.innerHTML = '';

    if (!data || data.length === 0) {
        estadoVacio.textContent = 'No tenés entregas asignadas por ahora.';
        estadoVacio.classList.remove('oculto');
        return;
    }

    estadoVacio.classList.add('oculto');

    entregasOrdenadas.forEach((entrega, indice) => {
        const pedido = entrega.pedidos;
        const nombreCliente = `${pedido.usuarios?.nombre || ''} ${pedido.usuarios?.apellido || ''}`.trim();
        const tieneUbicacion = pedido.latitud && pedido.longitud;

        const itemsHtml = (pedido.detalles_pedidos || []).map((item) => `
            <p class="tarjeta-producto-panel-descripcion">
                ${item.cantidad}x ${escaparHtml(item.productos?.nombre || 'Producto')}
            </p>
        `).join('');

        const direccionTexto = `${pedido.direccion_calle || ''} ${pedido.direccion_numero || ''}, ${pedido.direccion_ciudad || ''}`.trim();
        const urlComoLlegar = tieneUbicacion
            ? `https://www.google.com/maps/dir/?api=1&destination=${pedido.latitud},${pedido.longitud}`
            : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(direccionTexto)}`;
        const telefono = (pedido.usuarios?.telefono || '').replace(/[^\d+]/g, '');

        const tarjeta = document.createElement('article');
        tarjeta.className = 'tarjeta-entrega';
        tarjeta.innerHTML = `
            <div class="entrega-cabecera">
                <span class="numero-parada-repartidor">${tieneUbicacion ? indice + 1 : '—'}</span>
                <h3>${escaparHtml(nombreCliente)}</h3>
                <span class="etiqueta-estado-producto ${claseEstadoEntrega(entrega.estado)}">
                    ${etiquetasEstadoEntrega[entrega.estado]}
                </span>
            </div>

            <p class="entrega-direccion">
                ${escaparHtml(direccionTexto)}
                ${pedido.direccion_referencia ? `<br><span>${escaparHtml(pedido.direccion_referencia)}</span>` : ''}
            </p>
            ${!tieneUbicacion ? '<p class="entrega-aviso">Sin ubicación guardada: no aparece en el mapa.</p>' : ''}

            <div class="entrega-cobro">
                <div>
                    <p class="entrega-items">${(pedido.detalles_pedidos || []).map((item) => `${item.cantidad}x ${escaparHtml(item.productos?.nombre || 'Producto')}`).join(' · ')}</p>
                    ${pedido.usuarios?.dni ? `<p class="entrega-dni">DNI: ${escaparHtml(pedido.usuarios.dni)}</p>` : ''}
                </div>
                <div class="entrega-monto">
                    <span>${pedido.metodo_pago === 'transferencia' ? 'Ya pagó (transferencia)' : 'Cobrar en efectivo'}</span>
                    <strong>${formatearPrecio(pedido.total)}</strong>
                </div>
            </div>

            <div class="entrega-contacto">
                <a class="btn btn-secundario" href="${urlComoLlegar}" target="_blank" rel="noopener">Cómo llegar</a>
                ${telefono ? `<a class="btn btn-secundario" href="tel:${telefono}">Llamar</a>` : ''}
                <button type="button" class="btn btn-secundario" data-chat-cliente="${pedido.cliente_id}">Mensaje</button>
            </div>

            ${entrega.estado === 'en_camino' ? `
                <button type="button" class="btn btn-principal entrega-confirmar" data-confirmar-entrega="${entrega.id}">Confirmar entrega</button>
                <button type="button" class="entrega-no-pude" data-no-pude-entregar="${entrega.id}">No pude entregar</button>
            ` : ''}
        `;

        lista.appendChild(tarjeta);
    });
}
            // =========== MAPAAAAAAA =========== 
let mapaRepartidorInstancia = null;

async function dibujarMapaEntregas(entregas) {
    const contenedorMapa = document.getElementById('mapa-repartidor');
    const estadoMapa = document.getElementById('estado-mapa-repartidor');

    const conUbicacion = entregas.filter((entrega) => entrega.pedidos?.latitud && entrega.pedidos?.longitud);

    if (conUbicacion.length === 0) {
        contenedorMapa.classList.add('oculto');
        estadoMapa.classList.add('oculto');
        return [];
    }

    contenedorMapa.classList.remove('oculto');
    estadoMapa.classList.remove('oculto');
    estadoMapa.textContent = 'Calculando la ruta más corta...';

    if (!mapaRepartidorInstancia) {
        mapaRepartidorInstancia = L.map('mapa-repartidor');
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(mapaRepartidorInstancia);
    }

    mapaRepartidorInstancia.eachLayer((capa) => {
        if (capa instanceof L.Marker || capa instanceof L.Polyline) {
            mapaRepartidorInstancia.removeLayer(capa);
        }
    });

    let origen = null;
    try {
        origen = await obtenerUbicacionActual();
    } catch {
        origen = null;
    }

    let ordenParadas = conUbicacion.map((_, indice) => indice);
    let coordenadasRuta = null;

    if (origen) {
        try {
            const puntos = [origen, ...conUbicacion.map((entrega) => ({
                lat: Number(entrega.pedidos.latitud),
                lon: Number(entrega.pedidos.longitud)
            }))];

            const coordsOsrm = puntos.map((punto) => `${punto.lon},${punto.lat}`).join(';');

            const respuesta = await fetch(
                `https://router.project-osrm.org/trip/v1/driving/${coordsOsrm}?source=first&roundtrip=false&overview=full&geometries=geojson`
            );
            const datosOsrm = await respuesta.json();

            if (datosOsrm.code === 'Ok') {
                ordenParadas = datosOsrm.waypoints
                    .slice(1)
                    .map((punto, indiceOriginal) => ({ indiceOriginal, orden: punto.waypoint_index }))
                    .sort((a, b) => a.orden - b.orden)
                    .map((item) => item.indiceOriginal);

                coordenadasRuta = datosOsrm.trips[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]);
            }
        } catch {
            coordenadasRuta = null;
        }
    }

    estadoMapa.textContent = origen
        ? 'Ruta ordenada por cercanía desde tu ubicación.'
        : 'No pudimos acceder a tu ubicación: mostrando las paradas sin ordenar.';

    const limites = [];

    if (origen) {
        L.marker([origen.lat, origen.lon]).addTo(mapaRepartidorInstancia).bindPopup('Tu ubicación');
        limites.push([origen.lat, origen.lon]);
    }

    ordenParadas.forEach((indiceEntrega, posicion) => {
        const entrega = conUbicacion[indiceEntrega];
        const lat = Number(entrega.pedidos.latitud);
        const lon = Number(entrega.pedidos.longitud);
        const nombreCliente = `${entrega.pedidos.usuarios?.nombre || ''} ${entrega.pedidos.usuarios?.apellido || ''}`.trim();

        const icono = L.divIcon({
            className: '',
            html: `<div class="marcador-parada-repartidor">${posicion + 1}</div>`,
            iconSize: [26, 26]
        });

        L.marker([lat, lon], { icon: icono }).addTo(mapaRepartidorInstancia).bindPopup(escaparHtml(nombreCliente));
        limites.push([lat, lon]);
    });

    if (coordenadasRuta) {
        L.polyline(coordenadasRuta, { color: '#3b82f6', weight: 4 }).addTo(mapaRepartidorInstancia);
    }

    mapaRepartidorInstancia.fitBounds(limites, { padding: [30, 30] });

    return ordenParadas.map((indiceEntrega) => conUbicacion[indiceEntrega]);
}

function obtenerUbicacionActual() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocalización no disponible'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (posicion) => resolve({ lat: posicion.coords.latitude, lon: posicion.coords.longitude }),
            () => reject(new Error('Permiso denegado')),
            { enableHighAccuracy: true, timeout: 8000 }
        );
    });
}

function formatearPrecio(valor) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(valor || 0);
}

document.getElementById('lista-entregas-repartidor').addEventListener('click', (evento) => {
    const botonConfirmar = evento.target.closest('[data-confirmar-entrega]');
    if (!botonConfirmar) return;

    abrirModalValidacionEntrega(botonConfirmar.dataset.confirmarEntrega);
});

let entregaNoPude = null;
let motivoNoPude = null;

function cerrarModalNoPude() {
    document.getElementById('modal-no-pude').classList.add('oculto');
    entregaNoPude = null;
    motivoNoPude = null;
}

document.getElementById('lista-entregas-repartidor').addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-no-pude-entregar]');
    if (!boton) return;

    entregaNoPude = boton.dataset.noPudeEntregar;
    motivoNoPude = null;
    document.querySelectorAll('.opcion-no-pude').forEach((opcion) => opcion.classList.remove('elegida'));
    document.getElementById('boton-confirmar-no-pude').disabled = true;
    document.getElementById('mensaje-no-pude').classList.add('oculto');
    document.getElementById('modal-no-pude').classList.remove('oculto');
});

document.getElementById('opciones-no-pude').addEventListener('click', (evento) => {
    const opcion = evento.target.closest('.opcion-no-pude');
    if (!opcion) return;

    motivoNoPude = opcion.dataset.motivo;
    document.querySelectorAll('.opcion-no-pude').forEach((otra) => otra.classList.toggle('elegida', otra === opcion));
    document.getElementById('boton-confirmar-no-pude').disabled = false;
});

document.getElementById('boton-cerrar-modal-no-pude').addEventListener('click', cerrarModalNoPude);
document.getElementById('boton-cancelar-no-pude').addEventListener('click', cerrarModalNoPude);

document.getElementById('boton-confirmar-no-pude').addEventListener('click', async () => {
    if (!entregaNoPude || !motivoNoPude) return;

    const boton = document.getElementById('boton-confirmar-no-pude');
    boton.disabled = true;

    const { error } = await supabaseCliente.rpc('no_pude_entregar', {
        p_entrega_id: entregaNoPude,
        p_motivo: motivoNoPude
    });

    if (error) {
        const mensaje = document.getElementById('mensaje-no-pude');
        mensaje.textContent = error.message || 'No pudimos devolver el pedido. Intentá de nuevo.';
        mensaje.className = 'mensaje-estado error';
        boton.disabled = false;
        return;
    }

    cerrarModalNoPude();
    await cargarMisEntregas();
});

function codigoManualDePedido(idPedido) {
    return (idPedido || '').slice(0, 8).toUpperCase();
}

function mostrarMensajeValidacion(texto, tipo) {
    const mensaje = document.getElementById('mensaje-validacion-entrega');
    mensaje.textContent = texto;
    mensaje.className = `mensaje-estado ${tipo}`;
    mensaje.classList.remove('oculto');
}

function ocultarMensajeValidacion() {
    document.getElementById('mensaje-validacion-entrega').classList.add('oculto');
}

async function iniciarEscanerQr() {
    const estadoEscaner = document.getElementById('estado-escaner-qr');
    estadoEscaner.classList.add('oculto');

    try {
        lectorQrEntrega = new Html5Qrcode('lector-qr-entrega');

        await lectorQrEntrega.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: 220 },
            (textoDecodificado) => procesarCodigoValidacion(textoDecodificado),
            () => {}
        );
    } catch (error) {
        estadoEscaner.textContent = 'No pudimos acceder a la cámara. Usá el código manual.';
        estadoEscaner.classList.remove('oculto');
    }
}

async function detenerEscanerQr() {
    if (lectorQrEntrega) {
        try {
            await lectorQrEntrega.stop();
            await lectorQrEntrega.clear();
        } catch {
            // La cámara ya estaba detenida.
        }
        lectorQrEntrega = null;
    }
}

function abrirModalValidacionEntrega(idEntrega) {
    entregaSeleccionadaValidacion = idEntrega;
    ocultarMensajeValidacion();
    document.getElementById('input-codigo-manual-entrega').value = '';
    document.getElementById('modal-validacion-entrega').classList.remove('oculto');

    document.querySelectorAll('.pestana-validacion').forEach((pestana) => {
        pestana.classList.toggle('activa', pestana.dataset.modoValidacion === 'qr');
    });
    document.getElementById('panel-escaner-qr').classList.remove('oculto');
    document.getElementById('panel-codigo-manual').classList.add('oculto');

    iniciarEscanerQr();
}

async function cerrarModalValidacionEntrega() {
    await detenerEscanerQr();
    document.getElementById('modal-validacion-entrega').classList.add('oculto');
    entregaSeleccionadaValidacion = null;
}

document.getElementById('boton-cerrar-modal-validacion').addEventListener('click', cerrarModalValidacionEntrega);

document.querySelectorAll('.pestana-validacion').forEach((pestana) => {
    pestana.addEventListener('click', async () => {
        document.querySelectorAll('.pestana-validacion').forEach((elemento) => elemento.classList.remove('activa'));
        pestana.classList.add('activa');
        ocultarMensajeValidacion();

        const modo = pestana.dataset.modoValidacion;
        document.getElementById('panel-escaner-qr').classList.toggle('oculto', modo !== 'qr');
        document.getElementById('panel-codigo-manual').classList.toggle('oculto', modo !== 'manual');

        if (modo === 'qr') {
            await iniciarEscanerQr();
        } else {
            await detenerEscanerQr();
        }
    });
});

async function procesarCodigoValidacion(codigoIngresado) {
    const idPedidoEsperado = entregasPedidosCache[entregaSeleccionadaValidacion];
    const valorLimpio = (codigoIngresado || '').trim().toUpperCase();

    const coincide = valorLimpio === (idPedidoEsperado || '').toUpperCase()
        || valorLimpio === codigoManualDePedido(idPedidoEsperado);

    if (!coincide) {
        mostrarMensajeValidacion('Ese código no corresponde a este pedido.', 'error');
        return;
    }

    await detenerEscanerQr();
    await confirmarEntregaValidada(valorLimpio);
}

async function confirmarEntregaValidada(codigo) {
    const idEntrega = entregaSeleccionadaValidacion;

    const { error } = await supabaseCliente.rpc('confirmar_entrega', {
        p_entrega_id: idEntrega,
        p_codigo: codigo
    });

    if (error) {
        mostrarMensajeValidacion('No pudimos confirmar la entrega. Intentá de nuevo.', 'error');
        return;
    }

    mostrarMensajeValidacion('¡Entrega confirmada!', 'exito');

    setTimeout(async () => {
        await cerrarModalValidacionEntrega();
        await cargarMisEntregas();
    }, 900);
}

document.getElementById('boton-confirmar-codigo-manual').addEventListener('click', () => {
    const valorIngresado = document.getElementById('input-codigo-manual-entrega').value;

    if (!valorIngresado.trim()) {
        mostrarMensajeValidacion('Ingresá el código del ticket.', 'error');
        return;
    }

    procesarCodigoValidacion(valorIngresado);
});



document.getElementById('btn-salir-repartir').addEventListener('click', async () => {
    const boton = document.getElementById('btn-salir-repartir');
    boton.disabled = true;

    const { error } = await supabaseCliente
        .from('entregas')
        .update({ estado: 'en_camino', iniciada_en: new Date().toISOString() })
        .eq('repartidor_id', usuarioActual.id)
        .eq('estado', 'asignada');

    if (error) {
        alert('No pudimos iniciar el reparto. Intente nuevamente.');
        boton.disabled = false;
        return;
    }

    await cargarMisEntregas();
    iniciarSeguimientoUbicacion();
});

let intervaloUbicacion = null;

async function iniciarSeguimientoUbicacion() {
    if (intervaloUbicacion || !navigator.geolocation) {
        return;
    }

    const { data: entregasEnCamino } = await supabaseCliente
        .from('entregas')
        .select('id')
        .eq('repartidor_id', usuarioActual.id)
        .eq('estado', 'en_camino');

    if (!entregasEnCamino || entregasEnCamino.length === 0) {
        return;
    }

    const idsEntregas = entregasEnCamino.map((entrega) => entrega.id);

    const guardarPosicionActual = () => {
        navigator.geolocation.getCurrentPosition(async (posicion) => {
            const filas = idsEntregas.map((idEntrega) => ({
                entrega_id: idEntrega,
                latitud: posicion.coords.latitude,
                longitud: posicion.coords.longitude
            }));

            await supabaseCliente.from('ubicaciones_entregas').insert(filas);
        }, () => {}, { enableHighAccuracy: true, timeout: 8000 });
    };

    guardarPosicionActual();
    intervaloUbicacion = setInterval(guardarPosicionActual, 15000);
}

function detenerSeguimientoUbicacion() {
    if (intervaloUbicacion) {
        clearInterval(intervaloUbicacion);
        intervaloUbicacion = null;
    }
}

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        detenerSeguimientoUbicacion();
    } else {
        iniciarSeguimientoUbicacion();
    }
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
    rutas: document.getElementById('seccion-rutas'),
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

        if (pestana.dataset.pestana === 'rutas') {
            window.cargarHojasRuta();
        }
    });
});

function abrirPestanaDesdeHash() {
    const nombre = window.location.hash.replace('#', '');

    if (nombre) {
        document.querySelector(`.panel-pestana[data-pestana="${nombre}"]`)?.click();
    }
}

window.addEventListener('hashchange', abrirPestanaDesdeHash);
let viendoResenas = false;

function alternarVistaResenas(mostrarResenas) {
    viendoResenas = mostrarResenas;
    document.getElementById('formulario-perfil-repartidor').hidden = mostrarResenas;
    document.getElementById('bloque-resenas-perfil').hidden = !mostrarResenas;

    const boton = document.getElementById('enlace-ver-resenas');

    if (boton) {
        boton.textContent = mostrarResenas ? 'Ver perfil' : 'Ver reseñas';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function textoEstrellasResena(valor) {
    const llenas = Math.round(valor);
    return '★'.repeat(llenas) + '☆'.repeat(5 - llenas);
}

async function cargarResenasRepartidor() {
    if (!usuarioActual) {
        return;
    }

    const { data, error } = await supabaseCliente
        .from('resenas')
        .select('id, estrellas_repartidor, comentario, creado_en')
        .eq('repartidor_id', usuarioActual.id)
        .not('estrellas_repartidor', 'is', null)
        .order('creado_en', { ascending: false });

    const resumen = document.getElementById('resumen-resenas-panel');
    const lista = document.getElementById('lista-resenas-panel');
    const perfil = document.getElementById('calificacion-perfil');

    if (error) {
        lista.innerHTML = '<p class="vacio-resenas-panel">No pudimos cargar tus calificaciones.</p>';
        return;
    }

    const resenas = data || [];

    if (resenas.length === 0) {
        perfil.innerHTML = '<span class="calificacion-vacia">Todavía no tenés calificaciones.</span>';
        resumen.innerHTML = '';
        lista.innerHTML = '<p class="vacio-resenas-panel">Todavía no tenés calificaciones. Aparecen cuando un cliente califica un pedido que entregaste.</p>';
        return;
    }

    const promedio = resenas.reduce((suma, r) => suma + r.estrellas_repartidor, 0) / resenas.length;
    const promedioTexto = promedio.toFixed(1).replace('.', ',');
    const cantidadTexto = `${resenas.length} ${resenas.length === 1 ? 'calificación' : 'calificaciones'}`;

    perfil.innerHTML = `
        <span class="calificacion-estrellas">${textoEstrellasResena(promedio)}</span>
        <strong>${promedioTexto}</strong>
        <span>· ${cantidadTexto}</span>
        <button type="button" class="enlace-resenas" id="enlace-ver-resenas">${viendoResenas ? 'Ver perfil' : 'Ver reseñas'}</button>
    `;

    document.getElementById('enlace-ver-resenas').addEventListener('click', () => {
        alternarVistaResenas(!viendoResenas);
    });

    const barras = [5, 4, 3, 2, 1].map((estrellas) => {
        const cantidad = resenas.filter((r) => r.estrellas_repartidor === estrellas).length;
        const porcentaje = Math.round((cantidad / resenas.length) * 100);

        return `
            <div class="barra-resena">
                <span>${estrellas} ★</span>
                <div class="barra-resena-fondo"><div class="barra-resena-relleno" style="width:${porcentaje}%"></div></div>
                <span>${cantidad}</span>
            </div>
        `;
    }).join('');

    resumen.innerHTML = `
        <div class="resumen-resenas-promedio">
            <strong>${promedioTexto}</strong>
            <span class="calificacion-estrellas">${textoEstrellasResena(promedio)}</span>
            <span>${cantidadTexto}</span>
        </div>
        <div class="resumen-resenas-barras">${barras}</div>
    `;

    lista.innerHTML = resenas.map((r) => `
        <article class="tarjeta-resena-panel">
            <div class="cabecera-resena-panel">
                <span class="calificacion-estrellas">${textoEstrellasResena(r.estrellas_repartidor)}</span>
                <span class="fecha-resena-panel">${new Date(r.creado_en).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
            </div>
            ${r.comentario ? `<p class="comentario-resena-panel">${escaparHtml(r.comentario)}</p>` : '<p class="comentario-resena-panel sin-comentario">Sin comentario.</p>'}
        </article>
    `).join('');
}

inicializarPanel().then(() => {
    cargarResenasRepartidor();
    abrirPestanaDesdeHash();
});

document.getElementById('boton-cerrar-sesion').addEventListener('click', async () => {
    await supabaseCliente.auth.signOut();
    localStorage.removeItem('aquatrack_carrito');
    window.location.href = 'login.html';
});


document.getElementById('lista-entregas-repartidor').addEventListener('click', (evento) => {
    const botonChat = evento.target.closest('[data-chat-cliente]');
    if (botonChat) {
        window.location.href = `chat.html?usuario=${botonChat.dataset.chatCliente}`;
        return;
    }

    const botonCopiar = evento.target.closest('[data-copiar-telefono]');
    if (botonCopiar) {
        navigator.clipboard.writeText(botonCopiar.dataset.copiarTelefono).then(() => {
            botonCopiar.classList.add('copiado');
            setTimeout(() => botonCopiar.classList.remove('copiado'), 1200);
        });
    }
});