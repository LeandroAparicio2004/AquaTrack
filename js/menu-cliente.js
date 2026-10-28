(function () {
    const navUsuario = document.getElementById('nav-usuario');

    if (!navUsuario) {
        return;
    }

    const iconos = {
        productos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3C8 8.5 6 11.2 6 14a6 6 0 0 0 12 0c0-2.8-2-5.5-6-11z"/></svg>',
        pedidos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>',
        suscripciones: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg>',
        cuenta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>'
    };

    const pagina = window.location.pathname.split('/').pop() || 'index.html';

    const paginasPorOpcion = {
        productos: ['index.html', 'productos.html', 'carrito.html'],
        pedidos: ['historial.html', 'seguimiento.html', 'ticket.html'],
        suscripciones: ['suscripciones.html'],
        cuenta: ['perfil.html', 'ayuda.html', 'chat.html']
    };

    function claseActiva(opcion) {
        return paginasPorOpcion[opcion].includes(pagina) ? ' activa' : '';
    }

    const barra = document.createElement('nav');
    barra.className = 'barra-inferior-cliente';
    barra.setAttribute('aria-label', 'Menú principal');
    barra.innerHTML = `
        <a href="productos.html" class="tab-cliente${claseActiva('productos')}">${iconos.productos}<span>Productos</span></a>
        <a href="historial.html" class="tab-cliente${claseActiva('pedidos')}">${iconos.pedidos}<span>Pedidos</span></a>
        <a href="suscripciones.html" class="tab-cliente${claseActiva('suscripciones')}">${iconos.suscripciones}<span>Suscripciones</span></a>
        <button type="button" class="tab-cliente${claseActiva('cuenta')}" id="tab-cuenta">${iconos.cuenta}<span>Cuenta</span></button>
    `;
    document.body.appendChild(barra);

    const contenedorCuenta = document.createElement('div');
    contenedorCuenta.className = 'cuenta-escritorio';
    contenedorCuenta.innerHTML = '<button type="button" class="btn btn-secundario" id="boton-cuenta-escritorio" aria-haspopup="true" aria-expanded="false">Mi cuenta ▾</button>';
    navUsuario.appendChild(contenedorCuenta);

    const fondo = document.createElement('div');
    fondo.className = 'cuenta-fondo';
    fondo.hidden = true;

    const panel = document.createElement('div');
    panel.className = 'cuenta-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'menu');
    panel.innerHTML = `
        <a href="perfil.html" role="menuitem">Mi perfil</a>
        <a href="chat.html" role="menuitem">Mensajes</a>
        <a href="ayuda.html" role="menuitem">Ayuda</a>
        <button type="button" role="menuitem" id="cuenta-tema">Cambiar modo claro / oscuro</button>
        <button type="button" role="menuitem" id="cuenta-salir" class="cuenta-salir">Salir</button>
    `;

    document.body.appendChild(fondo);
    document.body.appendChild(panel);

    function abrirPanel() {
        panel.hidden = false;
        fondo.hidden = false;
        document.getElementById('boton-cuenta-escritorio').setAttribute('aria-expanded', 'true');
    }

    function cerrarPanel() {
        panel.hidden = true;
        fondo.hidden = true;
        document.getElementById('boton-cuenta-escritorio').setAttribute('aria-expanded', 'false');
    }

    function alternarPanel() {
        if (panel.hidden) {
            abrirPanel();
        } else {
            cerrarPanel();
        }
    }

    document.getElementById('boton-cuenta-escritorio').addEventListener('click', alternarPanel);
    document.getElementById('tab-cuenta').addEventListener('click', alternarPanel);
    fondo.addEventListener('click', cerrarPanel);

    document.addEventListener('keydown', (evento) => {
        if (evento.key === 'Escape') {
            cerrarPanel();
        }
    });

    document.getElementById('cuenta-tema').addEventListener('click', () => {
        document.querySelector('.btn-tema')?.click();
        cerrarPanel();
    });

    document.getElementById('cuenta-salir').addEventListener('click', () => {
        document.getElementById('boton-cerrar-sesion')?.click();
    });

    function sincronizar() {
        const hayUsuario = !navUsuario.classList.contains('oculto');

        document.body.classList.toggle('con-menu-cliente', hayUsuario);

        if (!hayUsuario) {
            cerrarPanel();
        }
    }

    new MutationObserver(sincronizar).observe(navUsuario, { attributes: true, attributeFilter: ['class'] });
    sincronizar();
})();