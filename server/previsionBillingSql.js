function quotedSchema() {
  const schema = process.env.HANA_SCHEMA
  if (!/^[A-Za-z0-9_]+$/.test(schema || '')) {
    throw new Error('HANA_SCHEMA solo puede contener letras, numeros y guion bajo.')
  }
  return `"${schema}"`
}

function dateConditions(from, to) {
  const validDate = /^\d{4}-\d{2}-\d{2}$/
  const conditions = []
  if (from && validDate.test(from)) conditions.push(`J."RefDate" >= TO_DATE('${from}')`)
  if (to && validDate.test(to)) conditions.push(`J."RefDate" <= TO_DATE('${to}')`)
  return conditions
}

export function buildPrevisionBillingSql({ from = '', to = '' } = {}) {
  const schema = quotedSchema()
  const dates = dateConditions(from, to)
  const dateClause = dates.length ? `AND ${dates.join('\n    AND ')}` : ''

  return `
WITH TRANS_PREVISION AS (
  SELECT DISTINCT J."TransId"
  FROM ${schema}."OJDT" J
  INNER JOIN ${schema}."JDT1" L ON J."TransId" = L."TransId"
  WHERE J."TransType" = 30
    AND L."Account" = '130505001'
    ${dateClause}
),
MOVIMIENTOS AS (
  SELECT
    L."Account" AS "CUENTA",
    SUM(COALESCE(L."Debit", 0)) AS "DEBITO",
    SUM(COALESCE(L."Credit", 0)) AS "CREDITO"
  FROM TRANS_PREVISION P
  INNER JOIN ${schema}."JDT1" L ON P."TransId" = L."TransId"
  GROUP BY L."Account"
),
RESUMEN AS (
  SELECT
    COALESCE(SUM(CASE WHEN "CUENTA" = '130505001' THEN "DEBITO" - "CREDITO" ELSE 0 END), 0) AS "CLIENTES_PREVISION_NETO",
    COALESCE(SUM(CASE WHEN "CUENTA" = '281505001' THEN "CREDITO" - "DEBITO" ELSE 0 END), 0) AS "SEGURO_CANASTA",
    COALESCE(SUM(CASE WHEN "CUENTA" = '270595302' THEN "CREDITO" - "DEBITO" ELSE 0 END), 0) AS "CUENTA_PUENTE",
    COALESCE(SUM(CASE WHEN "CUENTA" = '417060100' THEN "CREDITO" - "DEBITO" ELSE 0 END), 0) AS "PLAN_EMPRESARIAL",
    COALESCE(SUM(CASE WHEN "CUENTA" = '417060101' THEN "CREDITO" - "DEBITO" ELSE 0 END), 0) AS "PLAN_INDEPENDIENTE",
    COALESCE(SUM(CASE WHEN "CUENTA" = '417501095' THEN "DEBITO" - "CREDITO" ELSE 0 END), 0) AS "DIF_PLANES_EMPRESAS",
    COALESCE(SUM(CASE WHEN "CUENTA" = '417501096' THEN "DEBITO" - "CREDITO" ELSE 0 END), 0) AS "DIF_PLANES_INDEPENDIENTES"
  FROM MOVIMIENTOS
)
SELECT
  "CLIENTES_PREVISION_NETO",
  "SEGURO_CANASTA",
  "CUENTA_PUENTE",
  "PLAN_EMPRESARIAL",
  "PLAN_INDEPENDIENTE",
  "DIF_PLANES_EMPRESAS",
  "DIF_PLANES_INDEPENDIENTES",
  (
    "CUENTA_PUENTE" + "PLAN_EMPRESARIAL" + "PLAN_INDEPENDIENTE"
    - "DIF_PLANES_EMPRESAS" - "DIF_PLANES_INDEPENDIENTES"
  ) AS "TOTAL_FACTURADO",
  ("CLIENTES_PREVISION_NETO" - "SEGURO_CANASTA") AS "TOTAL_VALIDACION",
  (
    "CUENTA_PUENTE" + "PLAN_EMPRESARIAL" + "PLAN_INDEPENDIENTE"
    - "DIF_PLANES_EMPRESAS" - "DIF_PLANES_INDEPENDIENTES"
    - ("CLIENTES_PREVISION_NETO" - "SEGURO_CANASTA")
  ) AS "DIFERENCIA_VALIDACION",
  (SELECT COUNT(*) FROM TRANS_PREVISION) AS "ASIENTOS_CONTABLES"
FROM RESUMEN
`
}
