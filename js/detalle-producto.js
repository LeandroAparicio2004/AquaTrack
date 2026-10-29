let mapaDetalle = null;

function cargarLeaflet() {
    if (window.L) {
        return Promise.resolve();
    }

    return new Promise((resolver, rechazar) => {
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(css);

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = resolver;
        script.onerror = rechazar;
        document.head.appendChild(script);
    });
}

function obtenerModalDetalle() {
    let modal = document.getElementById('modal-detalle-producto');

    if (modal) {
        return modal;
    }

    modal = document.createElement('div');
    modal.id = 'modal-detalle-producto';
    modal.className = 'modal-fondo oculto';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = '<div class="modal-detalle" id="contenido-detalle"></div>';
    document.body.appendChild(modal);

    modal.addEventListener('click', (evento) => {
        if (evento.target === modal || evento.target.closest('[data-cerrar-detalle]')) {
            cerrarDetalleProducto();
        }

        const verDistribuidora = evento.target.closest('[data-ver-distribuidora]');

        if (verDistribuidora && verDistribuidora.dataset.verDistribuidora) {
            const idDistribuidora = verDistribuidora.dataset.verDistribuidora;
            cerrarDetalleProducto();

            if (typeof filtrarPorDistribuidora === 'function') {
                filtrarPorDistribuidora(idDistribuidora, verDistribuidora.dataset.nombre);
            } else {
                window.location.href = `productos.html?distribuidora=${encodeURIComponent(idDistribuidora)}`;
            }
            return;
        }

        const agregar = evento.target.closest('[data-agregar-detalle]');

        if (agregar) {
            agregarProducto(agregar.dataset.agregarDetalle);
            cerrarDetalleProducto();
        }
    });

    document.addEventListener('keydown', (evento) => {
        if (evento.key === 'Escape') {
            cerrarDetalleProducto();
        }
    });

    return modal;
}

function cerrarDetalleProducto() {
    const modal = document.getElementById('modal-detalle-producto');

    if (!modal || modal.classList.contains('oculto')) {
        return;
    }

    modal.classList.add('oculto');
    document.body.classList.remove('sin-desplazamiento');

    if (mapaDetalle) {
        mapaDetalle.remove();
        mapaDetalle = null;
    }
}

async function abrirDetalleProducto(producto) {
    const distribuidora = obtenerDistribuidora(producto);
    const modal = obtenerModalDetalle();
    const direccion = [
        [distribuidora.calle, distribuidora.numero].filter(Boolean).join(' '),
        distribuidora.ciudad,
        distribuidora.provincia
    ].filter(Boolean).join(', ');
    const latitud = Number(distribuidora.latitud);
    const longitud = Number(distribuidora.longitud);
    const tieneMapa = distribuidora.latitud != null && distribuidora.longitud != null &&
        Number.isFinite(latitud) && Number.isFinite(longitud);
    const sinStock = producto.stock === 0;

    document.getElementById('contenido-detalle').innerHTML = `
      <button type="button" class="boton-cerrar-modal" data-cerrar-detalle aria-label="Cerrar ventana">×</button>

      ${producto.foto_url
            ? `<img class="detalle-foto" src="${escaparHtml(producto.foto_url)}" alt="${escaparHtml(producto.nombre)}">`
            : ''}

      <p class="nombre-distribuidora"><button type="button" class="enlace-distribuidora" data-ver-distribuidora="${escaparHtml(distribuidora.id || '')}" data-nombre="${escaparHtml(distribuidora.nombre || '')}">${escaparHtml(distribuidora.nombre || 'Distribuidora local')}</button></p>
      <h2>${escaparHtml(producto.nombre)}</h2>
      <p class="detalle-descripcion">${escaparHtml(producto.descripcion || 'Agua mineral a domicilio.')}</p>

      ${producto.es_combo && producto.incluye_combo
            ? `<p class="incluye-combo-producto"><strong>Incluye:</strong> ${escaparHtml(producto.incluye_combo)}</p>`
            : ''}

      <div class="detalle-datos">
        <span class="capacidad-producto">${producto.es_combo ? 'Combo' : `${escaparHtml(producto.capacidad_litros)} litros`}</span>
        <div class="precios-producto">
          <strong class="precio-producto">${formatearPrecio(producto.precio)}</strong>
          ${Number(producto.descuento_por_envase) > 0
            ? `<span class="precio-con-envase">Con envase: ${formatearPrecio(producto.precio - producto.descuento_por_envase)}</span>`
            : ''}
        </div>
      </div>

      <h3 class="detalle-subtitulo">Dónde queda</h3>
      <p class="detalle-direccion">${escaparHtml(direccion || 'La distribuidora todavía no cargó su dirección.')}</p>
      ${tieneMapa ? '<div id="mapa-detalle" class="mapa-detalle"></div>' : ''}
      ${tieneMapa
            ? `<a class="enlace-como-llegar" target="_blank" rel="noopener"
                href="https://www.google.com/maps/dir/?api=1&destination=${latitud},${longitud}">Cómo llegar ↗</a>`
            : ''}

      <button type="button" class="btn btn-principal btn-agregar" data-agregar-detalle="${escaparHtml(producto.id)}" ${sinStock ? 'disabled' : ''}>
        ${sinStock ? 'Sin stock' : 'Agregar al pedido'}
      </button>
    `;

    modal.classList.remove('oculto');
    document.body.classList.add('sin-desplazamiento');

    if (!tieneMapa) {
        return;
    }

    try {
        await cargarLeaflet();
    } catch (error) {
        document.getElementById('mapa-detalle').remove();
        return;
    }

    if (modal.classList.contains('oculto')) {
        return;
    }

    mapaDetalle = L.map('mapa-detalle').setView([latitud, longitud], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
    }).addTo(mapaDetalle);

    L.marker([latitud, longitud]).addTo(mapaDetalle)
        .bindPopup(escaparHtml(distribuidora.nombre || 'Distribuidora'))
        .openPopup();
}

function activarDetalleProductos(contenedor, obtenerProductos) {
    contenedor.addEventListener('click', (evento) => {
        if (!evento.target.closest('.imagen-producto, .icono-producto, .tarjeta-producto h3')) {
            return;
        }

        const id = evento.target.closest('.tarjeta-producto')?.dataset.id;
        const producto = obtenerProductos().find((p) => String(p.id) === id);

        if (producto) {
            abrirDetalleProducto(producto);
        }
    });
}