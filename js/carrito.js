let carritoActual = [];
let pasoActual = 1;

let mapaDireccion = null;
let marcadorDireccion = null;
let temporizadorBusquedaDireccion = null;
let resultadosDirecciones = [];

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

function formatearPrecio(precio) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0
    }).format(Number(precio) || 0);
}

function obtenerCarrito() {
    try {
        return JSON.parse(localStorage.getItem('aquatrack_carrito')) || [];
    } catch {
        return [];
    }
}

function guardarCarrito(carrito) {
    localStorage.setItem('aquatrack_carrito', JSON.stringify(carrito));
}

function iconoGota() {
    return `
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M12 3.5C12 3.5 5.5 10.4 5.5 15.1C5.5 18.7 8.4 21.5 12 21.5C15.6 21.5 18.5 18.7 18.5 15.1C18.5 10.4 12 3.5 12 3.5Z"
                fill="currentColor">
            </path>
        </svg>
    `;
}

function obtenerTextoDireccion(resultado) {
    const propiedades = resultado.properties || {};

    const calle = [
        propiedades.street,
        propiedades.housenumber
    ].filter(Boolean).join(' ');

    const localidad =
        propiedades.city ||
        propiedades.town ||
        propiedades.village ||
        propiedades.county ||
        '';

    const provincia = propiedades.state || '';

    return [
        calle || propiedades.name,
        localidad,
        provincia
    ]
        .filter(Boolean)
        .filter((valor, indice, lista) => {
            return lista.indexOf(valor) === indice;
        })
        .join(', ');
}

function inicializarMapaDireccion() {
    const elementoMapa =
        document.getElementById('mapa-direccion');

    if (!elementoMapa || mapaDireccion || !window.L) {
        return;
    }

    mapaDireccion = L.map('mapa-direccion').setView(
        [-28.4696, -65.7795],
        11
    );

    L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap'
        }
    ).addTo(mapaDireccion);

    mapaDireccion.on('click', (evento) => {
        colocarMarcadorDireccion(
            evento.latlng.lat,
            evento.latlng.lng,
            'Ubicación seleccionada'
        );
    });
}

function colocarMarcadorDireccion(
    latitud,
    longitud,
    texto = 'Ubicación seleccionada'
) {
    if (!mapaDireccion) {
        return;
    }

    if (marcadorDireccion) {
        marcadorDireccion.setLatLng([
            latitud,
            longitud
        ]);
    } else {
        marcadorDireccion = L.marker([
            latitud,
            longitud
        ]).addTo(mapaDireccion);
    }

    marcadorDireccion
        .bindPopup(escaparHtml(texto))
        .openPopup();

    mapaDireccion.setView(
        [latitud, longitud],
        15
    );

    document.getElementById('latitud-entrega').value =
        latitud;

    document.getElementById('longitud-entrega').value =
        longitud;
}

function renderizarSugerenciasDireccion() {
    const contenedor =
        document.getElementById('sugerencias-direccion');

    if (resultadosDirecciones.length === 0) {
        contenedor.innerHTML = `
            <p class="sin-sugerencias-direccion">
                No encontramos esa ubicación.
            </p>
        `;

        contenedor.classList.remove('oculto');
        return;
    }

    contenedor.innerHTML = resultadosDirecciones
        .map((resultado, indice) => {
            const texto =
                obtenerTextoDireccion(resultado);

            return `
                <button
                    type="button"
                    class="opcion-direccion"
                    data-indice-direccion="${indice}">
                    ${escaparHtml(texto)}
                </button>
            `;
        })
        .join('');

    contenedor.classList.remove('oculto');
}

async function buscarDirecciones(texto) {
    const busqueda = texto.trim();

    if (busqueda.length < 3) {
        resultadosDirecciones = [];

        document
            .getElementById('sugerencias-direccion')
            .classList.add('oculto');

        return;
    }

    try {
        const parametros = new URLSearchParams({
            q: `${busqueda}, Catamarca, Argentina`,
            limit: '5',
            lat: '-28.4696',
            lon: '-65.7795'
        });

        const respuesta = await fetch(
            `https://photon.komoot.io/api/?${parametros}`
        );

        if (!respuesta.ok) {
            throw new Error('No se pudo buscar la dirección.');
        }

        const datos = await respuesta.json();

        resultadosDirecciones = datos.features || [];
        renderizarSugerenciasDireccion();
    } catch (error) {
        resultadosDirecciones = [];

        document
            .getElementById('sugerencias-direccion')
            .classList.add('oculto');
    }
}

function seleccionarDireccion(resultado) {
    const propiedades = resultado.properties || {};
    const coordenadas = resultado.geometry?.coordinates || [];

    const longitud = coordenadas[0];
    const latitud = coordenadas[1];

    const calle = [
        propiedades.street
    ].filter(Boolean).join(' ');

    const localidad =
        propiedades.city ||
        propiedades.town ||
        propiedades.village ||
        propiedades.county ||
        '';

    const provincia =
        propiedades.state || 'Catamarca';

    const textoCompleto =
        obtenerTextoDireccion(resultado);

    document.getElementById('buscador-direccion').value =
        textoCompleto;

    document.getElementById('calle-entrega').value =
        calle;

    document.getElementById('numero-entrega').value =
        propiedades.housenumber || '';

    document.getElementById('ciudad-entrega').value =
        localidad;

    document.getElementById('provincia-entrega').value =
        provincia;

    document
        .getElementById('sugerencias-direccion')
        .classList.add('oculto');

    document.getElementById('estado-direccion-mapa')
        .textContent =
        'Ubicación seleccionada. Revisá calle y número.';

    colocarMarcadorDireccion(
        latitud,
        longitud,
        textoCompleto
    );
}

function configurarBuscadorDireccion() {
    const buscador =
        document.getElementById('buscador-direccion');

    const sugerencias =
        document.getElementById('sugerencias-direccion');

    if (!buscador || !sugerencias) {
        return;
    }

    buscador.addEventListener('input', () => {
        clearTimeout(temporizadorBusquedaDireccion);

        document.getElementById('latitud-entrega').value = '';
        document.getElementById('longitud-entrega').value = '';

        temporizadorBusquedaDireccion = setTimeout(() => {
            buscarDirecciones(buscador.value);
        }, 500);
    });

    sugerencias.addEventListener('click', (evento) => {
        const opcion =
            evento.target.closest(
                '[data-indice-direccion]'
            );

        if (!opcion) {
            return;
        }

        const indice =
            Number(opcion.dataset.indiceDireccion);

        const resultado =
            resultadosDirecciones[indice];

        if (resultado) {
            seleccionarDireccion(resultado);
        }
    });

    document.addEventListener('click', (evento) => {
        if (
            !buscador.contains(evento.target) &&
            !sugerencias.contains(evento.target)
        ) {
            sugerencias.classList.add('oculto');
        }
    });
}

function obtenerGruposPorDistribuidora() {
    const grupos = new Map();

    carritoActual.forEach((producto) => {
        const idDistribuidora =
            producto.distribuidora_id || 'sin-distribuidora';

        if (!grupos.has(idDistribuidora)) {
            grupos.set(idDistribuidora, {
                id: idDistribuidora,
                nombre: producto.distribuidora_nombre ||
                    'Distribuidora local',
                productos: []
            });
        }

        grupos.get(idDistribuidora).productos.push(producto);
    });

    return Array.from(grupos.values());
}

function obtenerEnvasesValidos(producto) {
    const cantidadComprada = Number(producto.cantidad) || 0;
    const envasesSeleccionados =
        Number(producto.envases_devueltos) || 0;

    return Math.max(
        0,
        Math.min(envasesSeleccionados, cantidadComprada)
    );
}

function calcularResumen() {
    const grupos = obtenerGruposPorDistribuidora();

    let subtotalGeneral = 0;
    let descuentoGeneral = 0;
    let envasesGenerales = 0;

    grupos.forEach((grupo) => {
        grupo.subtotal = 0;
        grupo.descuento = 0;
        grupo.envases = 0;

        grupo.productos.forEach((producto) => {
            const cantidad = Number(producto.cantidad) || 0;
            const precio = Number(producto.precio) || 0;
            const descuentoPorEnvase =
                Number(producto.descuento_por_envase) || 0;

            const envases = obtenerEnvasesValidos(producto);

            const subtotalProducto = precio * cantidad;
            const descuentoProducto =
                descuentoPorEnvase * envases;

            producto.envases_devueltos = envases;

            grupo.subtotal += subtotalProducto;
            grupo.descuento += descuentoProducto;
            grupo.envases += envases;

            subtotalGeneral += subtotalProducto;
            descuentoGeneral += descuentoProducto;
            envasesGenerales += envases;
        });

        grupo.total = Math.max(
            0,
            grupo.subtotal - grupo.descuento
        );
    });

    return {
        grupos,
        subtotal: subtotalGeneral,
        descuento: descuentoGeneral,
        total: Math.max(
            0,
            subtotalGeneral - descuentoGeneral
        ),
        envases: envasesGenerales
    };
}

function renderizarItems() {
    const lista = document.getElementById('lista-items-carrito');
    const grupos = obtenerGruposPorDistribuidora();

    lista.innerHTML = '';

    grupos.forEach((grupo) => {
        const bloqueGrupo = document.createElement('section');

        bloqueGrupo.className = 'grupo-distribuidora';

        bloqueGrupo.innerHTML = `
            <div class="encabezado-grupo-distribuidora">
                <p class="etiqueta-grupo-distribuidora">
                    Distribuidora
                </p>

                <h2>${escaparHtml(grupo.nombre)}</h2>
            </div>
        `;

        grupo.productos.forEach((producto) => {
            const cantidad = Number(producto.cantidad) || 0;
            const precio = Number(producto.precio) || 0;

            const descuentoPorEnvase =
                Number(producto.descuento_por_envase) || 0;

            const envases = obtenerEnvasesValidos(producto);
            const subtotalProducto = precio * cantidad;

            const divProducto = document.createElement('div');

            divProducto.className = 'item-carrito';

            divProducto.innerHTML = `
                <div class="item-carrito-foto">
                    ${iconoGota()}
                </div>

                <div class="item-carrito-info">
                    <h3>${escaparHtml(producto.nombre)}</h3>

                    <p>
                        ${escaparHtml(producto.capacidad_litros)}
                        litros — ${formatearPrecio(precio)} c/u
                    </p>

                    ${descuentoPorEnvase > 0
                    ? `
                                <p class="precio-con-envase">
                                    Con envase:
                                    ${formatearPrecio(
                        precio - descuentoPorEnvase
                    )}
                                </p>

                                <p class="texto-descuento-envase">
                                    Descuento por envase:
                                    ${formatearPrecio(
                        descuentoPorEnvase
                    )}
                                </p>
                            `
                    : ''
                }
                </div>

                <div class="item-carrito-cantidad">
                    <button
                        type="button"
                        data-restar="${escaparHtml(producto.id)}"
                        aria-label="Restar una unidad">
                        −
                    </button>

                    <span>${cantidad}</span>

                    <button
                        type="button"
                        data-sumar="${escaparHtml(producto.id)}"
                        aria-label="Sumar una unidad">
                        +
                    </button>
                </div>

                <div class="item-carrito-subtotal">
                    ${formatearPrecio(subtotalProducto)}
                </div>

                <div class="control-envases-item">
                    <label for="envases-${escaparHtml(producto.id)}">
                        Envases devueltos
                    </label>

                    <input
                        type="number"
                        id="envases-${escaparHtml(producto.id)}"
                        min="0"
                        max="${cantidad}"
                        step="1"
                        value="${envases}"
                        data-envases-item="${escaparHtml(
                    producto.id
                )}"
                    >
                </div>

                <button
                    type="button"
                    class="item-carrito-quitar"
                    data-quitar="${escaparHtml(producto.id)}">
                    Quitar
                </button>
            `;

            bloqueGrupo.appendChild(divProducto);
        });

        lista.appendChild(bloqueGrupo);
    });
}

function renderizarResumenFinal(resumen) {
    const contenedor =
        document.getElementById('resumen-final-productos');

    contenedor.innerHTML = resumen.grupos.map((grupo) => `
        <div class="resumen-final-distribuidora">
            <div class="fila-resumen">
                <strong>${escaparHtml(grupo.nombre)}</strong>
                <strong>${formatearPrecio(grupo.total)}</strong>
            </div>

            ${grupo.productos.map((producto) => `
                <div class="fila-producto-final">
                    <span>
                        ${escaparHtml(producto.nombre)}
                        x${producto.cantidad}
                    </span>

                    <span>
                        ${formatearPrecio(
        Number(producto.precio) *
        Number(producto.cantidad)
    )}
                    </span>
                </div>

                ${producto.envases_devueltos > 0
            ? `
                            <p class="detalle-envase-final">
                                Envases devueltos:
                                ${producto.envases_devueltos}
                            </p>
                        `
            : ''
        }
            `).join('')}

            ${grupo.descuento > 0
            ? `
                        <p class="descuento-final">
                            Descuento:
                            -${formatearPrecio(grupo.descuento)}
                        </p>
                    `
            : ''
        }
        </div>
    `).join('');

    document.getElementById('resumen-final-subtotal')
        .textContent = formatearPrecio(resumen.subtotal);

    document.getElementById('resumen-final-descuento')
        .textContent = `-${formatearPrecio(resumen.descuento)}`;

    document.getElementById('resumen-final-total')
        .textContent = formatearPrecio(resumen.total);

    actualizarResumenDireccion();
    actualizarResumenMetodoPago();
}

function actualizarResumen() {
    const resumen = calcularResumen();

    document.getElementById('paso1-subtotal')
        .textContent = formatearPrecio(resumen.subtotal);

    document.getElementById('paso1-descuento')
        .textContent = `-${formatearPrecio(resumen.descuento)}`;

    document.getElementById('paso1-total')
        .textContent = formatearPrecio(resumen.total);

    renderizarResumenFinal(resumen);

    return resumen;
}

function actualizarResumenDireccion() {
    const calle =
        document.getElementById('calle-entrega').value.trim();

    const numero =
        document.getElementById('numero-entrega').value.trim();

    const ciudad =
        document.getElementById('ciudad-entrega').value.trim();

    const provincia =
        document.getElementById('provincia-entrega').value.trim();

    const referencia =
        document.getElementById('referencia-entrega').value.trim();

    const direccion = [
        `${calle} ${numero}`.trim(),
        ciudad,
        provincia,
        referencia ? `Referencia: ${referencia}` : ''
    ].filter(Boolean).join(', ');

    document.getElementById('resumen-final-direccion')
        .textContent = direccion || 'Sin completar';
}

function actualizarResumenMetodoPago() {
    const metodoSeleccionado =
        document.querySelector(
            'input[name="metodo-pago"]:checked'
        );

    const texto = metodoSeleccionado?.value === 'transferencia'
        ? 'Transferencia única a AquaTrack'
        : 'Efectivo al recibir el pedido';

    document.getElementById('resumen-final-metodo')
        .textContent = texto;

    const botonConfirmar =
        document.getElementById('btn-confirmar-pedido');

    botonConfirmar.textContent =
        metodoSeleccionado?.value === 'transferencia'
            ? 'Confirmar y comenzar pago'
            : 'Confirmar pedido';
}

function actualizarIndicadorPasos() {
    document
        .querySelectorAll('[data-indicador-paso]')
        .forEach((indicador) => {
            const numero = Number(
                indicador.dataset.indicadorPaso
            );

            indicador.classList.toggle(
                'paso-activo',
                numero === pasoActual
            );

            indicador.classList.toggle(
                'paso-completado',
                numero < pasoActual
            );
        });
}

function mostrarPaso(numero) {
    pasoActual = numero;

    document
        .querySelectorAll('[data-paso-vista]')
        .forEach((paso) => {
            const numeroPaso = Number(
                paso.dataset.pasoVista
            );

            paso.classList.toggle(
                'oculto',
                numeroPaso !== numero
            );
        });

    actualizarIndicadorPasos();

    if (numero === 3) {
        actualizarResumen();
    }

    if (numero === 2) {
        setTimeout(() => {
            inicializarMapaDireccion();

            if (mapaDireccion) {
                mapaDireccion.invalidateSize();
            }
        }, 150);
    }

    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

function mostrarEstadoVacio() {
    document
        .getElementById('estado-carrito-vacio')
        .classList.remove('oculto');

    document
        .getElementById('formulario-checkout')
        .classList.add('oculto');

    document
        .getElementById('nombre-distribuidora-carrito')
        .textContent = 'Tu pedido';
}

function actualizarVisibilidadTransferencia() {
    const metodoSeleccionado =
        document.querySelector(
            'input[name="metodo-pago"]:checked'
        );

    const datosTransferencia =
        document.getElementById('datos-transferencia');

    if (datosTransferencia) {
        datosTransferencia.classList.toggle(
            'oculto',
            metodoSeleccionado?.value !== 'transferencia'
        );
    }

    actualizarResumenMetodoPago();
}

function renderizarOpcionesPago() {
    const contenedor =
        document.getElementById('opciones-pago');

    contenedor.innerHTML = `
        <label class="opcion-pago">
            <input
                type="radio"
                name="metodo-pago"
                value="efectivo"
                checked
            >

            <span>
                <strong>Efectivo al recibir el pedido</strong><br>
                Le pagás al repartidor cuando recibís tu compra.
            </span>
        </label>

        <label class="opcion-pago">
            <input
                type="radio"
                name="metodo-pago"
                value="transferencia"
            >

            <span>
                <strong>Transferencia a AquaTrack</strong><br>
                Hacés una sola transferencia por el total general.
            </span>
        </label>

        <div
            class="datos-transferencia oculto"
            id="datos-transferencia">

            <strong>Cuenta central de AquaTrack</strong>

            <p>
                Los datos de alias, CBU, titular y CUIT
                se mostrarán al comenzar el pago.
            </p>
        </div>
    `;

    contenedor
        .querySelectorAll('input[name="metodo-pago"]')
        .forEach((radio) => {
            radio.addEventListener(
                'change',
                actualizarVisibilidadTransferencia
            );
        });

    actualizarVisibilidadTransferencia();
}

function mostrarMensaje(texto, tipo = '') {
    const mensaje =
        document.getElementById('mensaje-checkout');

    mensaje.textContent = texto;
    mensaje.className =
        `mensaje-estado ${tipo}`.trim();
}

function validarDatosEntrega() {
    const calle =
        document.getElementById('calle-entrega');

    const ciudad =
        document.getElementById('ciudad-entrega');

    const provincia =
        document.getElementById('provincia-entrega');

    if (!calle.value.trim()) {
        calle.reportValidity();
        return false;
    }

    if (!ciudad.value.trim()) {
        ciudad.reportValidity();
        return false;
    }

    if (!provincia.value.trim()) {
        provincia.reportValidity();
        return false;
    }

    const latitud =
        document.getElementById('latitud-entrega').value;

    const longitud =
        document.getElementById('longitud-entrega').value;

    if (!latitud || !longitud) {
        document.getElementById('estado-direccion-mapa')
            .textContent =
            'Elegí una ubicación de las sugerencias para continuar.';

        return false;
    }

    return true;
}

document
    .getElementById('lista-items-carrito')
    .addEventListener('click', (evento) => {
        const botonSumar =
            evento.target.closest('[data-sumar]');

        const botonRestar =
            evento.target.closest('[data-restar]');

        const botonQuitar =
            evento.target.closest('[data-quitar]');

        if (botonSumar) {
            const producto = carritoActual.find(
                (elemento) =>
                    String(elemento.id) ===
                    String(botonSumar.dataset.sumar)
            );

            if (producto) {
                producto.cantidad += 1;
            }
        }

        if (botonRestar) {
            const producto = carritoActual.find(
                (elemento) =>
                    String(elemento.id) ===
                    String(botonRestar.dataset.restar)
            );

            if (producto) {
                producto.cantidad -= 1;

                if (producto.cantidad <= 0) {
                    carritoActual = carritoActual.filter(
                        (elemento) =>
                            String(elemento.id) !==
                            String(botonRestar.dataset.restar)
                    );
                }
            }
        }

        if (botonQuitar) {
            carritoActual = carritoActual.filter(
                (elemento) =>
                    String(elemento.id) !==
                    String(botonQuitar.dataset.quitar)
            );
        }

        carritoActual.forEach((producto) => {
            producto.envases_devueltos =
                obtenerEnvasesValidos(producto);
        });

        guardarCarrito(carritoActual);

        if (carritoActual.length === 0) {
            mostrarEstadoVacio();
            return;
        }

        renderizarItems();
        actualizarResumen();
    });

document
    .getElementById('lista-items-carrito')
    .addEventListener('input', (evento) => {
        const campoEnvases =
            evento.target.closest('[data-envases-item]');

        if (!campoEnvases) {
            return;
        }

        const producto = carritoActual.find(
            (elemento) =>
                String(elemento.id) ===
                String(campoEnvases.dataset.envasesItem)
        );

        if (!producto) {
            return;
        }

        const cantidadMaxima =
            Number(producto.cantidad) || 0;

        const cantidadIngresada =
            Number(campoEnvases.value) || 0;

        producto.envases_devueltos = Math.max(
            0,
            Math.min(cantidadIngresada, cantidadMaxima)
        );

        campoEnvases.value =
            producto.envases_devueltos;

        guardarCarrito(carritoActual);
        actualizarResumen();
    });

document
    .getElementById('btn-continuar-datos')
    .addEventListener('click', () => {
        if (carritoActual.length === 0) {
            mostrarEstadoVacio();
            return;
        }

        mostrarPaso(2);
    });

document
    .getElementById('btn-volver-pedido')
    .addEventListener('click', () => {
        mostrarPaso(1);
    });

document
    .getElementById('btn-continuar-resumen')
    .addEventListener('click', () => {
        if (!validarDatosEntrega()) {
            return;
        }

        mostrarPaso(3);
    });

document
    .getElementById('btn-volver-datos')
    .addEventListener('click', () => {
        mostrarPaso(2);
    });

function obtenerDatosDireccion() {
    const calle =
        document.getElementById('calle-entrega')
            .value
            .trim();

    const numero =
        document.getElementById('numero-entrega')
            .value
            .trim();

    const ciudad =
        document.getElementById('ciudad-entrega')
            .value
            .trim();

    const provincia =
        document.getElementById('provincia-entrega')
            .value
            .trim();

    const referencia =
        document.getElementById('referencia-entrega')
            .value
            .trim();

    const direccionBuscada =
        document.getElementById('buscador-direccion')
            ?.value
            .trim() || '';

    const latitud =
        Number(
            document.getElementById('latitud-entrega')
                ?.value
        ) || null;

    const longitud =
        Number(
            document.getElementById('longitud-entrega')
                ?.value
        ) || null;

    const direccionFormateada = [
        `${calle} ${numero}`.trim(),
        ciudad,
        provincia
    ]
        .filter(Boolean)
        .join(', ');

    return {
        calle,
        numero,
        ciudad,
        provincia,
        referencia: referencia || null,
        latitud,
        longitud,
        direccionFormateada:
            direccionBuscada || direccionFormateada
    };
}

async function crearPedidosDesdeCarrito(
    sesion,
    resumen,
    metodoPago
) {
    const direccion = obtenerDatosDireccion();
    const pedidosCreados = [];

    for (const grupo of resumen.grupos) {
        const { data: pedido, error: errorPedido } =
            await supabaseCliente
                .from('pedidos')
                .insert({
                    cliente_id: sesion.user.id,
                    distribuidora_id: grupo.id,

                    direccion_calle: direccion.calle,
                    direccion_numero: direccion.numero,
                    direccion_ciudad: direccion.ciudad,
                    direccion_provincia: direccion.provincia,
                    direccion_referencia:
                        direccion.referencia,

                    direccion_latitud:
                        direccion.latitud,
                    direccion_longitud:
                        direccion.longitud,
                    direccion_formateada:
                        direccion.direccionFormateada,

                    subtotal: grupo.subtotal,
                    descuento_envases: grupo.descuento,
                    total: grupo.total,
                    envases_devueltos: grupo.envases,
                    metodo_pago: metodoPago
                })
                .select('id')
                .single();

        if (errorPedido || !pedido) {
            throw new Error(
                'No pudimos crear uno de los pedidos.'
            );
        }

        pedidosCreados.push(pedido.id);

        const detalles = grupo.productos.map((producto) => {
            const cantidad =
                Number(producto.cantidad) || 0;

            const precio =
                Number(producto.precio) || 0;

            return {
                pedido_id: pedido.id,
                producto_id: producto.id,
                cantidad,
                precio_unitario: precio,
                subtotal: precio * cantidad
            };
        });

        const { error: errorDetalles } =
            await supabaseCliente
                .from('detalles_pedidos')
                .insert(detalles);

        if (errorDetalles) {
            throw new Error(
                'El pedido se creó, pero no pudimos guardar sus productos.'
            );
        }
    }

    return pedidosCreados;
}

document
    .getElementById('formulario-checkout')
    .addEventListener('submit', async (evento) => {
        evento.preventDefault();

        if (!validarDatosEntrega()) {
            mostrarPaso(2);
            return;
        }

        const metodoSeleccionado =
            document.querySelector(
                'input[name="metodo-pago"]:checked'
            );

        if (!metodoSeleccionado) {
            mostrarPaso(2);

            mostrarMensaje(
                'Elegí un método de pago.',
                'error'
            );

            return;
        }

        const botonConfirmar =
            document.getElementById(
                'btn-confirmar-pedido'
            );

        const textoOriginal =
            botonConfirmar.textContent;

        botonConfirmar.disabled = true;
        botonConfirmar.textContent =
            'Creando pedido...';

        try {
            const {
                data: { session }
            } = await supabaseCliente.auth.getSession();

            if (!session) {
                window.location.href = 'login.html';
                return;
            }

            const resumen = actualizarResumen();

            await crearPedidosDesdeCarrito(
                session,
                resumen,
                metodoSeleccionado.value
            );

            localStorage.removeItem(
                'aquatrack_carrito'
            );

            window.location.href =
                'productos.html?pedido=confirmado';
        } catch (error) {
            console.error(error);

            mostrarMensaje(
                error.message ||
                'No pudimos confirmar el pedido.',
                'error'
            );

            botonConfirmar.disabled = false;
            botonConfirmar.textContent =
                textoOriginal;
        }
    });

async function verificarSesion() {
    const {
        data: { session }
    } = await supabaseCliente.auth.getSession();

    document
        .getElementById('nav-invitado')
        .classList.toggle(
            'oculto',
            Boolean(session)
        );

    document
        .getElementById('nav-usuario')
        .classList.toggle(
            'oculto',
            !session
        );
}

document
    .getElementById('boton-cerrar-sesion')
    .addEventListener('click', async () => {
        await supabaseCliente.auth.signOut();
        window.location.href = 'login.html';
    });

async function inicializarCarrito() {
    const {
        data: { session }
    } = await supabaseCliente.auth.getSession();

    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    carritoActual = obtenerCarrito();

    if (carritoActual.length === 0) {
        mostrarEstadoVacio();
        return;
    }

    carritoActual.forEach((producto) => {
        producto.cantidad =
            Number(producto.cantidad) || 0;

        producto.precio =
            Number(producto.precio) || 0;

        producto.descuento_por_envase =
            Number(producto.descuento_por_envase) || 0;

        producto.envases_devueltos =
            obtenerEnvasesValidos(producto);
    });

    guardarCarrito(carritoActual);

    document
        .getElementById('estado-carrito-vacio')
        .classList.add('oculto');

    document
        .getElementById('formulario-checkout')
        .classList.remove('oculto');

    renderizarItems();
    renderizarOpcionesPago();
    actualizarResumen();
    mostrarPaso(1);
}

configurarBuscadorDireccion();
inicializarCarrito();
verificarSesion();