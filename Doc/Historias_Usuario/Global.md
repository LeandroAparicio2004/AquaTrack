# Global (Autenticación y Cuentas)

- Nombre: Inicio de Sesión
    * Como: Usuario registrado
    * Puedo: Iniciar sesión con email y contraseña
    * Para: Acceder al panel de control de mi perfil
    * Dado que: Tengo una cuenta activa
    * Cuando: Ingreso mis credenciales en la pantalla de Login
    * Entonces: El sistema valida las credenciales y me redirige a mi dashboard.

- Nombre: Cierre de Sesión
    * Como: Usuario autenticado
    * Puedo: Cerrar mi sesión desde cualquier pantalla de la plataforma
    * Para: Proteger mi cuenta al terminar de usar el sistema, especialmente en dispositivos compartidos
    * Dado que: Tengo una sesión activa
    * Cuando: Presiono el botón "Salir" en la barra de navegación
    * Entonces: El sistema cierra mi sesión y me redirige a la pantalla de Login.

- Nombre: Recuperar Contraseña
    * Como: Usuario registrado que olvido su contraseña
    * Puedo: Solicitar un enlace de restablecimiento a mi correo
    * Para: Recuperar el acceso a mi cuenta sin depender de soporte
    * Dado que: No recuerdo mi contraseña actual
    * Cuando: Presiono **"Olvide mi contraseña"** en el Login e ingreso mi correo
    * Entonces: El sistema envia una enlace de restablecimiento valido por tiempo limitado y permite definir una contraseña nueva.

- Nombre: Registro de Cliente
    * Como: Persona sin cuenta en AquaTrack
    * Puedo: Crear una cuenta seleccionando el rol "Cliente"
    * Para: Acceder a la plataforma y solicitar bidones a domicilio
    * Dado que: No poseo una cuenta registrada
    * Cuando: Ingreso a la pantalla de registro, selecciono "Cliente" y completo mis datos (nombre, email, contraseña)
    * Entonces: El sistema crea mi perfil y me permite acceder de inmediato.

- Nombre: Registro de Vendedor
    * Como: Persona que quiere ofrecer servicios de distribución en AquaTrack
    * Puedo: Crear una cuenta seleccionando el rol "Vendedor" y completar los datos de mi negocio
    * Para: Solicitar el alta de mi distribuidora en la plataforma
    * Dado que: No poseo una cuenta registrada
    * Cuando: Ingreso a la pantalla de registro, selecciono "Vendedor" y completo mis datos personales y de negocio
    * Entonces: El sistema crea mi perfil y mi distribuidora queda en estado "Pendiente de aprobación", sin poder operar hasta ser habilitada por un administrador.

- Nombre: Registro de Repartidor
    * Como: Persona que quiere trabajar repartiendo bidones en AquaTrack 
    * Puedo: Crear una cuenta seleccionando el rol "**Repartidor**" y completar mis datos personales y de vehiculo
    * Para: Poder Ofrecerme como repartidor **Freelance** o ser vinculador (Contratado) por una distribuidora
    * Dato que: No poseo una cuenta registrada
    * Cuando: Ingreso a la pantalla de registro, selecciono **"Repartidor"** y completo mis datos (Nombre, gmail, contraseña, tipo de vehiculo)
    * Entonces: El sistema crea mi perfil como **Repartidor** disponible, sin distribuidora asiganada hasta que solicite o sea agregado a una

- Nombre: Edicion de Perfil
    * Como: Usuario autenticado (Cliente, Vendedor o Repartidor)
    * Puedo: Ver y actualizar mis datos personales (nombre, teléfono, foto y datos especificos de mi rol)
    * Para: Mantener mi informacion de contacto correcta/actualizada
    * Dado que: Tengo una sesion activa 
    * Cuando: Accedo a **"Mi Perfil"** y modifico algun campo
    * Entonces: El sistema guarda los cambios y los refleja en el resto de la plataforma

- Nombre: Notificaciones del Sistema
    * Como: Usuario Autenticado
    * Puedo: Recibir notificaciones push/email sobre eventos relevantes de mis pedidos o cuenta
    * Para: Enterarme de cambios de estado sin tener que revisar el sitio constantemente
    * Dado que: Tengo las notificaciones habilitadas
    * Cuando: Ocurre algun evento relevante (Cambio de estado de pedido, Aprobacion de cuenta, nuevo mensaje de chat, etc.)
    * Entonces: El sistema me Envia una notificacion con el detalle del evento.