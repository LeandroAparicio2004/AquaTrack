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

const etiquetasRolUsuario = {
    cliente: 'Clientes',
    vendedor: 'Vendedores',
    repartidor: 'Repartidores',
    admin: 'Admins'
};

function crearOActualizarGrafico(idCanvas, config) {
    if (graficos[idCanvas]) {
        graficos[idCanvas].destroy();
    }

    const contexto = document.getElementById(idCanvas).getContext('2d');
    graficos[idCanvas] = new Chart(contexto, config);
}

// ---------- Ventas totales por día ----------

async function cargarGraficoVentas() {
    const fechaDesde = fechaDesdeRango(document.getElementById('filtro-ventas').value);
    const { data, error } = await supabaseCliente
        .from('pedidos')
        .select('total, creado_en, estado')
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

// ---------- Pagos pendientes vs confirmados ----------

async function cargarGraficoPagos() {
    const fechaDesde = fechaDesdeRango(document.getElementById('filtro-pagos').value);
    const { data, error } = await supabaseCliente
        .from('pagos_transferencia')
        .select('estado, monto_total, creado_en')
        .gte('creado_en', fechaDesde);

    if (error) {
        console.error('Error al cargar pagos:', error);
        return;
    }

    const resumen = {
        pendiente: { cantidad: 0, monto: 0 },
        confirmado: { cantidad: 0, monto: 0 }
    };

    (data || []).forEach((pago) => {
        if (!resumen[pago.estado]) {
            return;
        }

        resumen[pago.estado].cantidad += 1;
        resumen[pago.estado].monto += Number(pago.monto_total) || 0;
    });

    datosParaExportar.pagos = [
        { Estado: 'Pendiente', Cantidad: resumen.pendiente.cantidad, 'Monto total': resumen.pendiente.monto },
        { Estado: 'Confirmado', Cantidad: resumen.confirmado.cantidad, 'Monto total': resumen.confirmado.monto }
    ];

    crearOActualizarGrafico('grafico-pagos', {
        type: 'bar',
        data: {
            labels: ['Pendiente', 'Confirmado'],
            datasets: [{
                label: 'Cantidad de pagos',
                data: [resumen.pendiente.cantidad, resumen.confirmado.cantidad],
                backgroundColor: ['#ffb020', '#2ecc71']
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

// ---------- Comisión retenida ----------

async function cargarGraficoComision() {
    const fechaDesde = fechaDesdeRango(document.getElementById('filtro-comision').value);
    const { data, error } = await supabaseCliente
        .from('pagos_transferencia')
        .select('monto_total, comision_porcentaje, confirmado_en')
        .eq('estado', 'confirmado')
        .gte('confirmado_en', fechaDesde)
        .order('confirmado_en');

    if (error) {
        console.error('Error al cargar comisión:', error);
        return;
    }

    const mapaComision = new Map();

    (data || []).forEach((pago) => {
        if (!pago.confirmado_en) {
            return;
        }

        const fecha = pago.confirmado_en.slice(0, 10);
        // Porce%
        const comision = (Number(pago.monto_total) || 0) * (Number(pago.comision_porcentaje) || 0) / 100;
        mapaComision.set(fecha, (mapaComision.get(fecha) || 0) + comision);
    });

    const fechasOrdenadas = Array.from(mapaComision.keys()).sort();
    const valores = fechasOrdenadas.map((fecha) => mapaComision.get(fecha));

    datosParaExportar.comision = fechasOrdenadas.map((fecha, indice) => ({
        Fecha: fecha,
        'Comisión retenida': valores[indice]
    }));

    crearOActualizarGrafico('grafico-comision', {
        type: 'line',
        data: {
            labels: fechasOrdenadas,
            datasets: [{
                label: 'Comisión ($)',
                data: valores,
                borderColor: '#9b59b6',
                backgroundColor: 'rgba(155, 89, 182, 0.15)',
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

// ---------- Ranking de distribuidoras ----------

async function cargarGraficoRanking() {
    const fechaDesde = fechaDesdeRango(document.getElementById('filtro-ranking').value);
    const { data, error } = await supabaseCliente
        .from('pedidos')
        .select('total, distribuidoras ( nombre )')
        .neq('estado', 'cancelado')
        .gte('creado_en', fechaDesde);

    if (error) {
        console.error('Error al cargar ranking de distribuidoras:', error);
        return;
    }

    const mapaDistribuidoras = new Map();

    (data || []).forEach((pedido) => {
        const nombre = pedido.distribuidoras?.nombre || 'Distribuidora';
        mapaDistribuidoras.set(nombre, (mapaDistribuidoras.get(nombre) || 0) + (Number(pedido.total) || 0));
    });

    const ranking = Array.from(mapaDistribuidoras.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const etiquetas = ranking.map(([nombre]) => nombre);
    const valores = ranking.map(([, total]) => total);

    datosParaExportar.ranking = ranking.map(([nombre, total]) => ({
        Distribuidora: nombre,
        'Ventas totales': total
    }));

    crearOActualizarGrafico('grafico-ranking', {
        type: 'bar',
        data: {
            labels: etiquetas,
            datasets: [{
                label: 'Ventas ($)',
                data: valores,
                backgroundColor: '#0b718f'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    ticks: {
                        callback: (valor) => formatearPrecio(valor)
                    }
                }
            }
        }
    });
}

// ---------- Usuarios registrados por rol ----------

async function cargarGraficoUsuarios() {
    const { data, error } = await supabaseCliente
        .from('usuarios')
        .select('rol');

    if (error) {
        console.error('Error al cargar usuarios:', error);
        return;
    }

    const mapaRoles = new Map();

    (data || []).forEach((usuario) => {
        const clave = usuario.rol || 'cliente';
        mapaRoles.set(clave, (mapaRoles.get(clave) || 0) + 1);
    });

    const roles = Array.from(mapaRoles.keys());
    const etiquetas = roles.map((rol) => etiquetasRolUsuario[rol] || rol);
    const valores = roles.map((rol) => mapaRoles.get(rol));

    datosParaExportar.usuarios = roles.map((rol, indice) => ({
        Rol: etiquetas[indice],
        Cantidad: valores[indice]
    }));

    crearOActualizarGrafico('grafico-usuarios', {
        type: 'bar',
        data: {
            labels: etiquetas,
            datasets: [{
                label: 'Usuarios',
                data: valores,
                backgroundColor: '#3498db'
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

async function cargarTodasLasMetricas() {
    mostrarEstadoMetricas('Cargando métricas...');

    await Promise.all([
        cargarGraficoVentas(),
        cargarGraficoEstados(),
        cargarGraficoPagos(),
        cargarGraficoComision(),
        cargarGraficoRanking(),
        cargarGraficoUsuarios()
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
    XLSX.writeFile(libro, `aquatrack-admin-${clave}.xlsx`);
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
document.getElementById('filtro-pagos').addEventListener('change', cargarGraficoPagos);
document.getElementById('filtro-comision').addEventListener('change', cargarGraficoComision);
document.getElementById('filtro-ranking').addEventListener('change', cargarGraficoRanking);

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

    if (perfil?.rol !== 'admin') {
        window.location.href = 'productos.html';
        return;
    }

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