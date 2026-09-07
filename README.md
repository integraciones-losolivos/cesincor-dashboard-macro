# Cesincor Dashboard Macro

Portal web para consolidar reportes de Crystal Reports y SAP en una interfaz
construida con React, Vite y Tailwind CSS.

## Requisitos

- Node.js 20.19 o superior
- npm 10 o superior

## Desarrollo local

```bash
npm install
npm run dev
```

La dirección local predeterminada es `http://localhost:5173`.

Para usar la autenticación y los módulos conectados a SAP HANA, copia
`.env.example` como `.env.local`, completa las variables y ejecuta la interfaz
y la API:

```bash
npm run dev:full
```

La API expone `GET /api/health` sin autenticación. Los endpoints de datos
`/api/homenajes`, `/api/prevision`, `/api/prevision/facturacion` y
`/api/retiros` requieren un JWT válido de Supabase y el permiso del módulo
correspondiente. Aceptan los parámetros opcionales `from` y `to` con formato
`YYYY-MM-DD`.

## Autenticación y usuarios

Supabase Auth administra el inicio de sesión, las invitaciones y la
recuperación de contraseña. Express valida cada sesión y aplica los roles,
el estado de la cuenta y los permisos de módulos antes de consultar SAP HANA.

Las variables requeridas son:

- `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` para el frontend.
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SECRET_KEY` para la API.
- `APP_URL` para los enlaces de invitación y recuperación.

`SUPABASE_SECRET_KEY` es exclusivamente de servidor: nunca debe llevar el
prefijo `VITE_` ni incluirse en el repositorio. El panel **Usuarios**, visible
solo para administradores, permite invitar personas, cambiar nombre, rol,
estado y módulos, y enviar correos para restablecer contraseñas.

## Compilación

```bash
npm run build
```

## Despliegue en Hostinger

La aplicación se despliega como una aplicación Node.js única. Express sirve el
frontend compilado desde `dist` y también los endpoints bajo `/api`.

- Versión de Node.js: 22
- Comando de instalación: `npm ci`
- Comando de compilación: `npm run build`
- Comando de inicio: `npm start`
- Archivo de entrada, si Hostinger lo solicita: `server/index.js`

Configura en Hostinger las variables de Supabase indicadas arriba, con
`APP_URL=https://dashboard.losolivoscordobaysucre.com`, además de `HANA_HOST`,
`HANA_PORT`, `HANA_USER`, `HANA_PASSWORD`, `HANA_SCHEMA`, `HANA_ENCRYPT` y
`HANA_SSL_VALIDATE_CERTIFICATE`. Hostinger asigna la variable `PORT`
automáticamente. La API siempre abre la conexión a SAP HANA directamente desde
el servidor de Hostinger; no utiliza túneles ni servicios ejecutados en un PC.

## Caché de historial

Previsión y Retiros cargan primero el año actual para mostrar el tablero rápido
y preparan el historial completo en segundo plano. Los resultados se guardan
en una caché local persistente para reutilizarlos después de reiniciar el
servicio. Una entrada vencida se entrega inmediatamente y se actualiza sin
bloquear la pantalla. Por defecto la caché se almacena en
`%LOCALAPPDATA%/CesincorDashboard/cache`; `DASHBOARD_CACHE_DIR` permite elegir
otra ubicación y los tiempos de actualización se controlan con
`PREVISION_CACHE_TTL_MS` y `RETIROS_CACHE_TTL_MS`.

Los módulos funcionales se incorporan de forma incremental mediante ramas y
pull requests independientes.
