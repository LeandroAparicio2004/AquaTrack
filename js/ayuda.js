const preguntasAyuda = [
    {
        pregunta: '¿Cómo hago un pedido?',
        respuesta: 'Entrá a Productos, elegí lo que necesitás y agregalo al carrito. Después completá tu dirección (podés usar una guardada), elegí cómo pagar y confirmá. Al terminar te mostramos tu ticket.'
    },
    {
        pregunta: '¿Cómo pago?',
        respuesta: 'Podés pagar en efectivo cuando llega el repartidor, o por transferencia. Si elegís transferencia, te mostramos alias y CBU: hacés la transferencia y subís la captura del comprobante. Algunas distribuidoras aceptan solo uno de los dos métodos.'
    },
    {
        pregunta: '¿Cómo sé si mi transferencia fue aprobada?',
        respuesta: 'Entrá a Mis pedidos. Mientras revisamos tu comprobante dice "Transferencia · en verificación" y, cuando lo aprobamos, pasa a "pago verificado" en verde.'
    },
    {
        pregunta: '¿Cómo cancelo un pedido?',
        respuesta: 'En Mis pedidos tocá "Cancelar pedido". Solo se puede mientras esté pendiente, antes de que se lo asignen a un repartidor. Si tu transferencia ya fue verificada, escribile a soporte.'
    },
    {
        pregunta: '¿Para qué sirve el código del ticket?',
        respuesta: 'Tu ticket tiene un código QR y un código corto. Cuando llega el repartidor, mostrale el QR o decile el código: así confirma que te entregó a vos. No lo compartas antes de recibir tu pedido.'
    },
    {
        pregunta: '¿Cómo funcionan las suscripciones?',
        respuesta: 'Elegís el producto, la cantidad y los días de la semana en que querés recibirlo. Se programa una entrega por cada día elegido. Podés pausarla cuando quieras y, en "Ver cuenta", mirar cuánto corresponde pagar cada mes. El pago lo acordás con el vendedor. Si un día no podés recibir, avisale a él.'
    },
    {
        pregunta: '¿Qué pasa con mis envases vacíos?',
        respuesta: 'Al hacer el pedido indicás cuántos envases vacíos devolvés, y ese importe se descuenta del precio. Tené los envases listos cuando llegue el repartidor.'
    },
    {
        pregunta: 'Mi pedido no llegó',
        respuesta: 'Entrá a Mis pedidos y tocá "Seguir en vivo" para ver dónde está. Si figura como entregado y no lo recibiste, o se demora mucho, tocá "Tuve un problema" en ese pedido y te ayudamos.'
    }
];

let hayUsuarioAyuda = false;

function enlaceSoporteAyuda(texto) {
    if (!hayUsuarioAyuda) {
        return 'login.html?siguiente=ayuda.html';
    }

    return `chat.html?soporte=1&texto=${encodeURIComponent(texto)}`;
}

function mostrarPreguntasAyuda() {
    document.getElementById('ayuda-contenido').innerHTML = `
        <p class="ayuda-intro">Elegí tu duda:</p>
        <div class="ayuda-lista">
            ${preguntasAyuda.map((item, indice) => `
                <button type="button" class="ayuda-pregunta" data-pregunta="${indice}">${item.pregunta}</button>
            `).join('')}
        </div>
        <a class="ayuda-soporte" href="${enlaceSoporteAyuda('Hola, necesito ayuda.')}">Mi duda no está acá: hablar con soporte</a>
    `;
}

function mostrarRespuestaAyuda(indice) {
    const item = preguntasAyuda[indice];

    document.getElementById('ayuda-contenido').innerHTML = `
        <div class="ayuda-burbuja ayuda-burbuja-usuario">${item.pregunta}</div>
        <div class="ayuda-burbuja ayuda-burbuja-respuesta">${item.respuesta}</div>
        <p class="ayuda-intro">¿Te sirvió?</p>
        <div class="ayuda-acciones">
            <button type="button" class="btn btn-principal" id="ayuda-volver">Sí, ver otras preguntas</button>
            <a class="btn btn-secundario" href="${enlaceSoporteAyuda('Hola, necesito ayuda con: ' + item.pregunta)}">No, hablar con soporte</a>
        </div>
    `;
}

document.getElementById('ayuda-contenido').addEventListener('click', (evento) => {
    const pregunta = evento.target.closest('[data-pregunta]');

    if (pregunta) {
        mostrarRespuestaAyuda(Number(pregunta.dataset.pregunta));
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }

    if (evento.target.closest('#ayuda-volver')) {
        mostrarPreguntasAyuda();
    }
});

document.getElementById('boton-cerrar-sesion').addEventListener('click', async () => {
    await supabaseCliente.auth.signOut();
    localStorage.removeItem('aquatrack_carrito');
    window.location.href = 'login.html';
});

async function iniciarAyuda() {
    const { data: { session } } = await supabaseCliente.auth.getSession();

    hayUsuarioAyuda = !!session;
    document.getElementById('nav-usuario').classList.toggle('oculto', !session);
    document.getElementById('nav-invitado').classList.toggle('oculto', !!session);

    mostrarPreguntasAyuda();
}

iniciarAyuda();