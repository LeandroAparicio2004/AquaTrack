(function () {
    const seccion = document.getElementById('seccion-rutas');
    if (!seccion || typeof supabaseCliente === 'undefined') return;

    const vistaLista = document.getElementById('rutas-vista-lista');
    const vistaDetalle = document.getElementById('rutas-vista-detalle');
    const botonExportar = document.getElementById('btn-exportar-rutas');
    const inputDesde = document.getElementById('rutas-desde');
    const inputHasta = document.getElementById('rutas-hasta');
    const estadoLista = document.getElementById('estado-rutas');
    const cuerpoLista = document.getElementById('lista-rutas');
    const tituloDetalle = document.getElementById('rutas-titulo-detalle');
    const resumenDetalle = document.getElementById('resumen-rutas');
    const cuerpoDetalle = document.getElementById('detalle-ruta');

    let hojasCargadas = [];
    let hojaActual = null;
    let detalleCargado = [];

    function escapar(valor) {
        const div = document.createElement('div');
        div.textContent = valor === null || valor === undefined ? '' : String(valor);
        return div.innerHTML;
    }

    function moneda(valor) {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            maximumFractionDigits: 0
        }).format(Number(valor) || 0);
    }

    function fechaISOLocal(fecha) {
        const anio = fecha.getFullYear();
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const dia = String(fecha.getDate()).padStart(2, '0');
        return `${anio}-${mes}-${dia}`;
    }

    function fechaHora(valor) {
        return new Date(valor).toLocaleString('es-AR', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    }

    function hora(valor) {
        return valor
            ? new Date(valor).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
            : '—';
    }

    function mostrar(vista) {
        vistaLista.style.display = vista === 'lista' ? '' : 'none';
        vistaDetalle.style.display = vista === 'detalle' ? '' : 'none';
        botonExportar.style.display = vista === 'detalle' ? '' : 'none';
    }

    async function cargarLista() {
        mostrar('lista');

        if (!inputDesde.value) {
            const hoy = fechaISOLocal(new Date());
            inputDesde.value = hoy;
            inputHasta.value = hoy;
        }

        const { data, error } = await supabaseCliente.rpc('listar_hojas_ruta', {
            p_desde: inputDesde.value || null,
            p_hasta: inputHasta.value || null
        });

        if (error) {
            cuerpoLista.innerHTML = '';
            estadoLista.textContent = 'No pudimos cargar las hojas de ruta. Recargá la página.';
            estadoLista.classList.remove('oculto');
            return;
        }

        hojasCargadas = data || [];

        if (hojasCargadas.length === 0) {
            cuerpoLista.innerHTML = '';
            estadoLista.textContent = 'No hay rutas finalizadas en este período.';
            estadoLista.classList.remove('oculto');
            return;
        }

        estadoLista.classList.add('oculto');

        cuerpoLista.innerHTML = hojasCargadas.map((hoja) => `
            <tr>
                <td>${fechaHora(hoja.finalizada_en)}</td>
                <td>${escapar(hoja.repartidor || '—')}</td>
                <td>${hoja.cantidad_entregas}</td>
                <td>${moneda(hoja.monto_total)}</td>
                <td><button type="button" class="btn btn-secundario btn-chico" data-hoja="${hoja.hoja_id}">Ver recorrido</button></td>
            </tr>
        `).join('');
    }

    async function abrirDetalle(idHoja) {
        hojaActual = hojasCargadas.find((hoja) => hoja.hoja_id === idHoja);
        if (!hojaActual) return;

        tituloDetalle.textContent = `Ruta de ${hojaActual.repartidor || 'repartidor'} — ${fechaHora(hojaActual.finalizada_en)}`;
        cuerpoDetalle.innerHTML = '<tr><td colspan="7">Cargando...</td></tr>';
        resumenDetalle.innerHTML = '';
        mostrar('detalle');

        const { data, error } = await supabaseCliente.rpc('obtener_detalle_hoja_ruta', { p_hoja_id: idHoja });

        if (error) {
            cuerpoDetalle.innerHTML = '<tr><td colspan="7">No pudimos cargar el recorrido.</td></tr>';
            return;
        }

        detalleCargado = data || [];

        resumenDetalle.innerHTML = `
            <div class="tarjeta-resumen-cobro"><span>Entregas realizadas</span><strong>${hojaActual.cantidad_entregas}</strong></div>
            <div class="tarjeta-resumen-cobro"><span>Monto entregado</span><strong>${moneda(hojaActual.monto_total)}</strong></div>
        `;

        cuerpoDetalle.innerHTML = detalleCargado.map((fila, indice) => `
            <tr>
                <td>${indice + 1}</td>
                <td>${hora(fila.entregada_en)}</td>
                <td>${escapar(fila.cliente || '—')}</td>
                <td>${escapar(fila.direccion || '—')}</td>
                <td>${escapar(fila.productos || '—')}</td>
                <td>${moneda(fila.total)}</td>
                <td>${escapar(fila.metodo_pago || '—')}</td>
            </tr>
        `).join('');
    }

    cuerpoLista.addEventListener('click', (evento) => {
        const boton = evento.target.closest('[data-hoja]');
        if (boton) abrirDetalle(boton.dataset.hoja);
    });

    document.getElementById('btn-volver-rutas').addEventListener('click', cargarLista);
    document.getElementById('btn-filtrar-rutas').addEventListener('click', cargarLista);

    botonExportar.addEventListener('click', () => {
        if (!hojaActual || detalleCargado.length === 0) {
            alert('No hay entregas para exportar.');
            return;
        }

        const filas = detalleCargado.map((fila, indice) => ({
            'Parada': indice + 1,
            'Hora de entrega': hora(fila.entregada_en),
            'Cliente': fila.cliente,
            'Dirección': fila.direccion,
            'Productos': fila.productos,
            'Total': Number(fila.total),
            'Método de pago': fila.metodo_pago,
            'Observaciones': fila.observaciones || ''
        }));

        const hoja = XLSX.utils.json_to_sheet(filas);
        const libro = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, hoja, 'Hoja de ruta');
        XLSX.writeFile(
            libro,
            `hoja-de-ruta-${hojaActual.repartidor || 'repartidor'}-${fechaISOLocal(new Date(hojaActual.finalizada_en))}.xlsx`
        );
    });

    window.cargarHojasRuta = cargarLista;
})();