function quotedSchema() {
  const schema = process.env.HANA_SCHEMA
  if (!/^[A-Za-z0-9_]+$/.test(schema || '')) throw new Error('HANA_SCHEMA solo puede contener letras, numeros y guion bajo.')
  return `"${schema}"`
}

function dateConditions(from, to) {
  const validDate = /^\d{4}-\d{2}-\d{2}$/
  if ((from && !validDate.test(from)) || (to && !validDate.test(to))) {
    throw new Error('Las fechas de Retiros deben usar el formato YYYY-MM-DD.')
  }
  if (from && to && from > to) throw new Error('La fecha inicial de Retiros no puede ser posterior a la fecha final.')
  const conditions = []
  if (from && validDate.test(from)) conditions.push(`R."FECHA_RETIRO" >= TO_DATE('${from}')`)
  if (to && validDate.test(to)) conditions.push(`R."FECHA_RETIRO" <= TO_DATE('${to}')`)
  return conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
}

export function buildRetirosSql({ from = '', to = '' } = {}) {
  const schema = quotedSchema()
  const dates = dateConditions(from, to)
  return `
WITH NOVEDADES AS (
  SELECT "DocEntry", MAX("U_fecha") AS "FECHA_NOVEDAD"
  FROM ${schema}."@OK1_EXE_COMEN_CONTR"
  WHERE UPPER(TRIM(IFNULL("U_estNovedad", ''))) LIKE 'CANCX%'
  GROUP BY "DocEntry"
), TITULAR AS (
  SELECT * FROM (
    SELECT B.*, ROW_NUMBER() OVER (PARTITION BY B."DocEntry" ORDER BY B."LineId") AS RN
    FROM ${schema}."@OK1_EXE_CONT_BENEFI" B
    WHERE TRIM(IFNULL(B."U_parent", '')) = '0'
  ) WHERE RN = 1
), RETIROS AS (
  SELECT
    H."DocEntry" AS "CONTRATO", TIT."LineId" AS "LINEA", 'T' AS "CODIGO_TIPO", 'CONTRATO' AS "TIPO_REGISTRO", 'TITULAR' AS "TIPO_RETIRO",
    CASE WHEN TRIM(IFNULL(C."U_uen", '')) = 'UEN1' THEN 'EMPRESARIALES' WHEN TRIM(IFNULL(C."U_uen", '')) = 'UEN2' THEN 'INDEPENDIENTES' ELSE 'SIN CLASIFICAR' END AS "CANAL",
    COALESCE(NULLIF(TRIM(H."U_ncontrat"), ''), 'SIN NOMBRE') AS "NOMBRE",
    COALESCE(NULLIF(TRIM(TIT."U_numdoc"), ''), H."U_contrant") AS "DOCUMENTO",
    COALESCE(NULLIF(TRIM(H."U_nompla"), ''), H."U_plan", 'SIN PLAN') AS "PLAN",
    COALESCE(NULLIF(TRIM(H."U_nomVnd"), ''), 'SIN ASESOR') AS "ASESOR",
    COALESCE(NULLIF(TRIM(H."U_sucur"), ''), 'SIN SEDE') AS "SEDE",
    COALESCE(NULLIF(TRIM(C."U_nconv"), ''), 'SIN ENTIDAD') AS "ENTIDAD",
    COALESCE(NULLIF(TRIM(S."Name"), ''), 'SIN SUBUEN') AS "SUBUEN",
    CASE WHEN UPPER(TRIM(IFNULL(H."U_estado", ''))) = 'CANCXMORA' THEN 'CANCELADO POR MORA' ELSE COALESCE(E."Name", H."U_estado", 'SIN ESTADO') END AS "ESTADO_CONTRATO",
    TIT."U_fecIng" AS "FECHA_INGRESO", COALESCE(TIT."U_fecRet", N."FECHA_NOVEDAD") AS "FECHA_RETIRO"
  FROM ${schema}."@OK1_EXE_CONTR_HEAD" H
  INNER JOIN TITULAR TIT ON TIT."DocEntry" = H."DocEntry"
  LEFT JOIN NOVEDADES N ON N."DocEntry" = H."DocEntry"
  LEFT JOIN ${schema}."@OK1_EXE_CONV_HEAD" C ON C."DocEntry" = H."U_conve"
  LEFT JOIN ${schema}."@OK1_EXE_SUBUEN" S ON S."Code" = C."U_suen"
  LEFT JOIN ${schema}."@OK1_EXE_ESTADOCONTR" E ON E."Code" = H."U_estado"
  WHERE UPPER(TRIM(IFNULL(H."U_estado", ''))) LIKE 'CANCX%'
    AND COALESCE(TIT."U_fecRet", N."FECHA_NOVEDAD") IS NOT NULL
  UNION ALL
  SELECT
    H."DocEntry", B."LineId", UPPER(TRIM(IFNULL(B."U_tdbenef", ''))),
    CASE WHEN UPPER(TRIM(IFNULL(B."U_tdbenef", ''))) IN ('A','M') THEN 'ADICIONAL' ELSE 'MASCOTA' END,
    CASE UPPER(TRIM(IFNULL(B."U_tdbenef", ''))) WHEN 'A' THEN 'ADICIONAL MAYOR' WHEN 'M' THEN 'ADICIONAL MENOR' WHEN 'P' THEN 'MASCOTA' WHEN 'D' THEN 'MASCOTA ADICIONAL' ELSE 'BENEFICIARIO' END,
    CASE WHEN UPPER(TRIM(IFNULL(B."U_tdbenef", ''))) IN ('A','M') THEN 'ADICIONALES' ELSE 'MASCOTAS' END,
    COALESCE(NULLIF(TRIM(IFNULL(B."U_pape", '') || ' ' || IFNULL(B."U_sape", '') || ' ' || IFNULL(B."U_nombre", '') || ' ' || IFNULL(B."U_snombre", '')), ''), 'SIN NOMBRE'),
    COALESCE(NULLIF(TRIM(B."U_numdoc"), ''), 'SIN DOCUMENTO'),
    COALESCE(NULLIF(TRIM(H."U_nompla"), ''), H."U_plan", 'SIN PLAN'), COALESCE(NULLIF(TRIM(H."U_nomVnd"), ''), 'SIN ASESOR'), COALESCE(NULLIF(TRIM(H."U_sucur"), ''), 'SIN SEDE'),
    COALESCE(NULLIF(TRIM(C."U_nconv"), ''), 'SIN ENTIDAD'), COALESCE(NULLIF(TRIM(S."Name"), ''), 'SIN SUBUEN'),
    CASE WHEN UPPER(TRIM(IFNULL(H."U_estado", ''))) = 'CANCXMORA' THEN 'CANCELADO POR MORA' ELSE COALESCE(E."Name", H."U_estado", 'SIN ESTADO') END,
    B."U_fecIng", CASE WHEN UPPER(TRIM(IFNULL(H."U_estado", ''))) LIKE 'CANCX%' THEN COALESCE(B."U_fecRet", N."FECHA_NOVEDAD") ELSE B."U_fecRet" END
  FROM ${schema}."@OK1_EXE_CONTR_HEAD" H
  INNER JOIN ${schema}."@OK1_EXE_CONT_BENEFI" B ON B."DocEntry" = H."DocEntry"
  LEFT JOIN NOVEDADES N ON N."DocEntry" = H."DocEntry"
  LEFT JOIN ${schema}."@OK1_EXE_CONV_HEAD" C ON C."DocEntry" = H."U_conve"
  LEFT JOIN ${schema}."@OK1_EXE_SUBUEN" S ON S."Code" = C."U_suen"
  LEFT JOIN ${schema}."@OK1_EXE_ESTADOCONTR" E ON E."Code" = H."U_estado"
  WHERE UPPER(TRIM(IFNULL(B."U_tdbenef", ''))) IN ('A','M','P','D')
    AND (
      UPPER(TRIM(IFNULL(H."U_estado", ''))) LIKE 'CANCX%'
      OR UPPER(TRIM(COALESCE(E."Name", H."U_estado", ''))) IN ('ACT', 'ACTIVO')
    )
    AND (CASE WHEN UPPER(TRIM(IFNULL(H."U_estado", ''))) LIKE 'CANCX%' THEN COALESCE(B."U_fecRet", N."FECHA_NOVEDAD") ELSE B."U_fecRet" END) IS NOT NULL
)
SELECT R.*, TO_VARCHAR(R."FECHA_RETIRO", 'YYYY-MM-DD') AS "FECHA", 
  CASE WHEN R."FECHA_INGRESO" IS NULL THEN NULL ELSE GREATEST(0, CAST(FLOOR(MONTHS_BETWEEN(R."FECHA_INGRESO", R."FECHA_RETIRO")) AS INTEGER)) END AS "MESES_VIGENCIA"
FROM RETIROS R
${dates}
ORDER BY R."FECHA_RETIRO" DESC, R."CONTRATO" DESC, R."LINEA"
`
}
