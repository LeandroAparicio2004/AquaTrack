# Cliente

Sobra{

    Código viejo del calendario en suscripciones.
    Pop-up de anuncios al entrar al inicio. - UTIL PARA DAR PROPAGANDA A LAS TIENDAS (NO BORRAR)
    Mezclar distribuidoras en un mismo carrito. - UTIL PARA EVITAR Q EL CLIENTE HAGA VARIAS TRANSFERENCIAS AL PEDO (A PEDIDO DE MI PROFESOR, si no, busca como maneja esto MercadoLibre)
}

Mejorar{

    Cancelar un pedido pendiente: hoy no se puede.
    Mostrar una hora estimada en el seguimiento.
    Perfil: cambiar contraseña y editar o borrar direcciones. - Tenemos una forma de cambiar de contraseña, q este presente en otra parte seria al pedo. Se puede eliminar una direccion, no se puede editar (agregar "Editar Direccion") 
}

Falta{

    Pausar o saltar una entrega de la suscripción. (No hace falta, se puede pausar, lo de saltar debe ser un acuerdo hablado con el Vendedor)
    Aviso por WhatsApp o email de “va en camino”. (Lo ideal seria x Email, x Wsp no, no quiero integrar una API de wsp)
    Botón “Tuve un problema” en el historial. (Podriamos implementarlo, pero q haria ese btn?)
    Ayuda o preguntas frecuentes. - Pendiente, eso sera un "Minichat" con preguntas fijas q se pueden hacer y obtener una respuesta, en caso de q las preguntas no respondan pueden contactar con el Admin/soporte
}

------------------------------------------------------------------------------------------------------

# Vendedor 

Sobra{

    Pestaña "Pedidos" y pestaña "Asignar entregas" hacen casi lo mismo (el tablero Kanban ya muestra todo). Dejar una sola.
    9 pestañas en el panel: muchas para una persona mayor. Agrupar (ej.: Perfil + Publicidad en "Mi negocio"; Hojas de ruta dentro de Entregas).
    Calendario de suscripciones y lista de suscripciones: dejar una sola vista por defecto (la lista).
    Código viejo del calendario en suscripciones (el mismo del cliente).
}

Mejorar{

    Resumen del día al entrar: pedidos por asignar, efectivo por recibir, suscripciones atrasadas. Hoy hay que recorrer pestañas.
    Cobros: ordenar el bloque de efectivo y mostrar "total del mes" (efectivo + transferencia) para ver toda la plata.
    "No pude entregar": ventana prolija en vez del cuadro de texto del navegador (prompt).
    Productos: stock más visible (hoy solo se ve cuando llega a 0).
    Métricas: sumar "ventas del mes" y "clientes nuevos"; hoy solo hay 4 gráficos.
}

Falta{

    Saldo de envases por cliente (cuántos bidones tiene prestados). Es lo primero que ofrece el software de agua.
    Aviso al cliente por WhatsApp o email ("va en camino", "pedido asignado").
    Reclamos de clientes: ver y responder "Tuve un problema" ligado al pedido.
    Horario y zona de reparto del negocio (hasta dónde llega, qué días atiende).
    Exportar a Excel/PDF: pedidos, cobros y suscripciones del mes (para contabilidad).
    Pausar o saltar una entrega de la suscripción desde el lado del vendedor.
}

------------------------------------------------------------------------------------------------------

# Repartidor

Sobra{

    Pestaña "Hojas de ruta" con filtro de fechas y exportar: es trabajo del vendedor. Al repartidor le alcanza con su hoja del día (descarga en "Mis entregas").
    Pestaña "Mi perfil" con licencia, patente, marca y modelo: se pide una sola vez al registrarse; no hace falta tenerla a mano todos los días.
    Dos modos de confirmar (QR y código manual) en pestañas: dejar el QR primero y el código como opción chica abajo.
}

Mejorar{

    Cada entrega con 3 botones grandes: "Cómo llegar", "Llamar" y "Entregar". Hoy hay que copiar la dirección a mano.
    Mostrar primero lo importante: nombre, dirección, "cobrar $X en efectivo" o "ya pagado". Sin datos de más.
    "No pude entregar": ventana prolija con motivos para elegir (no estaba, dirección mal, no atendió) en vez de escribir.
    Botón "Disponible / No disponible" bien visible arriba (hoy casi no se ve).
    Resumen del día: entregas hechas, efectivo a rendir y pendientes, siempre a la vista.
}

Falta{

    Link "Cómo llegar" que abra Google Maps o Waze con la dirección.
    Botón "Llamar al cliente" (y WhatsApp) desde la tarjeta.
    Foto de la entrega como comprobante, para cuando no hay nadie en casa.
    Registrar los envases vacíos que se llevó (ya está en la base, falta la pantalla).
    Orden sugerido de la ruta (la parada más cercana primero).
    Ver cuánto efectivo debe rendir al vendedor al final del día.
}

------------------------------------------------------------------------------------------------------

# Admin

Sobra{

    Pestañas "Pendientes" y "Todas las distribuidoras": son la misma lista con otro filtro. Dejar una sola con filtro (Pendientes / Activas / Suspendidas).
    Gráfico "Pagos pendientes vs confirmados" en métricas: ya se ve en la pestaña Pagos.
    Gráfico "Usuarios registrados por rol": curioso, pero no ayuda a decidir nada.
}

Mejorar{

    Pantalla de inicio con 4 números: pagos por verificar, liquidaciones por hacer, distribuidoras pendientes, anuncios por aprobar. Hoy hay que abrir cada pestaña para saberlo.
    Pagos: separar claro "Por verificar" (el cliente transfirió) de "Por pagar al vendedor" (ya verificado). Hoy todo está en una sola tarjeta.
    Comisión: poder cambiar el porcentaje desde el panel (hoy se toca en la base de datos).
    Movimientos: que se pueda filtrar por distribuidora y por mes, y que muestre el total de la comisión.
    Mostrar el motivo cuando se rechaza o suspende (para que el vendedor sepa por qué).
}

Falta{

    Exportar movimientos y comisiones a Excel o PDF (para contabilidad).
    Ver y responder el soporte/chat desde el panel (el chat tiene soporte, el admin no tiene pantalla propia).
    Moderar reseñas (borrar las ofensivas).
    Bloquear o suspender a un cliente o repartidor, no solo a distribuidoras.
    Registro de acciones (quién aprobó o rechazó qué y cuándo), para dar transparencia.
    Controlar el efectivo: ver cuánto efectivo cobró cada distribuidora y cuánto confirmó recibir.
} 

Asignar pedido{
    Los pedidos se ven muuy extensos, es molesto. La solucion: Se realizan grupos de envio, seria darle la posibilidad de q el vendedor ponga un limite x grupo, es decir como ejemplo: En 1 grupo estaran 5 envios, yo para asignar esos 5 envios al repartidor simplemente agarro "Grupo 1" y lo arrastro a la fila de el repartidor q quiero, se me entiende?? 
    ahora mi duda, como hacemos para q eso sea mas comodo?? porque ponele q en el grupo haya un envio para la ciudad y otro para pirquitas, quedan en la loma del culo, lo ideal seria q se agrupen x ubicacion. Queria algo asi:
    Juan (Piedra Blanca) _ Martin (Carrera) _ Leandro (Tercena): Esos 3 realizaron un pedido, esos 3 fueron asignados al grupo 1.
    yo como Vendedor los asigno al repartidor0 (usamos el KanBan), el repartidor Visualiza los envios q tiene q realizar de forma individual, cada persona con su ubicacion, numero, asi como ahora... Noc si se me entiende o prefieres q busque otra explicacion.

    En caso de q 1 persona mas Jose (Centro) viva lejos, se busca la manera q se lo empareje con gente q vive cerca o sus aproximidades.
}