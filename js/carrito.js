const DESCUENTO_POR_ENVASE = 300;

let carritoActual = [];
let distribuidoraCarrito = null;

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
    }).format(Number(precio));
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
        fill="currentColor" />
    </svg>
  `;
}

function calcularSubtotal() {
    return carritoActual.reduce((total, item) => total + item.precio * item.cantidad, 0);
}

function renderizarItems() {
    const lista = document.getElementById('lista-items-carrito');
    lista.innerHTML = '';

    carritoActual.forEach((item) => {
        const div = document.createElement('div');
        div.className = 'item-carrito';
        div.innerHTML = `
            <div class="item-carrito-foto">${iconoGota()}</div>
            <div class="item-carrito-info">
                <h3>${escaparHtml(item.nombre)}</h3>
                <p>${escaparHtml(item.capacidad_litros)} litros — ${formatearPrecio(item.precio)} c/u</p>
            </div>
            <div class="item-carrito-cantidad">
                <button type="button" data-restar="${item.id}" aria-label="Restar">−</button>
                <span>${item.cantidad}</span>
                <button type="button" data-sumar="${item.id}" aria-label="Sumar">+</button>
            </div>
            <div class="item-carrito-subtotal">${formatearPrecio(item.precio * item.cantidad)}</div>
            <button type="button" class="item-carrito-quitar" data-quitar="${item.id}">Quitar</button>
        `;
        lista.appendChild(div);
    });
}

function actualizarResumen() {
    const subtotal = calcularSubtotal();
    const envases = Math.max(0, Number(document.getElementById('envases-devueltos').value) || 0);
    const descuento = Math.min(subtotal, envases * DESCUENTO_POR_ENVASE);
    const total = subtotal - descuento;

    document.getElementById('resumen-subtotal').textContent = formatearPrecio(subtotal);
    document.getElementById('resumen-descuento').textContent = `-${formatearPrecio(descuento)}`;
    document.getElementById('resumen-total').textContent = formatearPrecio(total);

    return { subtotal, descuento, total, envases };
}

function mostrarEstadoVacio() {
    document.getElementById('estado-carrito-vacio').classList.remove('oculto');
    document.getElementById('formulario-checkout').classList.add('oculto');
    document.getElementById('nombre-distribuidora-carrito').textContent = 'Tu pedido';
}

function actualizarVisibilidadTransferencia() {
    const seleccionado = document.querySelector('input[name="metodo-pago"]:checked');
    const datosTransferencia = document.getElementById('datos-transferencia');

    if (datosTransferencia) {
        datosTransferencia.classList.toggle('oculto', seleccionado?.value !== 'transferencia');
    }
}

function renderizarOpcionesPago() {
    const contenedor = document.getElementById('opciones-pago');
    let html = '';

    if (distribuidoraCarrito.acepta_efectivo) {
        html += `
            <label class="opcion-pago">
                <input type="radio" name="metodo-pago" value="efectivo" checked>
                Efectivo al recibir el pedido
            </label>
        `;
    }

    if (distribuidoraCarrito.acepta_transferencia) {
        html += `
            <label class="opcion-pago">
                <input type="radio" name="metodo-pago" value="transferencia"
                    ${!distribuidoraCarrito.acepta_efectivo ? 'checked' : ''}>
                Transferencia
            </label>
            <div class="datos-transferencia oculto" id="datos-transferencia">
                Alias/CBU: <strong>${escaparHtml(distribuidoraCarrito.alias_cbu || 'No informado')}</strong><br>
                Titular: <strong>${escaparHtml(distribuidoraCarrito.titular_cuenta || 'No informado')}</strong>
            </div>
        `;
    }

    contenedor.innerHTML = html || '<p class="texto-ayuda-carrito">Esta distribuidora todavía no configuró ningún método de pago.</p>';

    contenedor.querySelectorAll('input[name="metodo-pago"]').forEach((radio) => {
        radio.addEventListener('change', actualizarVisibilidadTransferencia);
    });

    actualizarVisibilidadTransferencia();
}

document.getElementById('lista-items-carrito').addEventListener('click', (evento) => {
    const sumar = evento.target.closest('[data-sumar]');
    const restar = evento.target.closest('[data-restar]');
    const quitar = evento.target.closest('[data-quitar]');

    if (sumar) {
        const item = carritoActual.find((elemento) => elemento.id === sumar.dataset.sumar);
        if (item) item.cantidad += 1;
    }

    if (restar) {
        const item = carritoActual.find((elemento) => elemento.id === restar.dataset.restar);
        if (item) {
            item.cantidad -= 1;
            if (item.cantidad <= 0) {
                carritoActual = carritoActual.filter((elemento) => elemento.id !== restar.dataset.restar);
            }
        }
    }

    if (quitar) {
        carritoActual = carritoActual.filter((elemento) => elemento.id !== quitar.dataset.quitar);
    }

    guardarCarrito(carritoActual);

    if (carritoActual.length === 0) {
        mostrarEstadoVacio();
        return;
    }

    renderizarItems();
    actualizarResumen();
});

document.getElementById('envases-devueltos').addEventListener('input', actualizarResumen);

document.getElementById('formulario-checkout').addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const mensaje = document.getElementById('mensaje-checkout');
    const btnConfirmar = document.getElementById('btn-confirmar-pedido');
    const metodoPago = document.querySelector('input[name="metodo-pago"]:checked')?.value;

    if (!metodoPago) {
        mensaje.textContent = 'Elegí un método de pago.';
        mensaje.className = 'mensaje-estado error';
        return;
    }

    const { subtotal, descuento, total, envases } = actualizarResumen();
    const { data: { session } } = await supabaseCliente.auth.getSession();

    btnConfirmar.disabled = true;
    btnConfirmar.textContent = 'Confirmando...';

    try {
        const { data: pedido, error: errorPedido } = await supabaseCliente
            .from('pedidos')
            .insert({
                cliente_id: session.user.id,
                distribuidora_id: distribuidoraCarrito.id,
                direccion_calle: document.getElementById('calle-entrega').value.trim(),
                direccion_numero: document.getElementById('numero-entrega').value.trim(),
                direccion_ciudad: document.getElementById('ciudad-entrega').value.trim(),
                direccion_provincia: document.getElementById('provincia-entrega').value.trim(),
                direccion_referencia: document.getElementById('referencia-entrega').value.trim() || null,
                subtotal,
                descuento_envases: descuento,
                total,
                envases_devueltos: envases,
                metodo_pago: metodoPago
            })
            .select('id')
            .single();

        if (errorPedido) {
            throw new Error('No pudimos crear el pedido. Revisá los datos e intentá de nuevo.');
        }

        const detalles = carritoActual.map((item) => ({
            pedido_id: pedido.id,
            producto_id: item.id,
            cantidad: item.cantidad,
            precio_unitario: item.precio,
            subtotal: item.precio * item.cantidad
        }));

        const { error: errorDetalles } = await supabaseCliente
            .from('detalles_pedidos')
            .insert(detalles);

        if (errorDetalles) {
            throw new Error('El pedido se creó pero hubo un problema guardando los productos. Contactá a soporte.');
        }

        localStorage.removeItem('aquatrack_carrito');
        window.location.href = 'productos.html?pedido=confirmado';
    } catch (error) {
        mensaje.textContent = error.message;
        mensaje.className = 'mensaje-estado error';
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = 'Confirmar pedido';
    }
});

async function verificarSesion() {
    const { data: { session } } = await supabaseCliente.auth.getSession();

    document.getElementById('nav-invitado').classList.toggle('oculto', Boolean(session));
    document.getElementById('nav-usuario').classList.toggle('oculto', !session);
}

document.getElementById('boton-cerrar-sesion').addEventListener('click', async () => {
    await supabaseCliente.auth.signOut();
    window.location.href = 'login.html';
});

async function inicializarCarrito() {
    const { data: { session } } = await supabaseCliente.auth.getSession();

    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    carritoActual = obtenerCarrito();

    if (carritoActual.length === 0) {
        mostrarEstadoVacio();
        return;
    }

    const distribuidoraId = carritoActual[0].distribuidora_id;

    const { data: distribuidora, error } = await supabaseCliente
        .from('distribuidoras')
        .select('id, nombre, acepta_efectivo, acepta_transferencia, alias_cbu, titular_cuenta')
        .eq('id', distribuidoraId)
        .single();

    if (error || !distribuidora) {
        mostrarEstadoVacio();
        return;
    }

    distribuidoraCarrito = distribuidora;

    document.getElementById('nombre-distribuidora-carrito').textContent = `Pedido a ${distribuidora.nombre}`;
    document.getElementById('estado-carrito-vacio').classList.add('oculto');
    document.getElementById('formulario-checkout').classList.remove('oculto');

    renderizarItems();
    renderizarOpcionesPago();
    actualizarResumen();
}

inicializarCarrito();
verificarSesion();