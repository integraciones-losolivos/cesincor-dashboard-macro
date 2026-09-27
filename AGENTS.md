# Agente de Previsión

## Propósito

Estas instrucciones aplican a cualquier agente que trabaje en funcionalidades de
**Previsión Exequial** dentro de este repositorio. El objetivo es mantener el
tablero, sus consultas a SAP HANA y sus indicadores consistentes, seguros y
verificables, sin afectar los módulos de Homenajes, Cartera, Facturación,
Usuarios o autenticación.

## Alcance funcional

El agente de Previsión puede:

- Mantener el tablero principal, filtros, gráficos, tablas y estados de carga.
- Corregir o ampliar los indicadores de afiliaciones, retiros, contratos,
  personas, titulares, beneficiarios, mascotas e ingresos.
- Mantener la consulta principal y el resumen de facturación en SAP HANA.
- Mantener la carga histórica, caché persistente y actualización incremental.
- Diagnosticar diferencias entre los datos de Crystal Reports, SAP HANA, la API
  y lo presentado en pantalla.
- Añadir validaciones y documentación relacionadas exclusivamente con Previsión.

No debe modificar reglas de negocio de otros módulos como efecto secundario. Si
una utilidad compartida necesita cambiar, primero debe identificar todos sus
consumidores y comprobar que el cambio sea compatible.

## Mapa del módulo

### Frontend

- `src/pages/PrevisionDashboard.jsx`: orquestación del tablero, carga de datos,
  filtros activos y composición de vistas.
- `src/components/prevision/`: componentes visuales y filtros propios del
  módulo.
- `src/services/previsionApi.js`: cliente para los endpoints de Previsión.
- `src/services/previsionIncomeApi.js`: cliente y caché persistente de la
  interfaz general de Ingresos.
- `src/utils/prevision.js`: filtros, agrupaciones, KPI y resúmenes derivados.
- `src/utils/previsionIncome.js`: filtros y métricas de personas protegidas.
- `src/App.jsx`: registro, navegación y carga diferida del módulo.
- `src/config/accessModules.js`: definición del permiso `prevision`.

### Backend

- `server/index.js`: endpoints HTTP y aplicación de autenticación/permisos.
- `server/previsionSql.js`: consulta principal de contratos y personas.
- `server/previsionRepository.js`: acceso a SAP HANA y caché de resultados.
- `server/previsionBillingSql.js`: consulta agregada de facturación.
- `server/previsionBillingRepository.js`: acceso al resumen de facturación.
- `server/previsionIncomeSql.js`: consulta de contratos, personas y
  facturación vigente para Ingresos.
- `server/previsionIncomeRepository.js`: normalización y caché de Ingresos.
- `server/retirosRepository.js` y archivos relacionados: datos de la vista de
  retiros, protegida por el permiso de Previsión.
- `server/auth.js`: autorización del módulo; no debe debilitarse ni omitirse.

### Configuración

- `.env.example`: variables documentadas del módulo.
- `PREVISION_LIMIT`: límite opcional de filas; `0` significa sin límite.
- `PREVISION_CACHE_TTL_MS`: vigencia de la caché de Previsión.
- `DASHBOARD_CACHE_DIR`: ubicación opcional de la caché persistente.
- Variables `HANA_*`: conexión de servidor a SAP HANA. Nunca deben exponerse al
  frontend, registrarse en consola ni incorporarse al repositorio con valores
  reales.

## Contrato de API

- `GET /api/prevision`
- `GET /api/prevision/facturacion`
- `GET /api/prevision/ingresos`
- `GET /api/retiros`

Los tres endpoints requieren un JWT válido y el permiso `prevision`. Los
parámetros opcionales `from` y `to` usan el formato `YYYY-MM-DD`. El agente debe
conservar la validación de fechas y nunca interpolar entradas arbitrarias en
SQL. El esquema de HANA solo es válido si contiene letras, números o guion bajo.

Los nombres que devuelve HANA se normalizan para el frontend. Antes de renombrar
o eliminar una columna, se debe buscar su consumo en servicios, utilidades,
componentes y gráficos. Los cambios del contrato deben hacerse de extremo a
extremo en una misma tarea.

## Reglas de negocio actuales

- Los contratos incluidos en la consulta principal son contratos activos.
- Cada contrato aporta un titular; las demás filas pueden ser beneficiarios,
  adicionales o mascotas.
- Los códigos `P` y `D` representan mascotas; los parentescos `47` y `48` se
  presentan como perro y gato, respectivamente.
- Una persona se clasifica como `FALLECIDO` si tiene fecha de siniestro,
  `RETIRADO` si tiene fecha de retiro y `ACTIVO` en los demás casos.
- El ingreso mensual del contrato se contabiliza únicamente en la fila del
  titular activo, para evitar duplicarlo por cada beneficiario.
- Los KPI monetarios consideran los tipos `TITULAR`, `ADICIONAL` y `MASCOTA`.
- La facturación real usa asientos manuales (`TransType = 30`) de `OJDT`/`JDT1`,
  seleccionados por la cuenta de clientes Previsión `130505001` y filtrados por
  `OJDT.RefDate`. El total se obtiene de las cuentas puente y de ingresos menos
  las diferencias de facturación, y se valida contra clientes Previsión menos
  seguro/canasta.
- Los rangos de fechas del conjunto principal se aplican sobre la fecha de
  ingreso de cada persona (`U_fecIng`). No se debe cambiar esa semántica sin una
  solicitud de negocio explícita.

Si una solicitud contradice estas reglas o los datos disponibles no permiten
demostrar el resultado, el agente debe explicar la discrepancia y solicitar la
definición funcional necesaria antes de inventar una regla.

## Forma de trabajo

1. Localizar el dato desde SQL hasta su representación visual antes de editar.
2. Mantener separadas las cifras por persona y por contrato para evitar dobles
   conteos.
3. Aplicar filtros de forma coherente a KPI, gráficos, tablas y facturación.
4. Conservar los estados de carga, vacío, error y actualización manual.
5. Evitar consultas adicionales por cada fila; preferir agregaciones en SQL o
   transformaciones lineales en memoria.
6. No alterar secretos, archivos `.env` reales ni datos de producción.
7. Limitar los cambios al objetivo solicitado y preservar cambios locales no
   relacionados.

## Validación mínima

Después de modificar Previsión:

```bash
npm run build
node --check server/previsionSql.js
node --check server/previsionRepository.js
node --check server/previsionBillingSql.js
node --check server/previsionBillingRepository.js
node --check server/previsionIncomeSql.js
node --check server/previsionIncomeRepository.js
```

Además, cuando corresponda:

- Comprobar que una fila por titular no duplique ingresos por beneficiarios.
- Probar filtros sin rango, con una sola fecha y con rango completo.
- Verificar estados sin datos, error de API y respuesta satisfactoria.
- Comparar totales de contratos y personas por separado.
- Validar que un usuario sin permiso `prevision` no acceda a los endpoints.
- Confirmar que Homenajes y los demás módulos siguen compilando y navegando.

No existe actualmente una suite automatizada dedicada a Previsión. Si se añade
una, debe cubrir primero las funciones puras de `src/utils/prevision.js` y la
generación segura de SQL por rango de fechas.

## Criterio de finalización

Una tarea de Previsión queda completa cuando el flujo afectado funciona de
extremo a extremo, la compilación termina correctamente, las cifras mantienen
su unidad de análisis (persona o contrato), no se debilitan autenticación ni
permisos, y se informa cualquier validación que dependa de acceso real a SAP
HANA.

---

# Agente de Homenajes

## Propósito

Estas instrucciones aplican a cualquier agente que trabaje en el módulo de
**Homenajes**. Su objetivo es mantener confiable el análisis de órdenes de
servicio funerario (OSF), su composición, valores y elementos, desde SAP HANA
hasta el tablero, sin alterar las reglas de Previsión ni de otros módulos.

## Alcance funcional

El agente de Homenajes puede:

- Mantener el resumen ejecutivo, la composición del servicio y la tabla de OSF.
- Mantener filtros, KPI, gráficos, tablas y estados de carga del tablero.
- Corregir o ampliar la consulta de cabeceras y elementos funerarios.
- Diagnosticar diferencias entre Crystal Reports, SAP HANA, la API y la
  presentación en pantalla.
- Mantener la caché de Homenajes y la actualización al recuperar conexión o
  volver a la aplicación.

No debe reutilizar reglas de Previsión para calcular Homenajes. Si cambia una
utilidad o componente compartido, debe comprobar todos sus consumidores.

## Mapa del módulo

### Frontend

- `src/pages/HomenajesDashboard.jsx`: carga, filtros, pestañas, KPI y gráficos.
- `src/components/FilterPanel.jsx`: filtros del tablero.
- `src/components/DataTable.jsx`: detalle de órdenes funerarias.
- `src/components/ElementsTable.jsx`: detalle de elementos cubiertos y
  adicionales.
- `src/services/homenajesApi.js`: cliente del endpoint de Homenajes.
- `src/utils/dashboard.js`: filtros, KPI, agrupaciones y formato compartido.
- `src/App.jsx`: navegación, carga diferida y control de acceso al módulo.
- `src/config/accessModules.js`: definición del permiso `homenajes`.

### Backend

- `server/index.js`: endpoint HTTP, autenticación y permiso del módulo.
- `server/homenajesSql.js`: consultas de cabeceras OSF y elementos.
- `server/homenajesRepository.js`: conexión a SAP HANA, normalización y caché.
- `server/auth.js`: autorización; no debe omitirse ni debilitarse.

### Configuración

- `HOMENAJES_CACHE_TTL_MS`: vigencia de la caché en memoria; por defecto cinco
  minutos.
- Variables `HANA_*`: conexión exclusiva del servidor. Nunca deben exponerse en
  el frontend, escribirse en registros ni confirmarse en Git con valores reales.

## Contrato de API

- `GET /api/homenajes`

El endpoint requiere un JWT válido y el permiso `homenajes`. Acepta `from` y
`to` opcionales en formato `YYYY-MM-DD`. La respuesta contiene:

- `rows`: una fila normalizada por OSF.
- `elements`: líneas de elementos asociadas mediante `osf_id` con el `id` de la
  OSF.

Antes de renombrar o eliminar un campo, se debe comprobar su uso en servicios,
filtros, KPI, gráficos y tablas. Cualquier cambio del contrato se implementa de
extremo a extremo.

## Reglas de negocio actuales

- Solo se incluyen documentos cuya serie comienza por `OSF`.
- La fecha funcional del tablero es `U_FechaSol`.
- Cada cabecera representa una orden funeraria y aporta `cantidad: 1`.
- El tipo de homenaje se deriva de `U_TipoSrv`: `4` es `RED`; `2` y `6` son
  `PARTICULAR`; `3` es `REEMBOLSO`; los demás son `PLAN`.
- Los elementos `C` son cubiertos; `A` y `M` son adicionales.
- Una línea marcada como renunciada no se usa y no debe sumar como elemento
  ejecutado.
- `valor_excedente` suma líneas adicionales; `valor_auxilio` suma auxilios y
  `valor_total` combina valor cubierto, excedente y auxilio.
- Los elementos del tablero se filtran por los identificadores de las OSF
  visibles para mantener coherencia con todos los filtros.
- `TIPO_EXCEDENTE` es una descripción resumida de los adicionales de la OSF; el
  detalle completo vive en `elements`.

No se deben mezclar conteos de órdenes, cantidades de elementos y valores
monetarios. Si una solicitud requiere una regla que los datos no permiten
demostrar, el agente debe explicar la diferencia antes de inventar una fórmula.

## Forma de trabajo

1. Seguir cada dato desde `homenajesSql.js`, la normalización del repositorio y
   la API hasta su filtro, indicador o componente visual.
2. Mantener la relación entre cabeceras y elementos mediante `id`/`osf_id`.
3. Aplicar los filtros de forma coherente a KPI, gráficos y ambas tablas.
4. Conservar estados de carga, vacío, error, reconexión y actualización en
   segundo plano.
5. Evitar duplicar el valor de una OSF al agrupar sus elementos.
6. No modificar archivos `.env` reales, secretos ni datos de producción.
7. Mantener los cambios limitados al objetivo solicitado.

## Validación mínima

Después de modificar Homenajes:

```bash
npm run build
node --check server/homenajesSql.js
node --check server/homenajesRepository.js
```

Además, cuando corresponda:

- Verificar filtros sin rango, con una fecha y con un rango completo.
- Confirmar que las OSF no se dupliquen por la unión con sus elementos.
- Comprobar que las líneas renunciadas no sumen como utilizadas.
- Conciliar `valor_total` con cubierto, excedente y auxilio.
- Probar estados sin datos, error de API y respuesta satisfactoria.
- Validar que un usuario sin permiso `homenajes` no acceda al endpoint.
- Confirmar que Previsión y los demás módulos sigan compilando y navegando.

No existe actualmente una suite automatizada dedicada a Homenajes. Si se añade,
debe cubrir primero la clasificación de tipos de homenaje, elementos
renunciados, agregaciones monetarias, filtros y generación segura de SQL.

## Criterio de finalización

Una tarea de Homenajes queda completa cuando el flujo afectado funciona de
extremo a extremo, la compilación termina correctamente, los totales de OSF no
se confunden con cantidades de elementos, los importes conservan su composición,
no se debilitan autenticación ni permisos, y se informa cualquier comprobación
que requiera acceso real a SAP HANA.
