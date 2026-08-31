# Vendedor

- Nombre: Consulta de Dashboard Vendedor
    * Como: Vendedor
    * Puedo: Visualizar el estado general de los pedidos y asignar repartidores disponibles
    * Para: Gestionar de forma rápida la operación diaria
    * Dado que: He iniciado sesión como empresa
    * Cuando: Reviso la vista principal del Panel de Control
    * Entonces: El sistema resume las órdenes pendientes, asignadas y en camino, permitiendo asignación directa.

- Nombre: Análisis de Métricas Comerciales
    * Como: Vendedor
    * Puedo: Consultar reportes de ingresos, totales de pedidos e historial de entregas
    * Para: Evaluar el rendimiento del negocio y la demanda
    * Dado que: Requiero información analítica
    * Cuando: Entro a la pestaña "Métricas"
    * Entonces: El sistema despliega gráficos de ventas de los últimos días y barras de distribución por estado.

- Nombre: Control de Pedidos
    * Como: Vendedor
    * Puedo: Filtrar los pedidos por su estado (pendientes, asignados, en camino, entregados, cancelados) y cancelar un pedido pendiente
    * Para: Mantener un orden operacional de las ventas y descartar pedidos que no se pueden cumplir
    * Dado que: Existen múltiples pedidos registrados
    * Cuando: Aplico los filtros en la vista "Pedidos", o presiono "Cancelar" sobre un pedido pendiente
    * Entonces: La lista se actualiza mostrando únicamente los elementos correspondientes a la categoría elegida, o el pedido cancelado cambia su estado a "Cancelado".

- Nombre: Catálogo de Productos
    * Como: Vendedor
    * Puedo: Dar de alta, editar, activar o desactivar productos del catálogo
    * Para: Mantener actualizada la oferta y precios para los clientes
    * Dado que: Estoy en la sección de administración de productos
    * Cuando: Completo el formulario con nombre, capacidad en litros, precio y descripción
    * Entonces: El producto se publica en la tienda de la distribuidora.

- Nombre: Control de Stock
    * Como: Vendedor
    * Puedo: Registrar y actualizar la cantidad disponible de cada producto de mi inventario
    * Para: Evitar vender bidones que no tengo disponibles y planificar reposicion
    * Dado que: Tengo productos publicados en mi catalogo
    * Cuando: Actualizo manualmente el stock o el sistema lo descuenta automaticamente al confirmarse un pedido
    * Entonces: El sistema refleja el Stock actualizado y advierte cuando un producto esta por agotarse

- Nombre: Administración de Flota de Repartidores
    * Como: Vendedor
    * Puedo: Gestionar repartidores propios, aceptar solicitudes de repartidores independientes o agregarlos directamente por email/usuario
    * Para: Asegurar la cobertura logística de las entregas
    * Dado que: Necesito incorporar personal de reparto
    * Cuando: Reviso las solicitudes o añado un usuario en "Gestión de repartidores"
    * Entonces: El repartidor queda vinculado a la empresa para realizar despachos.

- Nombre: Desvinculacion de Repartidor
    * Como: Vendedor
    * Puedo: Remover un repartidor de mi flota
    * Para: Dejar de asignarle pedidos cuando ya no trabaje conmigo
    * Dado que: Tengo repartidores vinculador a mi distribuidora
    * Cuando: Presiono **"Quitar"** sobre un repartidor en **"Gestion de Repartidores"**
    * Entonces: El sistema desvincula al repartidor, que deja de recibir asignaciones de mi distribuidora.