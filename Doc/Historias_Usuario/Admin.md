# Admin

- Nombre: Aprobación de Distribuidoras
    * Como: Administrador del sitio
    * Puedo: Revisar las distribuidoras en estado "Pendiente de aprobación" y aprobarlas o rechazarlas
    * Para: Controlar qué empresas pueden operar en la plataforma
    * Dado que: Existe al menos una distribuidora con solicitud pendiente
    * Cuando: Accedo al panel de administración y reviso la solicitud
    * Entonces: El sistema cambia el estado de la distribuidora a "Activa" o "Rechazada", y notifica el resultado al vendedor.

- Nombre: Gestion de Usuarios
    * Como: Administrador del sitio
    * Puedo: Bucar usuarios (Cliente, Vendedor, Repartidor) y suspender o reactivar sus cuentas
    * Para: Mantener la plataforma libre de usuarios fraudulentos o que incumplan las normas
    * Dado que: Detecto o recibo reporte sobre usuarios problematicos
    * Cuando: Accedo a su perfil desde el panel de administracion y cambio su estado (Suspender/Activar)
    * Entonces: El sistema aplica la suspension o reactivacion y notifica al usuario afectado

- Nombre: Metricas Globales de la Plataforma
    * Como: Administrador del sitio
    * Puedo: Visualizar indicadores generales (Usuarios Activos, Pedidos Totales, Distribuidoras Operando, etc.)
    * Para: Evualuar el estado y crecimiento general de AquaTrack
    * Dado que: Es importante evaluar los datos acumulados en el sistema
    * Cuando: Ingreso a la seccion **"Metricas Globales"** del panel de Administracion
    * Entonces: El sistema desplegara un grafico y totales de toda la plataforma

- Nombre: Gestion de Disputas
    * Como: Administrador del sitio
    * Puedo: Revisar reclamso entre Cliente, Vendedor y Repartidor sobre un pedido puntual
    * Para: Mediar y resolver conflictos que las partes no pudieron resolver solas
    * Dado que: Existe un reclamo abierto asociado a un pedido (como un Tiket)
    * Cuando: Accedo al detalle del reclamo y registro una resolucion
    * Entonces: El sistema marca el reclamo como resuelto y notifica la decision a las partes involucradas.