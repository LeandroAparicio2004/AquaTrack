# Repartidor

- Nombre: Gestión de Entregas
    * Como: Repartidor
    * Puedo: Visualizar las entregas asignadas del día y cambiar su estado a "Salir a entregar" o "Confirmar entrega"
    * Para: Iniciar y completar el proceso de reparto
    * Dado que: Tengo envíos asignados por la distribuidora
    * Cuando: Reviso mi panel principal e interactúo con los botones de acción de cada pedido
    * Entonces: El sistema actualiza el estado del paquete y notifica al cliente.

- Nombre: Visualización de Ruta Optimizada
    * Como: Repartidor
    * Puedo: Consultar el mapa interactivamente con el orden secuencial de paradas optimizado
    * Para: Minimizar el tiempo de viaje y ahorrar combustible dirigiéndome al cliente más cercano
    * Dado que: Tengo múltiples entregas en curso
    * Cuando: Accedo a la pestaña "Mi ruta"
    * Entonces: El sistema calcula y grafica la trayectoria más eficiente ordenando las paradas.

- Nombre: Validación de Recepción
    * Como: Repartidor
    * Puedo: Escanear el código QR del cliente con la cámara o hacer la confirmación manual
    * Para: Dar por finalizada la entrega y registrar el cobro/recepción en el sistema
    * Dado que: Me encuentro en el domicilio del cliente
    * Cuando: Abro la función "Escanear QR" y enfoco el código provisto por el comprador
    * Entonces: El pedido pasa a estado "Entregado" y se descuentan los envases retornables vacíos.

- Nombre: Solicitud de Ingreso a Distribuidora
    * Como: Repartidor freelance registrado en AquaTrack
    * Puedo: Buscar distribuidoras disponibles y enviarles una solicitud para trabajar con ellas
    * Para: Conseguir trabajo de reparto sin depender de un único empleador, como el modelo Uber
    * Dado que: Existen distribuidoras activas registradas en la plataforma
    * Cuando: Accedo a "Buscar empresas" desde mi panel y envío una solicitud con un mensaje opcional sobre mi disponibilidad y vehículo
    * Entonces: La solicitud queda pendiente de aprobación por parte del vendedor.