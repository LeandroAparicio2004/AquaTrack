# Global (Autenticación y Cuentas)

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