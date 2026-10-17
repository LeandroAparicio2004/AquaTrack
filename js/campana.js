(function () {
    if (typeof supabaseCliente === 'undefined') return;

    const enlaceChat = document.querySelector('a[href="chat.html"].btn-icono-circular');
    if (!enlaceChat) return;

    let usuarioId = null;
    let notificaciones = [];

    const contenedor = document.createElement('div');
    contenedor.className = 'campana';
    contenedor.innerHTML = `
        <button type="button" class="btn-icono-circular campana-boton" aria-label="Notificaciones" aria-expanded="false">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span class="campana-contador" hidden></span>
        </button>
        <div class="campana-panel" role="dialog" aria-label="Notificaciones" hidden>
            <div class="campana-encabezado">
                <strong>Notificaciones</strong>
                <button type="button" class="campana-marcar-todas">Marcar todas como leídas</button>
            </div>
            <ul class="campana-lista"></ul>
        </div>
    `;
    enlaceChat.parentNode.insertBefore(contenedor, enlaceChat);

    const boton = contenedor.querySelector('.campana-boton');
    const contador = contenedor.querySelector('.campana-contador');
    const panel = contenedor.querySelector('.campana-panel');
    const lista = contenedor.querySelector('.campana-lista');
    const botonMarcarTodas = contenedor.querySelector('.campana-marcar-todas');

    function escapar(texto) {
        const div = document.createElement('div');
        div.textContent = texto || '';
        return div.innerHTML;
    }

    function tiempoRelativo(fechaIso) {
        const minutos = Math.floor((Date.now() - new Date(fechaIso).getTime()) / 60000);
        if (minutos < 1) return 'ahora';
        if (minutos < 60) return `hace ${minutos} min`;
        const horas = Math.floor(minutos / 60);
        if (horas < 24) return `hace ${horas} h`;
        const dias = Math.floor(horas / 24);
        return `hace ${dias} d`;
    }

    function renderizar() {
        const noLeidas = notificaciones.filter((item) => !item.leida).length;

        contador.hidden = noLeidas === 0;
        contador.textContent = noLeidas > 9 ? '9+' : String(noLeidas);
        boton.setAttribute('aria-label', noLeidas > 0 ? `Notificaciones, ${noLeidas} sin leer` : 'Notificaciones');
        botonMarcarTodas.hidden = noLeidas === 0;

        if (notificaciones.length === 0) {
            lista.innerHTML = '<li class="campana-vacio">No tenés notificaciones.</li>';
            return;
        }

        lista.innerHTML = notificaciones.map((item) => `
            <li>
                <button type="button" class="campana-item ${item.leida ? '' : 'no-leida'}" data-id="${item.id}">
                    <span class="campana-punto"></span>
                    <span class="campana-texto">
                        <span class="campana-titulo">${escapar(item.titulo)}</span>
                        <span class="campana-mensaje">${escapar(item.mensaje)}</span>
                        <span class="campana-tiempo">${tiempoRelativo(item.creado_en)}</span>
                    </span>
                </button>
            </li>
        `).join('');
    }

    async function cargar() {
        const { data, error } = await supabaseCliente
            .from('notificaciones')
            .select('id, tipo, titulo, mensaje, enlace, leida, creado_en')
            .eq('usuario_id', usuarioId)
            .order('creado_en', { ascending: false })
            .limit(20);

        if (error) return;

        notificaciones = data || [];
        renderizar();
    }

    function abrirPanel(abrir) {
        panel.hidden = !abrir;
        boton.setAttribute('aria-expanded', String(abrir));
    }

    boton.addEventListener('click', (evento) => {
        evento.stopPropagation();
        abrirPanel(panel.hidden);
    });

    document.addEventListener('click', (evento) => {
        if (!contenedor.contains(evento.target)) abrirPanel(false);
    });

    document.addEventListener('keydown', (evento) => {
        if (evento.key === 'Escape') abrirPanel(false);
    });

    const destinosNotificacion = {
        pago_recibido_admin: 'admin.html#pagos',
        pago_cliente_vendedor: 'panel-vendedor.html#cobros',
        liquidacion_pagada: 'panel-vendedor.html#cobros',
        ruta_finalizada: 'panel-vendedor.html#rutas',
        anuncio_por_vencer: 'panel-vendedor.html#publicidad',
        anuncio_vencido: 'panel-vendedor.html#publicidad',
        resena_vendedor: 'panel-vendedor.html#perfil',
        resena_repartidor: 'panel-repartidor.html#perfil'
    };

    lista.addEventListener('click', async (evento) => {
        const item = evento.target.closest('[data-id]');
        if (!item) return;

        const notificacion = notificaciones.find((n) => n.id === item.dataset.id);
        if (!notificacion) return;

        if (!notificacion.leida) {
            notificacion.leida = true;
            renderizar();
            await supabaseCliente
                .from('notificaciones')
                .update({ leida: true })
                .eq('id', notificacion.id);
        }

        const destino = destinosNotificacion[notificacion.tipo] || notificacion.enlace;

        if (destino) {
            window.location.href = destino;
        }
    });

    botonMarcarTodas.addEventListener('click', async () => {
        notificaciones.forEach((n) => { n.leida = true; });
        renderizar();

        await supabaseCliente
            .from('notificaciones')
            .update({ leida: true })
            .eq('usuario_id', usuarioId)
            .eq('leida', false);
    });

    async function iniciar() {
        const { data } = await supabaseCliente.auth.getUser();
        if (!data || !data.user) {
            contenedor.remove();
            return;
        }

        usuarioId = data.user.id;
        await cargar();

        supabaseCliente
            .channel(`campana-${usuarioId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'notificaciones',
                filter: `usuario_id=eq.${usuarioId}`
            }, cargar)
            .subscribe();
    }

    iniciar();
})();