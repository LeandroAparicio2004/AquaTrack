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

btnAgregarProducto.addEventListener('click', () => {
    document.getElementById('titulo-modal-producto').textContent = 'Agregar producto';
    document.getElementById('formulario-producto').reset();
    modalProducto.classList.remove('oculto');
});

btnCerrarModalProducto.addEventListener('click', () => {
    modalProducto.classList.add('oculto');
});

modalProducto.addEventListener('click', (evento) => {
    if (evento.target === modalProducto) {
        modalProducto.classList.add('oculto');
    }
});

document.getElementById('formulario-producto').addEventListener('submit', (evento) => {
    evento.preventDefault();
    // Acá todavía no guardamos nada real — se conecta a Supabase en la próxima etapa
    modalProducto.classList.add('oculto');
});

const checkTransferencia = document.getElementById('acepta-transferencia');
const campoAlias = document.getElementById('campo-alias');

checkTransferencia.addEventListener('change', () => {
    campoAlias.classList.toggle('oculto', !checkTransferencia.checked);
});

document.getElementById('formulario-perfil').addEventListener('submit', (evento) => {
    evento.preventDefault();
    // Acá todavía no guardamos nada real — se conecta a Supabase en la próxima etapa
});