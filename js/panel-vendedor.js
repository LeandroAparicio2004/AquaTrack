let distribuidoraActual = null;
let productosDelPanel = [];

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

function renderizarProductosPanel() {
    const lista = document.getElementById('lista-productos-panel');
    const estadoVacio = document.getElementById('estado-productos-panel');

    lista.innerHTML = '';

    if (productosDelPanel.length === 0) {
        estadoVacio.textContent = 'Todavía no cargaste ningún producto. Hacé clic en "+ Agregar producto" para sumar el primero.';
        estadoVacio.classList.remove('oculto');
        return;
    }

    estadoVacio.classList.add('oculto');

    productosDelPanel.forEach((producto) => {
        const tarjeta = document.createElement('article');
        tarjeta.className = 'tarjeta-producto-panel';

        tarjeta.innerHTML = `
            <div class="tarjeta-producto-panel-foto">
                ${producto.foto_url
                    ? `<img src="${escaparHtml(producto.foto_url)}" alt="${escaparHtml(producto.nombre)}">`
                    : '<span>Sin foto</span>'}
            </div>

            <div class="tarjeta-producto-panel-superior">
                <h3>${escaparHtml(producto.nombre)}</h3>
                <span class="etiqueta-estado-producto ${producto.activo ? 'activo' : 'inactivo'}">
                    ${producto.activo ? 'Activo' : 'Inactivo'}
                </span>
            </div>
            <p class="tarjeta-producto-panel-descripcion">
                ${escaparHtml(producto.descripcion || 'Sin descripción.')}
            </p>
            <div class="tarjeta-producto-panel-detalle">
                <span>${escaparHtml(producto.capacidad_litros)} litros</span>
                <strong>${formatearPrecio(producto.precio)}</strong>
            </div>
            <div class="tarjeta-producto-panel-acciones">
                <button type="button" class="btn btn-secundario btn-chico" data-editar="${producto.id}">Editar</button>
                <button type="button" class="btn ${producto.activo ? 'btn-secundario' : 'btn-principal'} btn-chico" data-alternar="${producto.id}">
                    ${producto.activo ? 'Desactivar' : 'Activar'}
                </button>
            </div>
        `;

        lista.appendChild(tarjeta);
    });
}

async function cargarProductosPanel() {
    const { data, error } = await supabaseCliente
        .from('productos')
        .select('id, nombre, descripcion, capacidad_litros, precio, activo, foto_url')
        .eq('distribuidora_id', distribuidoraActual.id)
        .order('creado_en', { ascending: false });

    if (error) {
        const estadoVacio = document.getElementById('estado-productos-panel');
        estadoVacio.textContent = 'No pudimos cargar tus productos. Recargá la página.';
        estadoVacio.classList.remove('oculto');
        return;
    }

    productosDelPanel = data || [];
    renderizarProductosPanel();
}

const configuracionEstados = {
    pendiente_aprobacion: {
        clase: 'aviso-pendiente',
        titulo: 'Tu distribuidora está pendiente de aprobación',
        texto: 'Podés cargar tus productos mientras tanto, pero no van a verse en el catálogo público hasta que un administrador la apruebe.'
    },
    suspendida: {
        clase: 'aviso-peligro',
        titulo: 'Tu distribuidora está suspendida',
        texto: 'No podés recibir pedidos nuevos mientras esté en este estado. Contactá a soporte para más información.'
    },
    rechazada: {
        clase: 'aviso-peligro',
        titulo: 'Tu solicitud fue rechazada',
        texto: 'Contactá a soporte si creés que se trata de un error.'
    }
};

function renderizarAvisoEstado(estado) {
    const avisoEstado = document.getElementById('aviso-estado');
    const configuracion = configuracionEstados[estado];

    if (!configuracion) {
        avisoEstado.classList.add('oculto');
        return;
    }

    avisoEstado.classList.remove('oculto', 'aviso-pendiente', 'aviso-peligro');
    avisoEstado.classList.add(configuracion.clase);
    document.getElementById('aviso-estado-titulo').textContent = configuracion.titulo;
    document.getElementById('aviso-estado-texto').textContent = configuracion.texto;
}

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
        .select(`
            distribuidoras (
                id, nombre, descripcion, estado, calle, numero, ciudad, provincia,
                acepta_efectivo, acepta_transferencia, alias_cbu, titular_cuenta, foto_url
            )
        `)
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
    renderizarAvisoEstado(distribuidoraActual.estado);

    document.getElementById('panel-cargando').classList.add('oculto');
    document.getElementById('panel-header').classList.remove('oculto');
    document.getElementById('panel-main').classList.remove('oculto');

    cargarProductosPanel();
}

inicializarPanel();

const pestanas = document.querySelectorAll('.panel-pestana');
const secciones = {
    productos: document.getElementById('seccion-productos'),
    perfil: document.getElementById('seccion-perfil')
};

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
    });
});

const modalProducto = document.getElementById('modal-producto');
const btnAgregarProducto = document.getElementById('btn-agregar-producto');
const btnCerrarModalProducto = document.getElementById('boton-cerrar-modal-producto');

const formularioProducto = document.getElementById('formulario-producto');
const btnGuardarProducto = document.getElementById('btn-guardar-producto');
const inputFotoProducto = document.getElementById('foto-producto');
const vistaFotoProducto = document.getElementById('vista-foto-producto');
let productoEnEdicion = null;
let archivoFotoProducto = null;

function mostrarVistaFoto(url) {
    vistaFotoProducto.innerHTML = url
        ? `<img src="${url}" alt="Foto del producto">`
        : '<span>Sin foto</span>';
}

function abrirModalProducto(producto) {
    productoEnEdicion = producto || null;
    archivoFotoProducto = null;
    inputFotoProducto.value = '';

    document.getElementById('titulo-modal-producto').textContent =
        producto ? 'Editar producto' : 'Agregar producto';

    formularioProducto.reset();
    mostrarVistaFoto(producto?.foto_url || null);

    if (producto) {
        document.getElementById('nombre-producto').value = producto.nombre;
        document.getElementById('descripcion-producto').value = producto.descripcion || '';
        document.getElementById('litros-producto').value = producto.capacidad_litros;
        document.getElementById('precio-producto').value = producto.precio;
    }

    modalProducto.classList.remove('oculto');
}

inputFotoProducto.addEventListener('change', () => {
    const archivo = inputFotoProducto.files[0];

    if (!archivo) {
        return;
    }

    archivoFotoProducto = archivo;
    mostrarVistaFoto(URL.createObjectURL(archivo));
});

async function subirFotoProducto(archivo) {
    const rutaArchivo = `${distribuidoraActual.id}/${crypto.randomUUID()}-${archivo.name}`;

    const { error: errorSubida } = await supabaseCliente.storage
        .from('productos-fotos')
        .upload(rutaArchivo, archivo);

    if (errorSubida) {
        throw new Error('No pudimos subir la foto. Probá con otra imagen.');
    }

    const { data } = supabaseCliente.storage
        .from('productos-fotos')
        .getPublicUrl(rutaArchivo);

    return data.publicUrl;
}

btnAgregarProducto.addEventListener('click', () => {
    abrirModalProducto(null);
});

btnCerrarModalProducto.addEventListener('click', () => {
    modalProducto.classList.add('oculto');
});

modalProducto.addEventListener('click', (evento) => {
    if (evento.target === modalProducto) {
        modalProducto.classList.add('oculto');
    }
});

formularioProducto.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    btnGuardarProducto.disabled = true;
    btnGuardarProducto.textContent = 'Guardando...';

    try {
        const datosProducto = {
            distribuidora_id: distribuidoraActual.id,
            nombre: document.getElementById('nombre-producto').value.trim(),
            descripcion: document.getElementById('descripcion-producto').value.trim(),
            capacidad_litros: Number(document.getElementById('litros-producto').value),
            precio: Number(document.getElementById('precio-producto').value)
        };

        if (archivoFotoProducto) {
            datosProducto.foto_url = await subirFotoProducto(archivoFotoProducto);
        }

        const { error } = productoEnEdicion
            ? await supabaseCliente
                .from('productos')
                .update(datosProducto)
                .eq('id', productoEnEdicion.id)
            : await supabaseCliente
                .from('productos')
                .insert(datosProducto);

        if (error) {
            alert('No pudimos guardar el producto. Revisá los datos e intentá de nuevo.');
            return;
        }

        modalProducto.classList.add('oculto');
        await cargarProductosPanel();
    } catch (errorSubida) {
        alert(errorSubida.message || 'Ocurrió un error. Intente de nuevo.');
    } finally {
        btnGuardarProducto.disabled = false;
        btnGuardarProducto.textContent = 'Guardar producto';
    }
});

document.getElementById('lista-productos-panel').addEventListener('click', async (evento) => {
    const botonEditar = evento.target.closest('[data-editar]');

    if (botonEditar) {
        const producto = productosDelPanel.find((item) => item.id === botonEditar.dataset.editar);
        abrirModalProducto(producto);
        return;
    }

// Activar/Desactivar producto
    const botonAlternar = evento.target.closest('[data-alternar]');

    if (botonAlternar) {
        const producto = productosDelPanel.find((item) => item.id === botonAlternar.dataset.alternar);

        if (!producto) {
            return;
        }

        botonAlternar.disabled = true;

        const { error } = await supabaseCliente
            .from('productos')
            .update({ activo: !producto.activo })
            .eq('id', producto.id);

        if (error) {
            alert('No pudimos actualizar el producto. Intentá de nuevo.');
            botonAlternar.disabled = false;
            return;
        }

        await cargarProductosPanel();
    }
});

const checkTransferencia = document.getElementById('acepta-transferencia');
const campoAlias = document.getElementById('campo-alias');

checkTransferencia.addEventListener('change', () => {
    campoAlias.classList.toggle('oculto', !checkTransferencia.checked);
});

document.getElementById('formulario-perfil').addEventListener('submit', (evento) => {
    evento.preventDefault();
});