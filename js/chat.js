let usuarioActualId = null;
let rolActual = null;
let conversacionesCache = [];
let conversacionActualId = null;
let canalMensajes = null;
let canalConversaciones = null;
let opcionesContactosCache = [];

function escaparHtml(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, (caracter) => {
        const caracteresEspeciales = {
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
        };
        return caracteresEspeciales[caracter];
    });
}

function formatearHora(valor) {
    if (!valor) {
        return '';
    }
    return new Date(valor).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function formatearFechaCorta(valor) {
    if (!valor) {
        return '';
    }
    const fecha = new Date(valor);
    const hoy = new Date();
    const esHoy = fecha.toDateString() === hoy.toDateString();
    return esHoy ? formatearHora(valor) : fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

// ---------- Conversaciones ----------

let nombresNegocio = new Map();

async function cargarNombresNegocio() {
    const ids = [...new Set(
        conversacionesCache.flatMap((c) => [c.usuario_a_id, c.usuario_b_id]).filter(Boolean)
    )];

    if (ids.length === 0) return;

    const { data } = await supabaseCliente.rpc('nombres_negocio_para_chat', { ids });
    nombresNegocio = new Map((data || []).map((fila) => [fila.usuario_id, fila.distribuidora_nombre]));
}

async function cargarConversaciones() {
    const estadoVacio = document.getElementById('estado-conversaciones');

    const { data, error } = await supabaseCliente
        .from('conversaciones')
        .select(`
            id, entrega_id, pedido_id, usuario_a_id, usuario_b_id, es_ticket_admin, cerrado_en, creado_en,
            usuario_a:usuarios!conversaciones_usuario_a_id_fkey ( nombre, apellido ),
            usuario_b:usuarios!conversaciones_usuario_b_id_fkey ( nombre, apellido )
        `)
        .order('creado_en', { ascending: false });

    if (error) {
        estadoVacio.textContent = 'No pudimos cargar tus conversaciones.';
        estadoVacio.classList.remove('oculto');
        return;
    }

    conversacionesCache = data || [];
    await cargarNombresNegocio();
    await cargarUltimosMensajesYNoLeidos();
    renderizarListaConversaciones();
}

async function cargarUltimosMensajesYNoLeidos() {
    const ids = conversacionesCache.map((conversacion) => conversacion.id);

    if (ids.length === 0) {
        return;
    }

    const { data: mensajes } = await supabaseCliente
        .from('mensajes')
        .select('conversacion_id, contenido, enviado_en, remitente_id, leido')
        .in('conversacion_id', ids)
        .order('enviado_en', { ascending: true });

    const mapaUltimo = new Map();
    const mapaNoLeidos = new Map();

    (mensajes || []).forEach((mensaje) => {
        mapaUltimo.set(mensaje.conversacion_id, mensaje);

        if (!mensaje.leido && mensaje.remitente_id !== usuarioActualId) {
            mapaNoLeidos.set(mensaje.conversacion_id, (mapaNoLeidos.get(mensaje.conversacion_id) || 0) + 1);
        }
    });

    conversacionesCache.forEach((conversacion) => {
        conversacion.ultimoMensaje = mapaUltimo.get(conversacion.id) || null;
        conversacion.noLeidos = mapaNoLeidos.get(conversacion.id) || 0;
    });
}

function obtenerOtroParticipante(conversacion) {
    if (conversacion.es_ticket_admin) {
        if (conversacion.usuario_a_id === usuarioActualId) {
            return { nombre: 'Soporte AquaTrack', esTicket: true, sinAsignar: !conversacion.usuario_b_id };
        }

        const solicitante = conversacion.usuario_a;
        return {
            nombre: `${solicitante?.nombre || ''} ${solicitante?.apellido || ''}`.trim() || 'Usuario',
            esTicket: true,
            sinAsignar: !conversacion.usuario_b_id
        };
    }

    const soyA = conversacion.usuario_a_id === usuarioActualId;
    const otro = soyA ? conversacion.usuario_b : conversacion.usuario_a;
    const otroId = soyA ? conversacion.usuario_b_id : conversacion.usuario_a_id;

    return {
        nombre: nombresNegocio.get(otroId) || `${otro?.nombre || ''} ${otro?.apellido || ''}`.trim() || 'Usuario',
        esTicket: false,
        sinAsignar: false
    };
}

function renderizarListaConversaciones() {
    const lista = document.getElementById('lista-conversaciones');
    const estadoVacio = document.getElementById('estado-conversaciones');

    if (conversacionesCache.length === 0) {
        lista.innerHTML = '';
        estadoVacio.textContent = 'Todavía no tenés conversaciones. Iniciá una nueva.';
        estadoVacio.classList.remove('oculto');
        return;
    }

    estadoVacio.classList.add('oculto');

    lista.innerHTML = conversacionesCache.map((conversacion) => {
        const otro = obtenerOtroParticipante(conversacion);
        const ultimoTexto = conversacion.ultimoMensaje?.contenido || 'Sin mensajes todavía';
        const hora = formatearFechaCorta(conversacion.ultimoMensaje?.enviado_en || conversacion.creado_en);

        return `
            <button type="button" class="item-conversacion ${conversacion.id === conversacionActualId ? 'activa' : ''}" data-conversacion="${conversacion.id}">
                <div class="item-conversacion-avatar">${escaparHtml((otro.nombre || '?').charAt(0).toUpperCase())}</div>
                <div class="item-conversacion-info">
                    <div class="item-conversacion-superior">
                        <strong>${escaparHtml(otro.nombre)}</strong>
                        <span class="item-conversacion-hora">${hora}</span>
                    </div>
                    <div class="item-conversacion-inferior">
                        <span class="item-conversacion-ultimo">${escaparHtml(ultimoTexto)}</span>
                        ${conversacion.noLeidos > 0 ? `<span class="badge-no-leidos">${conversacion.noLeidos}</span>` : ''}
                    </div>
                    ${otro.esTicket && otro.sinAsignar ? '<span class="etiqueta-ticket-sin-asignar">Sin asignar</span>' : ''}
                </div>
            </button>
        `;
    }).join('');
}

document.getElementById('lista-conversaciones').addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-conversacion]');
    if (!boton) {
        return;
    }
    abrirConversacion(boton.dataset.conversacion);
});

async function abrirConversacion(idConversacion) {
    conversacionActualId = idConversacion;
    renderizarListaConversaciones();

    const conversacion = conversacionesCache.find((item) => item.id === idConversacion);
    if (!conversacion) {
        return;
    }

    const otro = obtenerOtroParticipante(conversacion);

    document.getElementById('chat-vacio').classList.add('oculto');
    document.getElementById('chat-activo').classList.remove('oculto');
    document.getElementById('chat-nombre-contacto').textContent = otro.nombre;

    const botonTomar = document.getElementById('btn-tomar-ticket');
    const puedoTomar = conversacion.es_ticket_admin && !conversacion.usuario_b_id && rolActual === 'admin';
    botonTomar.classList.toggle('oculto', !puedoTomar);
    botonTomar.dataset.conversacion = idConversacion;

    await cargarMensajes(idConversacion);
    await marcarComoLeidos(idConversacion);
    suscribirseAMensajes(idConversacion);
}

async function cargarMensajes(idConversacion) {
    const contenedor = document.getElementById('lista-mensajes');
    contenedor.innerHTML = '<p class="estado-chat">Cargando mensajes...</p>';

    const { data, error } = await supabaseCliente
        .from('mensajes')
        .select('id, remitente_id, contenido, enviado_en, leido')
        .eq('conversacion_id', idConversacion)
        .order('enviado_en', { ascending: true });

    if (error) {
        contenedor.innerHTML = '<p class="estado-chat">No pudimos cargar los mensajes.</p>';
        return;
    }

    renderizarMensajes(data || []);
}

function renderizarMensajes(mensajes) {
    const contenedor = document.getElementById('lista-mensajes');

    if (mensajes.length === 0) {
        contenedor.innerHTML = '<p class="estado-chat">Todavía no hay mensajes. ¡Escribe el primero!</p>';
        return;
    }

    contenedor.innerHTML = mensajes.map((mensaje) => `
        <div class="burbuja-mensaje ${mensaje.remitente_id === usuarioActualId ? 'mio' : 'ajeno'}">
            <p>${escaparHtml(mensaje.contenido)}</p>
            <span class="burbuja-mensaje-hora">${formatearHora(mensaje.enviado_en)}</span>
        </div>
    `).join('');

    contenedor.scrollTop = contenedor.scrollHeight;
}

function agregarMensajeAlDom(mensaje, estado) {
    if (mensaje.conversacion_id !== conversacionActualId) {
        return;
    }

    const contenedor = document.getElementById('lista-mensajes');
    const vacio = contenedor.querySelector('.estado-chat');
    if (vacio) {
        contenedor.innerHTML = '';
    }

    const esMio = mensaje.remitente_id === usuarioActualId;
    const estadoIcono = estado === 'enviando' ? '🕒' : (esMio ? '✓' : '');
    const existente = contenedor.querySelector(`[data-mensaje-id="${mensaje.id}"]`);

    if (existente) {
        existente.classList.remove('pendiente', 'error');
        const spanEstado = existente.querySelector('.burbuja-mensaje-estado');
        if (spanEstado) {
            spanEstado.textContent = estadoIcono;
        }
        return;
    }

    const burbuja = document.createElement('div');
    burbuja.className = `burbuja-mensaje ${esMio ? 'mio' : 'ajeno'} ${estado === 'enviando' ? 'pendiente' : ''}`;
    burbuja.dataset.mensajeId = mensaje.id;
    burbuja.innerHTML = `
        <p>${escaparHtml(mensaje.contenido)}</p>
        <span class="burbuja-mensaje-hora">
            ${formatearHora(mensaje.enviado_en)}
            ${esMio ? `<span class="burbuja-mensaje-estado">${estadoIcono}</span>` : ''}
        </span>
    `;
    contenedor.appendChild(burbuja);
    contenedor.scrollTop = contenedor.scrollHeight;
}

function marcarMensajeComoError(idTemporal) {
    const burbuja = document.querySelector(`[data-mensaje-id="${idTemporal}"]`);
    if (!burbuja) {
        return;
    }

    burbuja.classList.remove('pendiente');
    burbuja.classList.add('error');

    const spanEstado = burbuja.querySelector('.burbuja-mensaje-estado');
    if (spanEstado) {
        spanEstado.textContent = '⚠️';
    }
}

async function marcarComoLeidos(idConversacion) {
    await supabaseCliente
        .from('mensajes')
        .update({ leido: true })
        .eq('conversacion_id', idConversacion)
        .eq('leido', false)
        .neq('remitente_id', usuarioActualId);

    const conversacion = conversacionesCache.find((item) => item.id === idConversacion);
    if (conversacion) {
        conversacion.noLeidos = 0;
        renderizarListaConversaciones();
        actualizarBadgeGlobal();
    }
}

function suscribirseAMensajes(idConversacion) {
    if (canalMensajes) {
        supabaseCliente.removeChannel(canalMensajes);
    }

    canalMensajes = supabaseCliente
        .channel(`mensajes-${idConversacion}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'mensajes',
            filter: `conversacion_id=eq.${idConversacion}`
        }, (payload) => {
            const mensaje = payload.new;
            agregarMensajeAlDom(mensaje, 'confirmado');

            if (mensaje.remitente_id !== usuarioActualId) {
                marcarComoLeidos(idConversacion);
            }

            const conversacion = conversacionesCache.find((item) => item.id === idConversacion);
            if (conversacion) {
                conversacion.ultimoMensaje = mensaje;
                renderizarListaConversaciones();
            }
        })
        .subscribe();
}

function suscribirseAConversacionesGlobal() {
    canalConversaciones = supabaseCliente
        .channel('mensajes-global')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'mensajes'
        }, (payload) => {
            const mensaje = payload.new;
            if (mensaje.conversacion_id === conversacionActualId) {
                return;
            }

            const conversacion = conversacionesCache.find((item) => item.id === mensaje.conversacion_id);
            if (!conversacion) {
                return;
            }

            conversacion.ultimoMensaje = mensaje;
            if (mensaje.remitente_id !== usuarioActualId) {
                conversacion.noLeidos = (conversacion.noLeidos || 0) + 1;
            }

            renderizarListaConversaciones();
            actualizarBadgeGlobal();
        })
        .subscribe();
}

function actualizarBadgeGlobal() {
    const total = conversacionesCache.reduce((suma, conversacion) => suma + (conversacion.noLeidos || 0), 0);
    document.title = total > 0 ? `(${total}) Mensajes — AquaTrack` : 'Mensajes — AquaTrack';
}

// ---------- Enviar mensaje ----------

document.getElementById('formulario-mensaje').addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const input = document.getElementById('input-mensaje');
    const contenido = input.value.trim();

    if (!contenido || !conversacionActualId) {
        return;
    }

    input.value = '';

    const idTemporal = crypto.randomUUID();
    const idConversacionEnvio = conversacionActualId;

    agregarMensajeAlDom({
        id: idTemporal,
        conversacion_id: idConversacionEnvio,
        remitente_id: usuarioActualId,
        contenido,
        enviado_en: new Date().toISOString()
    }, 'enviando');

    const { error } = await supabaseCliente
        .from('mensajes')
        .insert({
            id: idTemporal,
            conversacion_id: idConversacionEnvio,
            remitente_id: usuarioActualId,
            contenido
        });

    if (error) {
        marcarMensajeComoError(idTemporal);
    }
});

// ---------- Tomar ticket (admin) ----------

document.getElementById('btn-tomar-ticket').addEventListener('click', async (evento) => {
    const idConversacion = evento.currentTarget.dataset.conversacion;

    const { error } = await supabaseCliente
        .from('conversaciones')
        .update({ usuario_b_id: usuarioActualId })
        .eq('id', idConversacion);

    if (error) {
        alert('No pudimos tomar este ticket. Puede que otro admin ya lo haya tomado.');
        return;
    }

    evento.currentTarget.classList.add('oculto');
    await cargarConversaciones();
});

// ---------- Nueva conversacion ----------

document.getElementById('btn-nueva-conversacion').addEventListener('click', abrirModalNuevaConversacion);
document.getElementById('boton-cerrar-modal-nueva-conversacion').addEventListener('click', cerrarModalNuevaConversacion);

function cerrarModalNuevaConversacion() {
    document.getElementById('modal-nueva-conversacion').classList.add('oculto');
}

async function abrirModalNuevaConversacion() {
    const contenedorSoporte = document.getElementById('contenedor-soporte-nueva-conversacion');
    const contenido = document.getElementById('contenido-modal-nueva-conversacion');
    const buscador = document.getElementById('buscador-contactos');

    buscador.value = '';
    contenedorSoporte.innerHTML = '';
    contenido.innerHTML = '<p class="estado-chat">Cargando contactos...</p>';
    document.getElementById('modal-nueva-conversacion').classList.remove('oculto');

    if (rolActual !== 'admin') {
        contenedorSoporte.innerHTML = `
            <button type="button" class="opcion-nueva-conversacion opcion-soporte" data-soporte="1">
                💬 Hablar con soporte
            </button>
        `;
    }

    const { data, error } = await supabaseCliente.rpc('obtener_contactos_disponibles_chat');

    opcionesContactosCache = error ? [] : (data || []).map((contacto) => ({
        usuario_id: contacto.usuario_id,
        etiqueta: contacto.distribuidora_nombre
            ? `${contacto.distribuidora_nombre} (${contacto.nombre || ''} ${contacto.apellido || ''})`.trim()
            : `${contacto.nombre || ''} ${contacto.apellido || ''}`.trim() || 'Usuario'
    }));

    renderizarOpcionesContactos(opcionesContactosCache);
}

function renderizarOpcionesContactos(opciones) {
    const contenido = document.getElementById('contenido-modal-nueva-conversacion');

    if (opciones.length === 0) {
        contenido.innerHTML = '<p class="estado-chat">No encontramos contactos.</p>';
        return;
    }

    contenido.innerHTML = opciones.map((opcion) => `
        <button type="button" class="opcion-nueva-conversacion" data-usuario="${opcion.usuario_id}">
            <span class="opcion-nueva-conversacion-avatar">${escaparHtml(opcion.etiqueta.charAt(0).toUpperCase())}</span>
            <span>${escaparHtml(opcion.etiqueta)}</span>
        </button>
    `).join('');
}

document.getElementById('buscador-contactos').addEventListener('input', (evento) => {
    const texto = evento.target.value.trim().toLowerCase();
    const filtradas = texto
        ? opcionesContactosCache.filter((opcion) => opcion.etiqueta.toLowerCase().includes(texto))
        : opcionesContactosCache;
    renderizarOpcionesContactos(filtradas);
});

document.querySelector('.modal-nueva-conversacion').addEventListener('click', async (evento) => {
    const botonSoporte = evento.target.closest('[data-soporte]');
    const botonContacto = evento.target.closest('[data-usuario]');

    if (botonSoporte) {
        const idConversacion = await crearTicketSoporte();
        cerrarModalNuevaConversacion();
        await cargarConversaciones();
        if (idConversacion) {
            abrirConversacion(idConversacion);
        }
        return;
    }

    if (botonContacto) {
        const idConversacion = await buscarOCrearConversacion(botonContacto.dataset.usuario);
        cerrarModalNuevaConversacion();
        await cargarConversaciones();
        if (idConversacion) {
            abrirConversacion(idConversacion);
        }
    }
});

async function buscarOCrearConversacion(idOtroUsuario) {
    const { data: existente } = await supabaseCliente
        .from('conversaciones')
        .select('id')
        .eq('es_ticket_admin', false)
        .or(`and(usuario_a_id.eq.${usuarioActualId},usuario_b_id.eq.${idOtroUsuario}),and(usuario_a_id.eq.${idOtroUsuario},usuario_b_id.eq.${usuarioActualId})`)
        .maybeSingle();

    if (existente) {
        return existente.id;
    }

    const { data: nueva, error } = await supabaseCliente
        .from('conversaciones')
        .insert({ usuario_a_id: usuarioActualId, usuario_b_id: idOtroUsuario })
        .select('id')
        .single();

    if (error) {
        alert('No pudimos iniciar la conversación. Prueba de nuevo.');
        return null;
    }

    return nueva.id;
}

async function crearTicketSoporte() {
    const { data: existente } = await supabaseCliente
        .from('conversaciones')
        .select('id')
        .eq('usuario_a_id', usuarioActualId)
        .eq('es_ticket_admin', true)
        .is('cerrado_en', null)
        .maybeSingle();

    if (existente) {
        return existente.id;
    }

    const { data: nueva, error } = await supabaseCliente
        .from('conversaciones')
        .insert({ usuario_a_id: usuarioActualId, es_ticket_admin: true })
        .select('id')
        .single();

    if (error) {
        alert('No pudimos abrir el ticket. Prueba de nuevo.');
        return null;
    }

    return nueva.id;
}

// ---------- Inicializacion ----------

async function inicializarChat() {
    const { data: { session } } = await supabaseCliente.auth.getSession();

    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    usuarioActualId = session.user.id;

    const { data: perfil } = await supabaseCliente
        .from('usuarios')
        .select('rol')
        .eq('id', usuarioActualId)
        .single();

    rolActual = perfil?.rol || 'cliente';

    document.getElementById('btn-nueva-conversacion').classList.toggle('oculto', rolActual === 'admin');

    document.getElementById('chat-cargando').classList.add('oculto');
    document.getElementById('chat-contenedor').classList.remove('oculto');

    await cargarConversaciones();
    suscribirseAConversacionesGlobal();

    const parametros = new URLSearchParams(window.location.search);
    const usuarioDestino = parametros.get('usuario');
    if (usuarioDestino && usuarioDestino !== usuarioActualId) {
        const idConversacion = await buscarOCrearConversacion(usuarioDestino);
        if (idConversacion) {
            await cargarConversaciones();
            abrirConversacion(idConversacion);
        }
    }
}

inicializarChat();

document.getElementById('btn-atras').addEventListener('click', () => {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = 'index.html';
    }
});

document.getElementById('boton-cerrar-sesion').addEventListener('click', async () => {
    await supabaseCliente.auth.signOut();
    localStorage.removeItem('aquatrack_carrito');
    window.location.href = 'login.html';
});