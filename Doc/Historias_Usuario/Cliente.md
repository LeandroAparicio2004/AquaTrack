# CLIENTE

- Nombre: Consulta de Dashboard Cliente
    * Como: Cliente
    * Puedo: Visualizar mis métricas de pedidos, historial reciente y huella de carbono
    * Para: Controlar mis consumos y el impacto ambiental por retorno de envases
    * Dado que: He iniciado sesión como cliente
    * Cuando: Ingreso a la pantalla principal
    * Entonces: El sistema muestra métricas de pedidos totales, entregados, en camino, el historial reciente y el indicador ecológico.

- Nombre: Realización de Pedido
    * Como: Cliente
    * Puedo: Seleccionar una distribuidora, añadir productos, aplicar descuentos por envases vacíos y confirmar dirección
    * Para: Solicitar bidones de agua a domicilio
    * Dado que: Estoy en la sección "Nuevo pedido"
    * Cuando: Elijo la empresa, los productos, indico la cantidad de bidones vacíos a devolver y confirmo
    * Entonces: El sistema genera la orden de compra y calcula el monto total con los descuentos aplicados.

- Nombre: Visualización de Código de Confirmación
    * Como: Cliente
    * Puedo: Obtener un código QR y un token numérico para mis pedidos activos
    * Para: Presentárselo al repartidor y validar la recepción del pedido
    * Dado que: Tengo un pedido en estado "En camino"
    * Cuando: Ingreso a "Mis pedidos"
    * Entonces: El sistema genera y exhibe el código QR y token asociados a la entrega.

- Nombre: Seguimiento en Vivo
    * Como: Cliente
    * Puedo: Ver la ubicación del repartidor y de mi domicilio en un mapa en tiempo real
    * Para: Conocer el tiempo estimado de llegada y reducir la incertidumbre
    * Dado que: Mi pedido ha sido despachado
    * Cuando: Accedo a la sección "Seguimiento en vivo"
    * Entonces: El mapa muestra el recorrido interactivo del camión hacia mi ubicación.

- Nombre: Programación de Suscripciones
    * Como: Cliente
    * Puedo: Crear, pausar, reactivar o eliminar pedidos automáticos periódicos
    * Para: Automatizar la recepción de bidones sin tener que pedir manualmente cada vez
    * Dado que: Deseo recibir agua periódicamente
    * Cuando: Configuro una nueva suscripción seleccionando la frecuencia y cantidad de bidones
    * Entonces: El sistema guarda la regla y genera los pedidos en las fechas programadas.

- Nombre: Comunicación con Repartidor
    * Como: Cliente
    * Puedo: Enviar y recibir mensajes mediante un chat directo con el repartidor asignado
    * Para: Coordinar detalles de la entrega o resolver imprevistos
    * Dado que: Hay un pedido activo en curso
    * Cuando: Escribo un mensaje en la pantalla de chat
    * Entonces: El repartidor recibe la notificación de forma inmediata.
