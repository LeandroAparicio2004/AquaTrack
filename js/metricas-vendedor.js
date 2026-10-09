let distribuidoraActual = null;
let graficos = {};
let datosParaExportar = {};

function escaparHtml(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, (caracter) => {
        const caracteresEspeciales = {
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
        };
        return caracteresEspeciales[caracter];
    });
}

function formatearPrecio(precio) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0
    }).format(Number(precio) || 0);
}

function mostrarEstadoMetricas(texto) {
    const estado = document.getElementById('estado-metricas');
    estado.textContent = texto;
    estado.classList.toggle('oculto', !texto);
}

function fechaDesdeRango(dias) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - Number(dias));
    return fecha.toISOString();
}

const etiquetasEstadoMetricas = {
    pendiente: 'Pendiente',
    asignado: 'Asignado',
    en_camino: 'En camino',
    entregado: 'Entregado',
    cancelado: 'Cancelado'
};

function crearOActualizarGrafico(idCanvas, config) {
    if (graficos[idCanvas]) {
        graficos[idCanvas].destroy();
    }

    const contexto = document.getElementById(idCanvas).getContext('2d');
    graficos[idCanvas] = new Chart(contexto, config);
}

// ---------- Ventas por día ----------

async function cargarGraficoVentas() {
    const fechaDesde = fechaDesdeRango(document.getElementById('filtro-ventas').value);
    const { data, error } = await supabaseCliente
        .from('pedidos')
        .select('total, creado_en, estado')
        .eq('distribuidora_id', distribuidoraActual.id)
        .neq('estado', 'cancelado')
        .gte('creado_en', fechaDesde)
        .order('creado_en');

    if (error) {
        console.error('Error al cargar ventas:', error);
        return;
    }

    const mapaVentas = new Map();

    (data || []).forEach((pedido) => {
        const fecha = pedido.creado_en.slice(0, 10);
        mapaVentas.set(fecha, (mapaVentas.get(fecha) || 0) + (Number(pedido.total) || 0));
    });

    const fechasOrdenadas = Array.from(mapaVentas.keys()).sort();
    const valores = fechasOrdenadas.map((fecha) => mapaVentas.get(fecha));

    datosParaExportar.ventas = fechasOrdenadas.map((fecha, indice) => ({
        Fecha: fecha,
        'Total vendido': valores[indice]
    }));

    crearOActualizarGrafico('grafico-ventas', {
        type: 'line',
        data: {
            labels: fechasOrdenadas,
            datasets: [{
                label: 'Ventas ($)',
                data: valores,
                borderColor: '#0b718f',
                backgroundColor: 'rgba(11, 113, 143, 0.15)',
                tension: 0.25,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    ticks: {
                        callback: (valor) => formatearPrecio(valor)
                    }
                }
            }
        }
    });
}

// ---------- Pedidos por estado ----------

async function cargarGraficoEstados() {
    const fechaDesde = fechaDesdeRango(document.getElementById('filtro-estados').value);
    const { data, error } = await supabaseCliente
        .from('pedidos')
        .select('estado')
        .eq('distribuidora_id', distribuidoraActual.id)
        .gte('creado_en', fechaDesde);

    if (error) {
        console.error('Error al cargar pedidos por estado:', error);
        return;
    }

    const mapaEstados = new Map();

    (data || []).forEach((pedido) => {
        const clave = pedido.estado || 'pendiente';
        mapaEstados.set(clave, (mapaEstados.get(clave) || 0) + 1);
    });

    const estados = Array.from(mapaEstados.keys());
    const etiquetas = estados.map((estado) => etiquetasEstadoMetricas[estado] || estado);
    const valores = estados.map((estado) => mapaEstados.get(estado));

    datosParaExportar.estados = estados.map((estado, indice) => ({
        Estado: etiquetas[indice],
        Cantidad: valores[indice]
    }));

    crearOActualizarGrafico('grafico-estados', {
        type: 'bar',
        data: {
            labels: etiquetas,
            datasets: [{
                label: 'Pedidos',
                data: valores,
                backgroundColor: '#0b718f'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { ticks: { precision: 0 } } }
        }
    });
}

// ---------- Productos más vendidos ----------

async function cargarGraficoProductos() {
    const fechaDesde = fechaDesdeRango(document.getElementById('filtro-productos').value);
    const { data, error } = await supabaseCliente
        .from('detalles_pedidos')
        .select('cantidad, productos ( nombre ), pedidos!inner ( distribuidora_id, estado, creado_en )')
        .eq('pedidos.distribuidora_id', distribuidoraActual.id)
        .neq('pedidos.estado', 'cancelado')
        .gte('pedidos.creado_en', fechaDesde);

    if (error) {
        console.error('Error al cargar productos más vendidos:', error);
        return;
    }

    const mapaProductos = new Map();

    (data || []).forEach((detalle) => {
        const nombre = detalle.productos?.nombre || 'Producto';
        mapaProductos.set(nombre, (mapaProductos.get(nombre) || 0) + (Number(detalle.cantidad) || 0));
    });

    const productosOrdenados = Array.from(mapaProductos.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const etiquetas = productosOrdenados.map(([nombre]) => nombre);
    const valores = productosOrdenados.map(([, cantidad]) => cantidad);

    datosParaExportar.productos = productosOrdenados.map(([nombre, cantidad]) => ({
        Producto: nombre,
        'Unidades vendidas': cantidad
    }));

    crearOActualizarGrafico('grafico-productos', {
        type: 'bar',
        data: {
            labels: etiquetas,
            datasets: [{
                label: 'Unidades vendidas',
                data: valores,
                backgroundColor: '#2ecc71'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: { x: { ticks: { precision: 0 } } }
        }
    });
}

// ---------- Repartidores con más entregas ----------

async function cargarGraficoRepartidores() {
    const fechaDesde = fechaDesdeRango(document.getElementById('filtro-repartidores').value);
    const { data, error } = await supabaseCliente
        .from('entregas')
        .select('repartidor_id, usuarios ( nombre, apellido ), pedidos!inner ( distribuidora_id, estado, creado_en )')
        .eq('pedidos.distribuidora_id', distribuidoraActual.id)
        .eq('pedidos.estado', 'entregado')
        .gte('pedidos.creado_en', fechaDesde);

    if (error) {
        console.error('Error al cargar repartidores:', error);
        return;
    }

    const mapaRepartidores = new Map();

    (data || []).forEach((entrega) => {
        const nombre = entrega.usuarios
            ? `${entrega.usuarios.nombre || ''} ${entrega.usuarios.apellido || ''}`.trim()
            : 'Repartidor';

        mapaRepartidores.set(nombre, (mapaRepartidores.get(nombre) || 0) + 1);
    });

    const repartidoresOrdenados = Array.from(mapaRepartidores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const etiquetas = repartidoresOrdenados.map(([nombre]) => nombre);
    const valores = repartidoresOrdenados.map(([, cantidad]) => cantidad);

    datosParaExportar.repartidores = repartidoresOrdenados.map(([nombre, cantidad]) => ({
        Repartidor: nombre,
        Entregas: cantidad
    }));

    crearOActualizarGrafico('grafico-repartidores', {
        type: 'bar',
        data: {
            labels: etiquetas,
            datasets: [{
                label: 'Entregas',
                data: valores,
                backgroundColor: '#ffb020'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: { x: { ticks: { precision: 0 } } }
        }
    });
}

async function cargarTodasLasMetricas() {
    mostrarEstadoMetricas('Cargando métricas...');

    await Promise.all([
        cargarGraficoVentas(),
        cargarGraficoEstados(),
        cargarGraficoProductos(),
        cargarGraficoRepartidores()
    ]);

    mostrarEstadoMetricas('');
}

// ---------- Descargas ----------

function descargarPNG(idCanvas, nombreArchivo) {
    const grafico = graficos[idCanvas];

    if (!grafico) {
        return;
    }

    const enlace = document.createElement('a');
    enlace.href = grafico.toBase64Image();
    enlace.download = `${nombreArchivo}.png`;
    enlace.click();
}

function descargarExcel(clave) {
    const filas = datosParaExportar[clave];

    if (!filas || filas.length === 0) {
        alert('No hay datos para exportar en este período.');
        return;
    }

    const hoja = XLSX.utils.json_to_sheet(filas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Datos');
    XLSX.writeFile(libro, `aquatrack-${clave}.xlsx`);
}

document.querySelector('.grilla-metricas').addEventListener('click', (evento) => {
    const botonPng = evento.target.closest('[data-descargar-png]');
    const botonExcel = evento.target.closest('[data-descargar-excel]');

    if (botonPng) {
        descargarPNG(botonPng.dataset.descargarPng, botonPng.dataset.nombre);
    }

    if (botonExcel) {
        descargarExcel(botonExcel.dataset.descargarExcel);
    }
});

document.getElementById('filtro-ventas').addEventListener('change', cargarGraficoVentas);
document.getElementById('filtro-estados').addEventListener('change', cargarGraficoEstados);
document.getElementById('filtro-productos').addEventListener('change', cargarGraficoProductos);
document.getElementById('filtro-repartidores').addEventListener('change', cargarGraficoRepartidores);

// ---------- Inicialización ----------

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

    if (perfil?.rol !== 'vendedor') {
        window.location.href = 'productos.html';
        return;
    }

    const { data: membresia, error: errorMembresia } = await supabaseCliente
        .from('miembros_distribuidoras')
        .select('distribuidoras ( id, nombre )')
        .eq('usuario_id', session.user.id)
        .eq('rol', 'vendedor')
        .eq('estado', 'activo')
        .single();

    if (errorMembresia || !membresia?.distribuidoras) {
        document.getElementById('panel-cargando').innerHTML =
            '<p>No pudimos encontrar tu distribuidora. Contactá a soporte.</p>';
        return;
    }

    distribuidoraActual = membresia.distribuidoras;

    document.getElementById('nombre-distribuidora').textContent = distribuidoraActual.nombre;

    document.getElementById('panel-cargando').classList.add('oculto');
    document.getElementById('panel-header').classList.remove('oculto');
    document.getElementById('panel-main').classList.remove('oculto');

    await cargarTodasLasMetricas();
}

inicializarPanel();

document.getElementById('boton-cerrar-sesion').addEventListener('click', async () => {
    await supabaseCliente.auth.signOut();
    window.location.href = 'login.html';
});