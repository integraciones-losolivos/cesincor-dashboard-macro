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

Los módulos funcionales se incorporan de forma incremental mediante ramas y
pull requests independientes.
