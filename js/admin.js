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

const etiquetasEstado = {
    pendiente_aprobacion: { clase: 'pendiente', texto: 'Pendiente' },
    activa: { clase: 'activo', texto: 'Activa' },
    rechazada: { clase: 'rechazada', texto: 'Rechazada' },
    suspendida: { clase: 'suspendida', texto: 'Suspendida' }
};

function crearTarjetaDistribuidora(distribuidora, conAcciones) {
    const etiqueta = etiquetasEstado[distribuidora.estado] || { clase: 'inactivo', texto: distribuidora.estado };

    const direccion = [distribuidora.calle, distribuidora.numero, distribuidora.ciudad, distribuidora.provincia]
        .filter(Boolean)
        .join(', ') || 'Sin dirección cargada';

    const acciones = conAcciones
        ? `
      <div class="tarjeta-producto-panel-acciones">
        <button type="button" class="btn btn-principal btn-chico" data-aprobar="${distribuidora.id}">Aprobar</button>
        <button type="button" class="btn btn-secundario btn-peligro btn-chico" data-rechazar="${distribuidora.id}">Rechazar</button>
      </div>
    `
        : '';

    const tarjeta = document.createElement('article');
    tarjeta.className = 'tarjeta-producto-panel';

    tarjeta.innerHTML = `
    <div class="tarjeta-producto-panel-superior">
      <h3>${escaparHtml(distribuidora.nombre)}</h3>
      <span class="etiqueta-estado-producto ${etiqueta.clase}">${etiqueta.texto}</span>
    </div>
    <p class="tarjeta-producto-panel-descripcion">${escaparHtml(direccion)}</p>
    <div class="tarjeta-producto-panel-detalle">
      <span>${escaparHtml(distribuidora.telefono || 'Sin teléfono')}</span>
      <span>${escaparHtml(distribuidora.email || 'Sin email')}</span>
    </div>
    ${acciones}
  `;

    return tarjeta;
}

async function cargarPendientes() {
    const lista = document.getElementById('lista-pendientes');
    const estadoVacio = document.getElementById('estado-pendientes');

    const { data, error } = await supabaseCliente
        .from('distribuidoras')
        .select('id, nombre, telefono, email, calle, numero, ciudad, provincia, estado')
        .eq('estado', 'pendiente_aprobacion')
        .order('creado_en');

    lista.innerHTML = '';

    if (error) {
        estadoVacio.textContent = 'No pudimos cargar las solicitudes. Recargá la página.';
        estadoVacio.classList.remove('oculto');
        return;
    }

    if (!data || data.length === 0) {
        estadoVacio.textContent = 'No hay distribuidoras pendientes de aprobación por ahora.';
        estadoVacio.classList.remove('oculto');
        return;
    }

    estadoVacio.classList.add('oculto');

    data.forEach((distribuidora) => {
        lista.appendChild(crearTarjetaDistribuidora(distribuidora, true));
    });
}

async function cargarTodas() {
    const lista = document.getElementById('lista-todas');
    const estadoVacio = document.getElementById('estado-todas');

    const { data, error } = await supabaseCliente
        .from('distribuidoras')
        .select('id, nombre, telefono, email, calle, numero, ciudad, provincia, estado')
        .order('creado_en', { ascending: false });

    lista.innerHTML = '';

    if (error) {
        estadoVacio.textContent = 'No pudimos cargar las distribuidoras. Recargá la página.';
        estadoVacio.classList.remove('oculto');
        return;
    }

    if (!data || data.length === 0) {
        estadoVacio.textContent = 'Todavía no hay ninguna distribuidora registrada.';
        estadoVacio.classList.remove('oculto');
        return;
    }

    estadoVacio.classList.add('oculto');

    data.forEach((distribuidora) => {
        lista.appendChild(crearTarjetaDistribuidora(distribuidora, false));
    });
}

async function resolverSolicitud(id, nuevoEstado, boton) {
    boton.disabled = true;

    const { error } = await supabaseCliente
        .from('distribuidoras')
        .update({ estado: nuevoEstado })
        .eq('id', id);

    if (error) {
        alert('No pudimos actualizar la distribuidora. Intentá de nuevo.');
        boton.disabled = false;
        return;
    }

    await cargarPendientes();
}

document.getElementById('lista-pendientes').addEventListener('click', (evento) => {
    const botonAprobar = evento.target.closest('[data-aprobar]');
    const botonRechazar = evento.target.closest('[data-rechazar]');

    if (botonAprobar) {
        resolverSolicitud(botonAprobar.dataset.aprobar, 'activa', botonAprobar);
    }

    if (botonRechazar) {
        const confirmado = confirm('¿Seguro que querés rechazar esta distribuidora?');

        if (confirmado) {
            resolverSolicitud(botonRechazar.dataset.rechazar, 'rechazada', botonRechazar);
        }
    }
});

const pestanas = document.querySelectorAll('.panel-pestana');
const secciones = {
    pendientes: document.getElementById('seccion-pendientes'),
    todas: document.getElementById('seccion-todas')
};
let seccionTodasCargada = false;

pestanas.forEach((pestana) => {
    pestana.addEventListener('click', () => {
        pestanas.forEach((otra) => {
            otra.classList.remove('activa');
            otra.setAttribute('aria-selected', 'false');
        });

        pestana.classList.add('activa');
        pestana.setAttribute('aria-selected', 'true');

        Object.entries(secciones).forEach(([nombre, seccion]) => {
            seccion.classList.toggle('oculto', nombre !== pestana.dataset.pestana);
        });

        if (pestana.dataset.pestana === 'todas' && !seccionTodasCargada) {
            seccionTodasCargada = true;
            cargarTodas();
        }
    });
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

    if (perfil?.rol !== 'admin') {
        window.location.href = 'productos.html';
        return;
    }

    document.getElementById('panel-cargando').classList.add('oculto');
    document.getElementById('panel-header').classList.remove('oculto');
    document.getElementById('panel-main').classList.remove('oculto');

    cargarPendientes();
}

inicializarPanel();

document.getElementById('boton-cerrar-sesion').addEventListener('click', async () => {
    await supabaseCliente.auth.signOut();
    window.location.href = 'login.html';
});