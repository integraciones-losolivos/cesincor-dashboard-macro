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
en los clientes de correo. Las plantillas de invitación y recuperación usan
`{{ .ConfirmationURL }}`, que Supabase sustituye por el enlace seguro de cada
persona. La invitación también muestra `{{ .Email }}` como correo de ingreso y
enlaza `{{ .SiteURL }}` al sitio configurado del proyecto.
