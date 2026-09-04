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
  if (from && validDate.test(from)) conditions.push(`F."U_RefDate" >= TO_DATE('${from}')`)
  if (to && validDate.test(to)) conditions.push(`F."U_RefDate" <= TO_DATE('${to}')`)
  return conditions
}

export function buildPrevisionBillingSql({ from = '', to = '' } = {}) {
  const conditions = [
    `COALESCE(F."Canceled", 'N') <> 'Y'`,
    ...dateConditions(from, to),
  ]

  return `
SELECT
  COALESCE(SUM(COALESCE(F."U_LocTotal", 0)), 0) AS "TOTAL_FACTURADO",
  COUNT(DISTINCT F."U_contra") AS "CONTRATOS_FACTURADOS",
  MIN(F."U_RefDate") AS "PRIMERA_FECHA",
  MAX(F."U_RefDate") AS "ULTIMA_FECHA"
FROM ${quotedSchema()}."@OK1_EXE_FACT_OJDT" F
WHERE ${conditions.join('\n  AND ')}
`
}
