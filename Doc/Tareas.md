Sprint 0 - Base de Datos (cerrado) 
SCRUM-32 Configurar el proyecto en Supabase X
SCRUM-34 Crear las tablas principales en postgres X
SCRUM-31 Diseñar el modelo de datos Multi-tenant X
SCRUM-35 Configurar Row Level Security (RLS) X

Sprint 1 - Registro y Acceso (Cerrado)
SCRUM-27 Registro Cliente X
SCRUM-28 Registro Vendedor X
SCRUM-29 Inicio de Sesion X
SCRUM-30 Cierre de Sesion X
SCRUM-33 Configurar Supabase Auth X
SCRUM-43 Registro Repartidor X 
SCRUM-30 Cierre de Sesion X

Sprint 2 - Distribuidora y Catálogo (Cerrado)
SCRUM-19 Catalogo de Productos X 
SCRUM-15 Solicitud de Ingreso a Distribuidora X
SCRUM-11 Aprobacion de Distribuidoras X
SCRUM-20 Administración de Flota de Repartidores X
SCRUM-49 Creacion de Admin X

Sprint 3 - Pedidos (Cerrando)
SCRUM-18 Control de Pedidos X
SCRUM-22 Realizacion de Pedido X
SCRUM-23 Visualizacion de codigo de confirmacion X
SCRUM-14 Validación de Recepción X 

Sprint 4 - Entregas y Seguimiento (cerrado)
SCRUM-12 Gestion de Entregas X
SCRUM-13 Visualizacion de Ruta Optimizadas X
SCRUM-24 Seguimiento en Vivo X
SCRUM-26 Comunicacion con Repartidor X
SCRUM-36 Configurar Supabase Realtime (msj) X
SCRUM-37 Configurar integracion con OpenSteetMap y OSRM X

Sprint 5 - Paneles y Suscripción 
SCRUM-16 Consulta de Dashboard Vendedor X
SCRUM-17 Metricas Comerciales X
SCRUM-21 Consulta de Dashboard Cliente X
SCRUM-25 Programacion de Suscripciones X
SCRUM-50 Promociones y Combos de Productos X

Sprint 6 - UX
SCRUM-46 Modo Claro / Oscuro
SCRUM-47 Btn Hamburguesa (Cel)
SCRUM-48 Pop-ups de productos

Liquidacion 
Hoja de ruta 
Re revisar logica de negocio
Desgloce de pagos, INSISTENCIA
Todo mov monetario debe ser avisado en un resumen (excel)
TRANSPARENCIA TOTAL EN LOS PAGOS.

Aviso de msj{
    Campana en pagina
    Aviso x Gmail
}

Transferencia{
    Avisa x gmail q [persona] realizo un pago
    Debe de dar un desgloce de todos los pagos realizado: Monto / Nombre
}

Logic negocio{
    Re revisar panel de Suscripciones
}

Yo{
    Revisar: msj recordatorio de fecha de envio de prod (Panel-suscripciones)
    Suscripciones: se realizan de forma semanal, es decir, en toda la semana solo puede haber cierta cantidad de suscripciones.
    Cargar autom a un repartidor o mas, las suscripciones (PRIORIDAD TOTAL).

}


Nuevas Tareas:

**Tareas cortas (para YA)**
- D1: Dar destino real a los 6 links del footer de index.html (DESPUES)
- D2: Crear 'terminos.html (hoy da 404 desde registro.html) (DESPUES)
- D3: Página 404 propia (DESPUES)
- Fix: vaciar el carrito al desloguear (TERMINADO)
- Probar el botón "Desactivar" anuncio 
- Verificar botón volver atrás, cerrar grupo de entrega y ver métricas (TERMINADO)
- T2: Corregir clases CSS en panel-vendedor.js (entregado → activo, cancelado → rechazada) (TERMINADO?)
- T1: Unificar asignado / asignada entre pedidos y entregas
- B4: Mensaje recordatorio de la fecha de envío en el panel de suscripciones
- E1: Popups de publicidad con rotación automática al siguiente anuncio cada pocos segundos (cada imagen con su propio link)

**Tareas medias**
- D10: @media para mobile en los 6 CSS (DESPUES)
- D5: Búsqueda de productos por texto (Terminado?)
- D6: Perfil de cliente editable
- D8: Verificación de email en el registro
- D9: Stock de productos
- D4: Reseñas y calificación a vendedor y repartidor
- C1: Campana de avisos dentro de la página
- C2: Aviso por Gmail de mensajes nuevos
- C3: Hoja de ruta del repartidor
- A5: Aviso por Gmail de pagos y transferencias, con desglose (monto y nombre)
  
- B2: Cupo semanal de suscripciones - Terminado {
  se usa solo el cupo máximo por día, que el vendedor configura en su panel. El calendario muestra Disponible / Lleno / Bloqueado. Límite semanal lo considero inutil. La capacidad semanal es el cupo diario por los días de atención.
  }

- B5: Unificar la lógica de "pago pendiente" entre carrito.js y suscripciones.js
- T3: Estandarizar el manejo de errores
- D7: "Repetir pedido" y favoritos

**Tareas largas**
- B1: Asignar automáticamente las suscripciones a uno o más repartidores (prioridad total) - Terminado
- B3: Re-revisar el panel de Suscripciones (lógica y UI)
- A1: Re-revisar la lógica de negocio completa
- A2: Desglose de pagos con transparencia total (monto, nombre, comisión)
- A3: Liquidación a vendedores y repartidores
- A4: Resumen en Excel de todo movimiento monetario