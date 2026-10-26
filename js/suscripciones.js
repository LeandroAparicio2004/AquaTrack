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
let mesSuscripcionActual = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let fechaSuscripcionElegida = null;
let distribuidorasCupo = {};
let pasoSuscripcion = 1;
let distribuidorasMaximo = {};
let diasSuscripcion = [];

const nombresDiasSuscripcion = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function textoDiasSuscripcion(dias) {
    return (dias || []).map((dia) => nombresDiasSuscripcion[dia]).join(' · ');
}

function sumarPeriodoSuscripcion(clave, frecuencia, dias = []) {
    const [anio, mes, dia] = clave.split('-').map(Number);

    if (frecuencia === 'semanal' && dias.length > 0) {
        for (let paso = 1; paso <= 7; paso++) {
            const candidata = new Date(anio, mes - 1, dia + paso);
            const diaIso = candidata.getDay() === 0 ? 7 : candidata.getDay();

            if (dias.includes(diaIso)) {
                return formatearClaveFechaSuscripcion(candidata);
            }
        }
    }

    if (frecuencia === 'semanal' || frecuencia === 'quincenal') {
        return formatearClaveFechaSuscripcion(
            new Date(anio, mes - 1, dia + (frecuencia === 'semanal' ? 7 : 14))
        );
    }

    const ultimoDiaProximoMes = new Date(anio, mes + 1, 0).getDate();
    return formatearClaveFechaSuscripcion(new Date(anio, mes, Math.min(dia, ultimoDiaProximoMes)));
}

function calcularFechasEntrega(inicio, frecuencia, hastaClave, dias = diasSuscripcion) {
    const fechas = [];

    if (!inicio) {
        return fechas;
    }

    let actual = inicio;

    while (actual <= hastaClave && fechas.length < 400) {
        fechas.push(actual);
        actual = sumarPeriodoSuscripcion(actual, frecuencia, dias);
    }

    return fechas;
}

function fechaMinimaSuscripcion() {
    const hoy = new Date();
    return hoy.toISOString().slice(0, 10);
}

async function cargarDistribuidorasSelect() {
    const select = document.getElementById('distribuidora-suscripcion');

    const { data, error } = await supabaseCliente
        .from('distribuidoras')
        .select('id, nombre, cupo_diario, max_bidones_por_pedido')
        .eq('estado', 'activa')
        .order('nombre');

    if (error || !data) {
        return;
    }

    data.forEach((distribuidora) => {
        distribuidorasCupo[distribuidora.id] = distribuidora.cupo_diario;
        distribuidorasMaximo[distribuidora.id] = distribuidora.max_bidones_por_pedido;

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
    iniciarCalendarioSuscripcion(evento.target.value);
});

function formatearClaveFechaSuscripcion(fecha) {
    return fecha.toISOString().slice(0, 10);
}

function etiquetaMesSuscripcion(fecha) {
    return fecha.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

function iniciarCalendarioSuscripcion(idDistribuidora) {
    fechaSuscripcionElegida = null;
    document.getElementById('fecha-suscripcion').value = '';

    if (!idDistribuidora) {
        diasSuscripcion = [];
    }

    actualizarPantallaFrecuencia();
    recalcularPrimeraEntrega();
}

async function cargarCalendarioSuscripcion(idDistribuidora) {
    recalcularPrimeraEntrega();
    return;

    const grilla = document.getElementById('grilla-calendario-suscripcion');
    grilla.innerHTML = '';

    const primerDiaMes = new Date(mesSuscripcionActual.getFullYear(), mesSuscripcionActual.getMonth(), 1);
    const ultimoDiaMes = new Date(mesSuscripcionActual.getFullYear(), mesSuscripcionActual.getMonth() + 1, 0);

    const desde = formatearClaveFechaSuscripcion(primerDiaMes);
    const hasta = formatearClaveFechaSuscripcion(ultimoDiaMes);
    const fechasEntrega = new Set(
        calcularFechasEntrega(
            fechaSuscripcionElegida,
            document.getElementById('frecuencia-suscripcion').value,
            hasta
        )
    );

    document.getElementById('etiqueta-mes-suscripcion').textContent = etiquetaMesSuscripcion(mesSuscripcionActual);

    const { data, error } = await supabaseCliente.rpc('obtener_disponibilidad_calendario', {
        p_distribuidora_id: idDistribuidora,
        p_desde: desde,
        p_hasta: hasta
    });

    if (error) {
        grilla.innerHTML = '<p class="estado-suscripciones">No pudimos cargar el calendario.</p>';
        return;
    }

    const mapaDisponibilidad = {};
    (data || []).forEach((fila) => {
        mapaDisponibilidad[fila.fecha] = fila;
    });

    const cupo = distribuidorasCupo[idDistribuidora];
    const hoyClave = formatearClaveFechaSuscripcion(new Date());

    let primeraLibre = null;

    for (let i = 0; i < primerDiaMes.getDay(); i++) {
        const celdaVacia = document.createElement('div');
        celdaVacia.className = 'dia-calendario-cliente dia-vacio-cliente';
        grilla.appendChild(celdaVacia);
    }

    for (let dia = 1; dia <= ultimoDiaMes.getDate(); dia++) {
        const fecha = new Date(mesSuscripcionActual.getFullYear(), mesSuscripcionActual.getMonth(), dia);
        const clave = formatearClaveFechaSuscripcion(fecha);
        const info = mapaDisponibilidad[clave] || { cantidad: 0, bloqueado: false };
        const esPasado = clave < hoyClave;
        const lleno = !info.bloqueado && cupo != null && info.cantidad >= cupo;
        const diaIso = fecha.getDay() === 0 ? 7 : fecha.getDay();
        const frecuenciaElegida = document.getElementById('frecuencia-suscripcion').value;
        const noEsDiaElegido = frecuenciaElegida === 'semanal' && diasSuscripcion.length > 0 && !diasSuscripcion.includes(diaIso);
        const noDisponible = esPasado || info.bloqueado || lleno || noEsDiaElegido;

        const celda = document.createElement('div');
        celda.className = 'dia-calendario-cliente';
        celda.textContent = dia;

        if (noDisponible) {
            celda.classList.add('dia-no-disponible');
        } else {
            celda.addEventListener('click', () => seleccionarFechaSuscripcion(clave, celda));
        }

        if (clave === fechaSuscripcionElegida) {
            celda.classList.add('dia-seleccionado');
        } else if (fechasEntrega.has(clave)) {
            celda.classList.add('dia-entrega-suscripcion');
        }

        if (!noDisponible && !primeraLibre) {
            primeraLibre = clave;
        }

        grilla.appendChild(celda);
    }

    if (
        !fechaSuscripcionElegida &&
        primeraLibre &&
        diasSuscripcion.length > 0 &&
        document.getElementById('frecuencia-suscripcion').value === 'semanal'
    ) {
        fechaSuscripcionElegida = primeraLibre;
        document.getElementById('fecha-suscripcion').value = primeraLibre;

        const fechaElegida = document.getElementById('fecha-elegida-suscripcion');
        fechaElegida.textContent = `Primera entrega: ${formatearFecha(primeraLibre)} (podés cambiarla en el calendario)`;
        fechaElegida.classList.remove('oculto');

        await cargarCalendarioSuscripcion(idDistribuidora);
    }
}

function seleccionarFechaSuscripcion(clave, celda) {
    fechaSuscripcionElegida = clave;
    document.getElementById('fecha-suscripcion').value = clave;

    document.querySelectorAll('.dia-calendario-cliente.dia-seleccionado').forEach((elemento) => {
        elemento.classList.remove('dia-seleccionado');
    });

    celda.classList.add('dia-seleccionado');

    const fechaElegida = document.getElementById('fecha-elegida-suscripcion');
    fechaElegida.textContent = `Entrega elegida: ${formatearFecha(clave)}`;
    fechaElegida.classList.remove('oculto');

    cargarCalendarioSuscripcion(document.getElementById('distribuidora-suscripcion').value);
}

function actualizarPantallaFrecuencia() {
    const frecuencia = document.getElementById('frecuencia-suscripcion').value;

    document.getElementById('etiqueta-dias-suscripcion').textContent = frecuencia === 'semanal'
        ? '¿Qué días querés recibirlo? (podés marcar más de uno)'
        : '¿Qué día querés recibirlo?';

    document.querySelectorAll('#opciones-frecuencia button').forEach((boton) => {
        boton.classList.toggle('activo', boton.dataset.frecuencia === frecuencia);
    });

    document.querySelectorAll('#dias-semana-suscripcion button').forEach((boton) => {
        boton.classList.toggle('activo', diasSuscripcion.includes(Number(boton.dataset.dia)));
    });
}

let consultaPrimeraEntrega = 0;

async function recalcularPrimeraEntrega() {
    const caja = document.getElementById('primera-entrega-auto');
    const idDistribuidora = document.getElementById('distribuidora-suscripcion').value;
    const numeroConsulta = ++consultaPrimeraEntrega;

    fechaSuscripcionElegida = null;
    document.getElementById('fecha-suscripcion').value = '';
    caja.classList.remove('lista');

    if (!idDistribuidora) {
        caja.textContent = 'Primero elegí la distribuidora.';
        return;
    }

    if (diasSuscripcion.length === 0) {
        caja.textContent = 'Tocá el día que te queda cómodo y te mostramos tu primera entrega.';
        return;
    }

    caja.textContent = 'Buscando tu primera entrega...';

    const hoy = new Date();
    const dias = 70;
    const desde = formatearClaveFechaSuscripcion(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1));
    const hasta = formatearClaveFechaSuscripcion(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dias));

    const { data, error } = await supabaseCliente.rpc('obtener_disponibilidad_calendario', {
        p_distribuidora_id: idDistribuidora,
        p_desde: desde,
        p_hasta: hasta
    });

    if (numeroConsulta !== consultaPrimeraEntrega) {
        return;
    }

    if (error) {
        caja.textContent = 'No pudimos buscar las fechas. Probá de nuevo.';
        return;
    }

    const mapa = {};
    (data || []).forEach((fila) => {
        mapa[fila.fecha] = fila;
    });

    const cupo = distribuidorasCupo[idDistribuidora];

    for (let i = 1; i <= dias; i++) {
        const fecha = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i);
        const diaIso = fecha.getDay() === 0 ? 7 : fecha.getDay();

        if (!diasSuscripcion.includes(diaIso)) {
            continue;
        }

        const clave = formatearClaveFechaSuscripcion(fecha);
        const info = mapa[clave] || { cantidad: 0, bloqueado: false };

        if (info.bloqueado || (cupo != null && info.cantidad >= cupo)) {
            continue;
        }

        fechaSuscripcionElegida = clave;
        document.getElementById('fecha-suscripcion').value = clave;

        const texto = fecha.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
        caja.textContent = `Tu primera entrega: ${texto}`;
        caja.classList.add('lista');
        return;
    }

    caja.textContent = 'No hay fechas libres con esos días. Probá con otro día.';
}

document.getElementById('opciones-frecuencia').addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-frecuencia]');

    if (!boton) {
        return;
    }

    document.getElementById('frecuencia-suscripcion').value = boton.dataset.frecuencia;

    if (boton.dataset.frecuencia !== 'semanal' && diasSuscripcion.length > 1) {
        diasSuscripcion = [diasSuscripcion[0]];
    }

    actualizarPantallaFrecuencia();
    recalcularPrimeraEntrega();
});

document.getElementById('dias-semana-suscripcion').addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-dia]');

    if (!boton) {
        return;
    }

    const dia = Number(boton.dataset.dia);

    if (document.getElementById('frecuencia-suscripcion').value !== 'semanal') {
        diasSuscripcion = [dia];
    } else {
        diasSuscripcion = diasSuscripcion.includes(dia)
            ? diasSuscripcion.filter((item) => item !== dia)
            : [...diasSuscripcion, dia].sort((a, b) => a - b);
    }

    actualizarPantallaFrecuencia();
    recalcularPrimeraEntrega();
});

document.getElementById('btn-mes-anterior-suscripcion').addEventListener('click', () => {
    mesSuscripcionActual = new Date(mesSuscripcionActual.getFullYear(), mesSuscripcionActual.getMonth() - 1, 1);
    cargarCalendarioSuscripcion(document.getElementById('distribuidora-suscripcion').value);
});

document.getElementById('btn-mes-siguiente-suscripcion').addEventListener('click', () => {
    mesSuscripcionActual = new Date(mesSuscripcionActual.getFullYear(), mesSuscripcionActual.getMonth() + 1, 1);
    cargarCalendarioSuscripcion(document.getElementById('distribuidora-suscripcion').value);
});

let mapaSuscripcion = null;
let marcadorSuscripcion = null;
let temporizadorDireccionSuscripcion = null;
let resultadosDireccionSuscripcion = [];

function textoDireccionSuscripcion(resultado) {
    const p = resultado.properties || {};
    const calle = [p.street, p.housenumber].filter(Boolean).join(' ');
    const localidad = p.city || p.town || p.village || p.county || '';

    return [calle || p.name, localidad, p.state || '']
        .filter(Boolean)
        .filter((valor, indice, lista) => lista.indexOf(valor) === indice)
        .join(', ');
}

function colocarMarcadorSuscripcion(latitud, longitud) {
    if (!mapaSuscripcion) {
        return;
    }

    if (marcadorSuscripcion) {
        marcadorSuscripcion.setLatLng([latitud, longitud]);
    } else {
        marcadorSuscripcion = L.marker([latitud, longitud]).addTo(mapaSuscripcion);
    }

    mapaSuscripcion.setView([latitud, longitud], 15);
    document.getElementById('latitud-suscripcion').value = latitud;
    document.getElementById('longitud-suscripcion').value = longitud;
}

function iniciarMapaSuscripcion() {
    if (!window.L) {
        return;
    }

    if (!mapaSuscripcion) {
        mapaSuscripcion = L.map('mapa-direccion-suscripcion').setView([-28.4696, -65.7795], 11);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap'
        }).addTo(mapaSuscripcion);

        mapaSuscripcion.on('click', (evento) => {
            colocarMarcadorSuscripcion(evento.latlng.lat, evento.latlng.lng);
        });
    }

    if (marcadorSuscripcion) {
        mapaSuscripcion.removeLayer(marcadorSuscripcion);
        marcadorSuscripcion = null;
    }

    mapaSuscripcion.setView([-28.4696, -65.7795], 11);
    setTimeout(() => mapaSuscripcion.invalidateSize(), 150);
}

async function buscarDireccionSuscripcion(texto) {
    const busqueda = texto.trim();
    const contenedor = document.getElementById('sugerencias-direccion-suscripcion');

    if (busqueda.length < 3) {
        resultadosDireccionSuscripcion = [];
        contenedor.classList.add('oculto');
        return;
    }

    try {
        const parametros = new URLSearchParams({
            q: `${busqueda}, Catamarca, Argentina`,
            limit: '5',
            lat: '-28.4696',
            lon: '-65.7795'
        });

        const respuesta = await fetch(`https://photon.komoot.io/api/?${parametros}`);

        if (!respuesta.ok) {
            throw new Error('No se pudo buscar la dirección.');
        }

        const datos = await respuesta.json();
        resultadosDireccionSuscripcion = datos.features || [];

        contenedor.innerHTML = resultadosDireccionSuscripcion.length === 0
            ? '<p class="sin-sugerencias-direccion">No encontramos esa ubicación.</p>'
            : resultadosDireccionSuscripcion.map((resultado, indice) => `
                <button type="button" class="opcion-direccion" data-indice-direccion="${indice}">
                    ${escaparHtml(textoDireccionSuscripcion(resultado))}
                </button>
            `).join('');

        contenedor.classList.remove('oculto');
    } catch (error) {
        resultadosDireccionSuscripcion = [];
        contenedor.classList.add('oculto');
    }
}

function seleccionarDireccionSuscripcion(resultado) {
    const p = resultado.properties || {};
    const coordenadas = resultado.geometry?.coordinates || [];
    const textoCompleto = textoDireccionSuscripcion(resultado);

    document.getElementById('buscador-direccion-suscripcion').value = textoCompleto;
    document.getElementById('calle-suscripcion').value = p.street || '';
    document.getElementById('numero-suscripcion').value = p.housenumber || '';
    document.getElementById('ciudad-suscripcion').value = p.city || p.town || p.village || p.county || '';
    document.getElementById('provincia-suscripcion').value = p.state || 'Catamarca';
    document.getElementById('sugerencias-direccion-suscripcion').classList.add('oculto');
    document.getElementById('estado-direccion-suscripcion').textContent =
        'Ubicación seleccionada. Revisá calle y número.';

    colocarMarcadorSuscripcion(coordenadas[1], coordenadas[0]);
}

document.getElementById('buscador-direccion-suscripcion').addEventListener('input', (evento) => {
    clearTimeout(temporizadorDireccionSuscripcion);
    document.getElementById('latitud-suscripcion').value = '';
    document.getElementById('longitud-suscripcion').value = '';

    temporizadorDireccionSuscripcion = setTimeout(() => {
        buscarDireccionSuscripcion(evento.target.value);
    }, 500);
});

document.getElementById('sugerencias-direccion-suscripcion').addEventListener('click', (evento) => {
    const opcion = evento.target.closest('[data-indice-direccion]');

    if (!opcion) {
        return;
    }

    const resultado = resultadosDireccionSuscripcion[Number(opcion.dataset.indiceDireccion)];

    if (resultado) {
        seleccionarDireccionSuscripcion(resultado);
    }
});

let direccionesGuardadasSuscripcion = [];

async function cargarDireccionesGuardadasSuscripcion() {
    const { data } = await supabaseCliente
        .from('direcciones_guardadas')
        .select('id, alias, calle, numero, ciudad, provincia, referencia, latitud, longitud')
        .order('creado_en', { ascending: true });

    direccionesGuardadasSuscripcion = data || [];

    document.getElementById('direcciones-guardadas-suscripcion').hidden = direccionesGuardadasSuscripcion.length === 0;

    document.getElementById('lista-direcciones-guardadas-suscripcion').innerHTML = direccionesGuardadasSuscripcion.map((d) => `
        <button type="button" class="chip-direccion-guardada" data-direccion-guardada-suscripcion="${d.id}">
            <strong>${escaparHtml(d.alias)}</strong>
            <span>${escaparHtml([d.calle, d.numero].filter(Boolean).join(' '))}</span>
        </button>
    `).join('');
}

document.getElementById('lista-direcciones-guardadas-suscripcion').addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-direccion-guardada-suscripcion]');

    if (!boton) {
        return;
    }

    const d = direccionesGuardadasSuscripcion.find((item) => item.id === boton.dataset.direccionGuardadaSuscripcion);

    if (!d) {
        return;
    }

    document.getElementById('buscador-direccion-suscripcion').value = [d.calle, d.numero, d.ciudad].filter(Boolean).join(', ');
    document.getElementById('calle-suscripcion').value = d.calle || '';
    document.getElementById('numero-suscripcion').value = d.numero || '';
    document.getElementById('ciudad-suscripcion').value = d.ciudad || '';
    document.getElementById('provincia-suscripcion').value = d.provincia || 'Catamarca';
    document.getElementById('referencia-suscripcion').value = d.referencia || '';
    document.getElementById('estado-direccion-suscripcion').textContent = `Usando tu dirección "${d.alias}".`;

    if (d.latitud && d.longitud) {
        colocarMarcadorSuscripcion(d.latitud, d.longitud);
    }

    document.querySelectorAll('#lista-direcciones-guardadas-suscripcion .chip-direccion-guardada').forEach((chip) => {
        chip.classList.toggle('activa', chip === boton);
    });
});

const titulosPasoSuscripcion = { 1: 'Plan', 2: 'Entrega', 3: 'Pago' };

function irAPasoSuscripcion(numero) {
    pasoSuscripcion = numero;

    document.querySelectorAll('[data-paso-suscripcion]').forEach((elemento) => {
        elemento.classList.toggle('oculto', Number(elemento.dataset.pasoSuscripcion) !== numero);
    });

    document.getElementById('indicador-paso-suscripcion').textContent =
        `Paso ${numero} de 3 · ${titulosPasoSuscripcion[numero]}`;
    document.getElementById('boton-paso-anterior').classList.toggle('oculto', numero === 1);
    document.getElementById('boton-paso-siguiente').classList.toggle('oculto', numero === 3);
    document.getElementById('boton-guardar-suscripcion').classList.toggle('oculto', numero !== 3);
    document.getElementById('mensaje-suscripcion').classList.add('oculto');

    if (numero === 2 && mapaSuscripcion) {
        setTimeout(() => mapaSuscripcion.invalidateSize(), 100);
    }

    if (numero === 2) {
        cargarDireccionesGuardadasSuscripcion();
    }

    if (numero === 3) {
        renderizarResumenSuscripcion();
    }

    document.querySelector('.modal-suscripcion').scrollTop = 0;
}

function renderizarResumenSuscripcion() {
    const producto = productosPorDistribuidora.find(
        (item) => item.id === document.getElementById('producto-suscripcion').value
    );

    if (!producto) {
        return;
    }

    const cantidad = Number(document.getElementById('cantidad-suscripcion').value) || 1;
    const envases = Number(document.getElementById('envases-suscripcion').value) || 0;
    const frecuencia = document.getElementById('frecuencia-suscripcion').value;
    const subtotal = Number(producto.precio) * cantidad;
    const descuento = Math.min(Number(producto.descuento_por_envase || 0) * envases, subtotal);
    const proximas = calcularFechasEntrega(
        fechaSuscripcionElegida,
        frecuencia,
        sumarPeriodoSuscripcion(sumarPeriodoSuscripcion(fechaSuscripcionElegida, 'mensual'), 'mensual')
    ).slice(0, 3);

    const porEntrega = subtotal - descuento;
    const esTransferencia = document.querySelector('input[name="metodo-pago-suscripcion"]:checked').value === 'transferencia';
    document.getElementById('campo-meses-suscripcion').style.display = esTransferencia ? '' : 'none';

    let detallePago = 'Pagás en efectivo al recibir cada pedido.';

    if (esTransferencia) {
        const meses = Number(document.getElementById('meses-suscripcion').value) || 1;
        const finPeriodo = sumarMesesSuscripcion(fechaSuscripcionElegida, meses);
        const entregas = calcularFechasEntrega(fechaSuscripcionElegida, frecuencia, finPeriodo)
            .filter((fecha) => fecha < finPeriodo);

        detallePago = `Plan de ${meses} ${meses === 1 ? 'mes' : 'meses'}: ` +
            `<b>${entregas.length} entregas × ${formatearPrecio(porEntrega)} = ${formatearPrecio(entregas.length * porEntrega)}</b><br>` +
            'Pagás ese total con una sola transferencia. Cada entrega queda detallada en tu suscripción.';
    }

    document.getElementById('resumen-suscripcion').innerHTML = `
        <strong>${cantidad} × ${escaparHtml(producto.nombre)} · ${etiquetasFrecuenciaResumen[frecuencia]}${frecuencia === 'semanal' && diasSuscripcion.length ? ' (' + textoDiasSuscripcion(diasSuscripcion) + ')' : ''}</strong>
        Por entrega: ${formatearPrecio(porEntrega)}<br>
        Próximas entregas: ${proximas.map(formatearFecha).join(' · ')}<br>
        ${detallePago}
    `;
}

const etiquetasFrecuenciaResumen = { semanal: 'Semanal', quincenal: 'Quincenal', mensual: 'Mensual' };

function validarPasoSuscripcion(numero) {
    if (numero === 1) {
        const cantidad = Number(document.getElementById('cantidad-suscripcion').value);

        if (!document.getElementById('distribuidora-suscripcion').value ||
            !document.getElementById('producto-suscripcion').value ||
            !cantidad || cantidad < 1) {
            mostrarMensajeSuscripcion('Elegí distribuidora, producto y cantidad.', 'error');
            return false;
        }

        const maximo = distribuidorasMaximo[document.getElementById('distribuidora-suscripcion').value];

        if (maximo != null && cantidad > maximo) {
            mostrarMensajeSuscripcion(`Esta distribuidora acepta hasta ${maximo} bidones por entrega.`, 'error');
            return false;
        }

        if (!fechaSuscripcionElegida) {
            mostrarMensajeSuscripcion('Elige qué día quieres recibir tu pedido.', 'error');
            return false;
        }
    }

    if (numero === 2) {
        if (!document.getElementById('calle-suscripcion').value.trim() ||
            !document.getElementById('ciudad-suscripcion').value.trim()) {
            mostrarMensajeSuscripcion('Completá calle y ciudad.', 'error');
            return false;
        }

        if (!document.getElementById('latitud-suscripcion').value) {
            mostrarMensajeSuscripcion('Elegí tu ubicación: buscala o tocá el mapa.', 'error');
            return false;
        }
    }

    return true;
}

function avanzarPasoSuscripcion() {
    if (validarPasoSuscripcion(pasoSuscripcion)) {
        irAPasoSuscripcion(pasoSuscripcion + 1);
    }
}

function sumarMesesSuscripcion(clave, meses) {
    const [anio, mes, dia] = clave.split('-').map(Number);
    const ultimoDia = new Date(anio, mes - 1 + meses + 1, 0).getDate();
    return formatearClaveFechaSuscripcion(new Date(anio, mes - 1 + meses, Math.min(dia, ultimoDia)));
}

document.getElementById('boton-paso-siguiente').addEventListener('click', avanzarPasoSuscripcion);
document.getElementById('meses-suscripcion').addEventListener('change', renderizarResumenSuscripcion);
document.querySelectorAll('input[name="metodo-pago-suscripcion"]').forEach((radio) => {
    radio.addEventListener('change', renderizarResumenSuscripcion);
});
document.getElementById('boton-paso-anterior').addEventListener('click', () => {
    irAPasoSuscripcion(pasoSuscripcion - 1);
});

function abrirModalSuscripcion() {
    document.getElementById('formulario-suscripcion').reset();
    document.getElementById('producto-suscripcion').innerHTML = '<option value="">Elegí primero una distribuidora</option>';
    document.getElementById('producto-suscripcion').disabled = true;
    iniciarCalendarioSuscripcion('');
    document.getElementById('mensaje-suscripcion').classList.add('oculto');
    document.getElementById('estado-direccion-suscripcion').textContent = '';
    document.getElementById('sugerencias-direccion-suscripcion').classList.add('oculto');
    document.getElementById('modal-suscripcion').classList.remove('oculto');
    iniciarMapaSuscripcion();
    irAPasoSuscripcion(1);
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
    if (pasoSuscripcion !== 3) {
        evento.preventDefault();
        avanzarPasoSuscripcion();
        return;
    }
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

    const latitud = document.getElementById('latitud-suscripcion').value;
    const longitud = document.getElementById('longitud-suscripcion').value;

    if (!latitud || !longitud) {
        mostrarMensajeSuscripcion('Elegí tu ubicación: buscala o tocá el mapa.', 'error');
        return;
    }

    botonGuardar.disabled = true;
    botonGuardar.textContent = 'Creando...';

    if (metodoPago === 'transferencia') {
        const meses = Number(document.getElementById('meses-suscripcion').value) || 1;

        const { data: idPago, error: errorPago } = await supabaseCliente.rpc('crear_suscripcion_transferencia', {
            p_distribuidora_id: idDistribuidora,
            p_producto_id: idProducto,
            p_cantidad: cantidad,
            p_envases: envases,
            p_frecuencia: frecuencia,
            p_fecha_inicio: fechaInicio,
            p_calle: calle,
            p_numero: numero || null,
            p_ciudad: ciudad,
            p_provincia: provincia || null,
            p_referencia: referencia || null,
            p_latitud: Number(latitud),
            p_longitud: Number(longitud),
            p_meses: meses,
            p_dias: frecuencia === 'semanal' && diasSuscripcion.length ? diasSuscripcion : null
        });

        if (errorPago || !idPago) {
            mostrarMensajeSuscripcion(errorPago?.message || 'No pudimos crear la suscripción. Probá de nuevo.', 'error');
            botonGuardar.disabled = false;
            botonGuardar.textContent = 'Crear suscripción';
            return;
        }

        localStorage.setItem('aquatrack_pago_pendiente', idPago);
        window.location.href = 'carrito.html';
        return;
    }

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
            latitud: Number(latitud),
            longitud: Number(longitud),
            metodo_pago: metodoPago,
            dias_semana: frecuencia === 'semanal' && diasSuscripcion.length ? diasSuscripcion : null
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

async function cargarRecordatorioEntrega(listaSuscripciones) {
    const contenedor = document.getElementById('recordatorio-entrega');

    const activas = (listaSuscripciones || []).filter(
        (suscripcion) => suscripcion.estado === 'activa' && suscripcion.proxima_entrega
    );

    if (activas.length === 0) {
        contenedor.classList.add('oculto');
        return;
    }

    const proxima = activas.reduce((masCercana, actual) =>
        actual.proxima_entrega < masCercana.proxima_entrega ? actual : masCercana
    );

    const { data: pagoPendiente } = await supabaseCliente
        .from('pagos_transferencia')
        .select('id, monto_total, comprobante_url')
        .eq('cliente_id', usuarioIdActual)
        .eq('estado', 'pendiente')
        .order('creado_en', { ascending: false })
        .limit(1)
        .maybeSingle();

    const hayPagoPendiente = Boolean(pagoPendiente && !pagoPendiente.comprobante_url);

    if (hayPagoPendiente) {
        localStorage.setItem('aquatrack_pago_pendiente', pagoPendiente.id);
    }

    contenedor.classList.remove('oculto');
    contenedor.classList.toggle('recordatorio-alerta', hayPagoPendiente);

    contenedor.innerHTML = hayPagoPendiente
        ? `
            <p class="recordatorio-texto">
                ⚠️ Tu próxima entrega es el <strong>${formatearFecha(proxima.proxima_entrega)}</strong>
                y todavía tenés un pago pendiente de <strong>${formatearPrecio(pagoPendiente.monto_total)}</strong>.
            </p>
            <a href="carrito.html" class="btn btn-secundario btn-chico">Ver y subir comprobante</a>
        `
        : `
            <p class="recordatorio-texto">
                🚚 Tu próxima entrega es el <strong>${formatearFecha(proxima.proxima_entrega)}</strong>.
            </p>
        `;
}

let idsConEntregasPendientes = new Set();

async function cargarSuscripciones() {
    const lista = document.getElementById('lista-suscripciones');
    const estado = document.getElementById('estado-suscripciones');

    const { data, error } = await supabaseCliente
        .from('suscripciones')
        .select(`
            id, cantidad, envases_devueltos, frecuencia, fecha_inicio, proxima_entrega, estado, ultimo_pedido_id,
            metodo_pago, pagada_hasta, dias_semana,
            distribuidoras ( nombre ),
            productos ( nombre, capacidad_litros, precio )
        `)
        .eq('cliente_id', usuarioIdActual)
        .order('creado_en', { ascending: false });

    if (error) {
        mostrarEstadoSuscripciones('No pudimos cargar tus suscripciones. Probá de nuevo más tarde.');
        return;
    }

    await cargarRecordatorioEntrega(data);

    idsConEntregasPendientes = new Set();
    const idsCanceladas = (data || []).filter((s) => s.estado === 'cancelada').map((s) => s.id);

    if (idsCanceladas.length > 0) {
        const { data: pendientes } = await supabaseCliente
            .from('pedidos')
            .select('suscripcion_id')
            .in('suscripcion_id', idsCanceladas)
            .in('estado', ['pendiente', 'asignado', 'en_camino'])
            .gte('fecha_entrega', new Date().toLocaleDateString('en-CA'));

        idsConEntregasPendientes = new Set((pendientes || []).map((p) => p.suscripcion_id));
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

        const esTransferencia = suscripcion.metodo_pago === 'transferencia';

        const accionesTransferencia = `

            <button type="button" class="boton-reactivar-suscripcion" data-renovar="${suscripcion.id}">Renovar</button>
            <button type="button" class="boton-cancelar-suscripcion" data-cancelar="${suscripcion.id}">Cancelar</button>`;

        const acciones = esTransferencia && suscripcion.estado !== 'cancelada'
            ? accionesTransferencia
            : suscripcion.estado === 'activa'
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
                    <p>${escaparHtml(suscripcion.distribuidoras?.nombre || 'AquaTrack')} — ${etiquetasFrecuencia[suscripcion.frecuencia] || suscripcion.frecuencia}${suscripcion.dias_semana && suscripcion.dias_semana.length ? ' (' + textoDiasSuscripcion(suscripcion.dias_semana) + ')' : ''}</p>
                    <p>Estimado por entrega: ${formatearPrecio(totalEstimado)}</p>
                    ${suscripcion.metodo_pago === 'transferencia' && suscripcion.pagada_hasta && (suscripcion.estado !== 'cancelada' || idsConEntregasPendientes.has(suscripcion.id))
                ? `<p>Entregas pagas hasta: ${formatearFecha(suscripcion.pagada_hasta)}</p>`
                : ''}
                    ${suscripcion.estado !== 'cancelada'
                ? `<p>Próxima entrega: ${formatearFecha(suscripcion.proxima_entrega)}</p>`
                : `<p>Cancelada${idsConEntregasPendientes.has(suscripcion.id) ? ' — no se renueva; se cumplen las entregas ya pagas' : ''}</p>`}
                    ${suscripcion.ultimo_pedido_id
                ? `<a href="ticket.html?pedido=${suscripcion.ultimo_pedido_id}">Ver último ticket generado</a>`
                : ''}
                </div>

                <div class="detalle-suscripcion">
                    <span class="etiqueta-estado-pedido ${suscripcion.estado}">${etiquetasEstadoSuscripcion[suscripcion.estado] || suscripcion.estado}</span>
                    <div class="acciones-suscripcion">${(suscripcion.estado !== 'cancelada' || idsConEntregasPendientes.has(suscripcion.id))
                ? `<button type="button" class="boton-reactivar-suscripcion" data-calendario="${suscripcion.id}" data-frecuencia="${suscripcion.frecuencia}" data-dias="${(suscripcion.dias_semana || []).join(',')}" data-proxima="${suscripcion.proxima_entrega || ''}" data-metodo="${suscripcion.metodo_pago}" data-estado="${suscripcion.estado}">Ver calendario</button>`
                : ''}<button type="button" class="boton-reactivar-suscripcion" data-cuenta="${suscripcion.id}">Ver cuenta</button>${acciones}</div>
                </div>
            </div>
        `;
    }).join('');
}

document.getElementById('lista-suscripciones').addEventListener('click', async (evento) => {
    const botonPausar = evento.target.closest('[data-pausar]');
    const botonReactivar = evento.target.closest('[data-reactivar]');
    const botonCancelar = evento.target.closest('[data-cancelar]');
    const botonRenovar = evento.target.closest('[data-renovar]');

    if (botonRenovar) {
        suscripcionARenovar = botonRenovar.dataset.renovar;
        mesesRenovar = 1;

        document.querySelectorAll('.opcion-mes-renovar').forEach((opcion) => {
            opcion.classList.toggle('seleccionada', opcion.dataset.meses === '1');
        });

        document.getElementById('mensaje-renovar').classList.add('oculto');
        document.getElementById('modal-renovar').classList.remove('oculto');
        return;
    }

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
        if (!confirm('¿Seguro que querés cancelar esta suscripción? Ya no se va a renovar ni a generar pedidos nuevos. Las entregas que ya pagaste se cumplen igual.')) {
            return;
        }

        const { error: errorCancelar } = await supabaseCliente.rpc('cancelar_suscripcion', {
            p_suscripcion_id: botonCancelar.dataset.cancelar
        });

        if (errorCancelar) {
            alert('No pudimos cancelar la suscripción. Intentá de nuevo.');
            return;
        }

        await cargarSuscripciones();
    }
});

const calendarioEntregas = { mes: new Date(), fechas: {}, estimadas: new Set() };

function renderizarCalendarioEntregas() {
    const grilla = document.getElementById('grilla-calendario-entregas');
    const { mes, fechas, estimadas } = calendarioEntregas;
    const primerDia = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const ultimoDia = new Date(mes.getFullYear(), mes.getMonth() + 1, 0);
    const hoy = formatearClaveFechaSuscripcion(new Date());

    document.getElementById('etiqueta-mes-entregas').textContent = etiquetaMesSuscripcion(mes);
    grilla.innerHTML = '';

    for (let i = 0; i < primerDia.getDay(); i++) {
        const vacia = document.createElement('div');
        vacia.className = 'dia-calendario-cliente dia-vacio-cliente';
        grilla.appendChild(vacia);
    }

    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
        const clave = formatearClaveFechaSuscripcion(new Date(mes.getFullYear(), mes.getMonth(), dia));
        const estado = fechas[clave];
        const celda = document.createElement('div');

        celda.className = 'dia-calendario-cliente dia-solo-lectura';
        celda.textContent = dia;

        if (estado === 'entregado') {
            celda.classList.add('dia-entrega-hecha');
        } else if (estado === 'cancelado') {
            celda.classList.add('dia-entrega-cancelada');
        } else if (estado) {
            celda.classList.add('dia-entrega-suscripcion');
        } else if (estimadas.has(clave)) {
            celda.classList.add('dia-entrega-estimada');
        }

        if (clave === hoy) {
            celda.classList.add('dia-hoy-entregas');
        }

        grilla.appendChild(celda);
    }
}

async function abrirCalendarioEntregas(boton) {
    const grilla = document.getElementById('grilla-calendario-entregas');
    const resumen = document.getElementById('resumen-calendario-entregas');

    document.getElementById('modal-calendario-entregas').classList.remove('oculto');
    grilla.innerHTML = '<p class="estado-suscripciones">Cargando calendario...</p>';
    resumen.textContent = '';

    const { data, error } = await supabaseCliente
        .from('pedidos')
        .select('fecha_entrega, estado')
        .eq('suscripcion_id', boton.dataset.calendario);

    if (error) {
        grilla.innerHTML = '<p class="estado-suscripciones">No pudimos cargar el calendario.</p>';
        return;
    }

    const fechas = {};
    (data || []).forEach((pedido) => {
        if (pedido.fecha_entrega) {
            fechas[pedido.fecha_entrega] = pedido.estado;
        }
    });

    const hoy = formatearClaveFechaSuscripcion(new Date());
    const estimadas = new Set();

    if (boton.dataset.metodo !== 'transferencia' && boton.dataset.estado === 'activa' && boton.dataset.proxima) {
        const limite = new Date();
        limite.setMonth(limite.getMonth() + 6);

        calcularFechasEntrega(
            boton.dataset.proxima,
            boton.dataset.frecuencia,
            formatearClaveFechaSuscripcion(limite),
            boton.dataset.dias ? boton.dataset.dias.split(',').map(Number) : []
        ).forEach((clave) => {
            if (clave >= hoy && !fechas[clave]) {
                estimadas.add(clave);
            }
        });
    }

    const proximas = [
        ...Object.entries(fechas)
            .filter(([clave, estado]) => clave >= hoy && estado !== 'cancelado' && estado !== 'entregado')
            .map(([clave]) => clave),
        ...estimadas
    ].sort();

    calendarioEntregas.fechas = fechas;
    calendarioEntregas.estimadas = estimadas;
    calendarioEntregas.mes = proximas.length
        ? new Date(Number(proximas[0].slice(0, 4)), Number(proximas[0].slice(5, 7)) - 1, 1)
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    resumen.textContent = proximas.length
        ? `Próxima entrega: ${formatearFecha(proximas[0])}`
        : 'No hay entregas programadas.';

    renderizarCalendarioEntregas();
}

document.getElementById('lista-suscripciones').addEventListener('click', async (evento) => {
    const botonCuenta = evento.target.closest('[data-cuenta]');

    if (botonCuenta) {
        const contenido = document.getElementById('contenido-cuenta-suscripcion');
        contenido.innerHTML = '<p class="estado-suscripciones">Cargando cuenta...</p>';
        document.getElementById('modal-cuenta-suscripcion').classList.remove('oculto');

        const cuenta = await obtenerCuentaSuscripcion(botonCuenta.dataset.cuenta);
        contenido.innerHTML = cuenta
            ? htmlCuentaSuscripcion(cuenta)
            : '<p class="estado-suscripciones">No pudimos cargar la cuenta. Probá de nuevo.</p>';
        return;
    }

    const boton = evento.target.closest('[data-calendario]');

    if (boton) {
        abrirCalendarioEntregas(boton);
    }
});

document.getElementById('btn-mes-anterior-entregas').addEventListener('click', () => {
    const { mes } = calendarioEntregas;
    calendarioEntregas.mes = new Date(mes.getFullYear(), mes.getMonth() - 1, 1);
    renderizarCalendarioEntregas();
});

document.getElementById('btn-mes-siguiente-entregas').addEventListener('click', () => {
    const { mes } = calendarioEntregas;
    calendarioEntregas.mes = new Date(mes.getFullYear(), mes.getMonth() + 1, 1);
    renderizarCalendarioEntregas();
});

document.getElementById('boton-cerrar-modal-cuenta').addEventListener('click', () => {
    document.getElementById('modal-cuenta-suscripcion').classList.add('oculto');
});

document.getElementById('boton-cerrar-modal-entregas').addEventListener('click', () => {
    document.getElementById('modal-calendario-entregas').classList.add('oculto');
});

let suscripcionARenovar = null;
let mesesRenovar = 1;

document.getElementById('opciones-meses-renovar').addEventListener('click', (evento) => {
    const opcion = evento.target.closest('[data-meses]');

    if (!opcion) {
        return;
    }

    mesesRenovar = Number(opcion.dataset.meses);

    document.querySelectorAll('.opcion-mes-renovar').forEach((boton) => {
        boton.classList.toggle('seleccionada', boton === opcion);
    });
});

document.getElementById('boton-cerrar-modal-renovar').addEventListener('click', () => {
    document.getElementById('modal-renovar').classList.add('oculto');
});

document.getElementById('boton-confirmar-renovar').addEventListener('click', async () => {
    const boton = document.getElementById('boton-confirmar-renovar');
    const mensaje = document.getElementById('mensaje-renovar');

    boton.disabled = true;
    boton.textContent = 'Preparando pago...';

    const { data: idPago, error } = await supabaseCliente.rpc('renovar_suscripcion_transferencia', {
        p_suscripcion_id: suscripcionARenovar,
        p_meses: mesesRenovar
    });

    if (error || !idPago) {
        mensaje.textContent = error?.message || 'No pudimos renovar la suscripción. Probá de nuevo.';
        mensaje.className = 'mensaje-estado error';
        boton.disabled = false;
        boton.textContent = 'Continuar al pago';
        return;
    }

    localStorage.setItem('aquatrack_pago_pendiente', idPago);
    window.location.href = 'carrito.html';
});

async function verificarSesionNav() {
    const { data: { session } } = await supabaseCliente.auth.getSession();
    document.getElementById('nav-invitado').classList.toggle('oculto', Boolean(session));
    document.getElementById('nav-usuario').classList.toggle('oculto', !session);
}

document.getElementById('boton-cerrar-sesion').addEventListener('click', async () => {
    await supabaseCliente.auth.signOut();
    localStorage.removeItem('aquatrack_carrito');
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

document.getElementById('btn-atras')?.addEventListener('click', () => {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = 'index.html';
    }
});