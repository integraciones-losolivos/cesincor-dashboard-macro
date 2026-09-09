# Correos de autenticación

Plantillas de marca para el proyecto **Dashboard Gerencial Los Olivos**.

| Plantilla de Supabase | Asunto recomendado | Archivo |
| --- | --- | --- |
| Invite user | Acceso al Dashboard Gerencial Los Olivos | `invite-user.html` |
| Reset password | Restablece tu contraseña · Los Olivos | `reset-password.html` |
| Password changed | Tu contraseña fue actualizada · Los Olivos | `password-changed.html` |

Supabase requiere habilitar un SMTP personalizado antes de editar los asuntos
y cuerpos. El SMTP también reemplaza el remitente genérico **Supabase Auth** por
el nombre y la dirección configurados para Los Olivos.

Para producción, no se debe depender del servicio SMTP predeterminado de
Supabase: tiene límites bajos y no garantiza la entrega. Configura un SMTP
transaccional propio, autentica el dominio remitente con SPF y DKIM, y agrega
`https://dashboard.losolivoscordobaysucre.com/**` a **Redirect URLs** en Auth.

El logotipo se carga desde el sitio institucional público para que sea visible
en los clientes de correo. Las plantillas de invitación y recuperación
construyen enlaces con `{{ .TokenHash }}`. La aplicación consume ese código con
`verifyOtp`, por lo que solo puede utilizarse una vez y nunca expone una sesión
reutilizable en la URL. La invitación también muestra `{{ .Email }}`.
