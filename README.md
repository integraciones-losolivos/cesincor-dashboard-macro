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

Para usar el módulo de Homenajes con SAP HANA, copia `.env.example` como
`.env`, completa las credenciales y ejecuta la interfaz y la API:

```bash
npm run dev:full
```

La API expone `GET /api/health`, `GET /api/homenajes` y `GET /api/prevision`.
Los endpoints de datos aceptan los parámetros opcionales `from` y `to` con
formato `YYYY-MM-DD`.

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

Configura en Hostinger las variables `HANA_HOST`, `HANA_PORT`, `HANA_USER`,
`HANA_PASSWORD`, `HANA_SCHEMA`, `HANA_ENCRYPT` y
`HANA_SSL_VALIDATE_CERTIFICATE`. Hostinger asigna la variable `PORT`
automáticamente.

## Puente hacia HANA desde la oficina

Cuando HANA solo acepta conexiones originadas en la red de la oficina, una
instancia local de esta API puede publicarse mediante un túnel HTTPS. En el PC
de la oficina configura `GATEWAY_SHARED_SECRET` junto con las variables HANA y
ejecuta `npm start`. No configures `UPSTREAM_API_URLS` en el PC.

En Hostinger configura la URL pública del túnel en `UPSTREAM_API_URLS` y la
misma clave en `UPSTREAM_API_TOKEN`. Cuando estas variables existen, Express
reenvía `/api/prevision` y `/api/homenajes` al puente en vez de intentar una
conexión directa a HANA. Se pueden indicar varias URL separadas por comas para
usar la siguiente cuando una no responda.

En Windows, después de configurar `.env`, inicia el puente con:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-office-bridge.ps1
```

El script usa la URL estable `https://acid-dose-ultra.ngrok-free.dev` por
defecto; se puede cambiar con `NGROK_PUBLIC_URL`. Antes de abrir un túnel,
revisa el inspector local de ngrok y reutiliza el túnel ya activo para no
consumir más endpoints o sesiones del plan. Mantén abierta únicamente la
consola que creó el túnel.

Los módulos funcionales se incorporan de forma incremental mediante ramas y
pull requests independientes.
