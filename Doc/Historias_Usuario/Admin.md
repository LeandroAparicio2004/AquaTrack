# Admin

- Nombre: Aprobación de Distribuidoras
    * Como: Administrador del sitio
    * Puedo: Revisar las distribuidoras en estado "Pendiente de aprobación" y aprobarlas o rechazarlas
    * Para: Controlar qué empresas pueden operar en la plataforma
    * Dado que: Existe al menos una distribuidora con solicitud pendiente
    * Cuando: Accedo al panel de administración y reviso la solicitud
    * Entonces: El sistema cambia el estado de la distribuidora a "Activa" o "Rechazada", y notifica el resultado al vendedor.