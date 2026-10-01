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
  SELECT "DocEntry", COALESCE("U_fecNov", "U_fecha") AS "FECHA_NOVEDAD", "U_fecha" AS "FECHA_REGISTRO_NOVEDAD", UPPER(TRIM("U_estNovedad")) AS "CODIGO_CAUSAL", "U_coment" AS "DETALLE_NOVEDAD"
  FROM (
    SELECT C.*, ROW_NUMBER() OVER (PARTITION BY C."DocEntry" ORDER BY COALESCE(C."U_fecNov", C."U_fecha") DESC, C."U_fecha" DESC, C."LineId" DESC) AS RN
    FROM ${schema}."@OK1_EXE_COMEN_CONTR" C
    WHERE UPPER(TRIM(IFNULL(C."U_estNovedad", ''))) LIKE 'CANCX%'
  ) WHERE RN = 1
), TITULAR AS (
  SELECT * FROM (
    SELECT B.*, ROW_NUMBER() OVER (PARTITION BY B."DocEntry" ORDER BY B."LineId") AS RN
    FROM ${schema}."@OK1_EXE_CONT_BENEFI" B
    WHERE TRIM(IFNULL(B."U_parent", '')) = '0'
  ) WHERE RN = 1
), CANCELACIONES AS (
  SELECT H."DocEntry", H."U_contrant" AS "CONTRATANTE", TIT."U_numdoc" AS "DOCUMENTO_PRINCIPAL", TIT."U_fecIng" AS "FECHA_INGRESO", COALESCE(TIT."U_fecRet", N."FECHA_NOVEDAD") AS "FECHA_RETIRO"
  FROM ${schema}."@OK1_EXE_CONTR_HEAD" H
  INNER JOIN TITULAR TIT ON TIT."DocEntry" = H."DocEntry"
  LEFT JOIN NOVEDADES N ON N."DocEntry" = H."DocEntry"
  WHERE UPPER(TRIM(IFNULL(H."U_estado", ''))) LIKE 'CANCX%'
), RETIROS AS (
  SELECT
    H."DocEntry" AS "CONTRATO", TIT."LineId" AS "LINEA", 'T' AS "CODIGO_TIPO", 'CONTRATO' AS "TIPO_REGISTRO", 'TITULAR' AS "TIPO_RETIRO",
    CASE WHEN TRIM(IFNULL(C."U_uen", '')) = 'UEN1' THEN 'EMPRESARIALES' WHEN TRIM(IFNULL(C."U_uen", '')) = 'UEN2' THEN 'INDEPENDIENTES' ELSE 'SIN CLASIFICAR' END AS "CANAL",
    COALESCE(NULLIF(TRIM(H."U_ncontrat"), ''), 'SIN NOMBRE') AS "NOMBRE",
    COALESCE(NULLIF(TRIM(IFNULL(TIT."U_pape", '') || ' ' || IFNULL(TIT."U_sape", '') || ' ' || IFNULL(TIT."U_nombre", '') || ' ' || IFNULL(TIT."U_snombre", '')), ''), NULLIF(TRIM(H."U_ncontrat"), ''), 'SIN ASEGURADO PRINCIPAL') AS "ASEGURADO_PRINCIPAL",
    COALESCE(NULLIF(TRIM(TIT."U_numdoc"), ''), H."U_contrant") AS "DOCUMENTO",
    COALESCE(NULLIF(TRIM(TIT."U_numdoc"), ''), H."U_contrant", '') AS "CEDULA_ASEGURADO_PRINCIPAL",
    CASE WHEN NULLIF(TRIM(TIT."U_numdoc"), '') IS NULL OR TRIM(H."U_contrant") = TRIM(TIT."U_numdoc") THEN 'ASEGURADO PRINCIPAL' ELSE 'PAGADOR' END AS "TIPO_CONTRATANTE",
    CASE WHEN NULLIF(TRIM(TIT."U_numdoc"), '') IS NOT NULL AND TRIM(H."U_contrant") <> TRIM(TIT."U_numdoc") THEN COALESCE(BP."Phone1", '') ELSE COALESCE(NULLIF(TRIM(TC."U_tel"), ''), BP."Phone1", '') END AS "TELEFONO_1",
    COALESCE(BP."Phone2", '') AS "TELEFONO_2",
    CASE WHEN NULLIF(TRIM(TIT."U_numdoc"), '') IS NOT NULL AND TRIM(H."U_contrant") <> TRIM(TIT."U_numdoc") THEN COALESCE(BP."Cellular", '') ELSE COALESCE(NULLIF(TRIM(TC."U_cel"), ''), BP."Cellular", '') END AS "CELULAR",
    CASE WHEN NULLIF(TRIM(TIT."U_numdoc"), '') IS NOT NULL AND TRIM(H."U_contrant") <> TRIM(TIT."U_numdoc") THEN COALESCE(BP."E_Mail", '') ELSE COALESCE(NULLIF(TRIM(TC."U_email"), ''), BP."E_Mail", '') END AS "CORREO",
    CASE WHEN NULLIF(TRIM(TIT."U_numdoc"), '') IS NOT NULL AND TRIM(H."U_contrant") <> TRIM(TIT."U_numdoc") THEN COALESCE(BP."Address", '') ELSE COALESCE(NULLIF(TRIM(IFNULL(TC."U_dir2", '') || ' ' || IFNULL(TC."U_dir3", '') || ' ' || IFNULL(TC."U_dir5", '')), ''), BP."Address", '') END AS "DIRECCION",
    (SELECT COUNT(*) FROM CANCELACIONES X WHERE X."CONTRATANTE" = H."U_contrant" AND (TIT."U_fecIng" IS NULL OR X."FECHA_RETIRO" >= TIT."U_fecIng") AND X."FECHA_RETIRO" <= COALESCE(TIT."U_fecRet", N."FECHA_NOVEDAD")) AS "RETIROS_CONTRATANTE",
    (SELECT COUNT(DISTINCT X."DocEntry") FROM CANCELACIONES X WHERE NULLIF(TRIM(TIT."U_numdoc"), '') IS NOT NULL AND TRIM(X."DOCUMENTO_PRINCIPAL") = TRIM(TIT."U_numdoc") AND (TIT."U_fecIng" IS NULL OR X."FECHA_RETIRO" >= TIT."U_fecIng") AND X."FECHA_RETIRO" <= COALESCE(TIT."U_fecRet", N."FECHA_NOVEDAD")) AS "RETIROS_ASEGURADO_PRINCIPAL",
    COALESCE(H."U_plan", '') AS "CODIGO_PLAN", COALESCE(NULLIF(TRIM(H."U_nompla"), ''), H."U_plan", 'SIN PLAN') AS "PLAN",
    COALESCE(NULLIF(TRIM(H."U_nomVnd"), ''), 'SIN ASESOR') AS "ASESOR",
    COALESCE(NULLIF(TRIM(H."U_sucur"), ''), 'SIN SEDE') AS "SEDE",
    COALESCE(NULLIF(TRIM(C."U_nconv"), ''), 'SIN ENTIDAD') AS "ENTIDAD",
    COALESCE(NULLIF(TRIM(C."U_empNom"), ''), NULLIF(TRIM(C."U_nconv"), ''), 'SIN ENTIDAD') AS "NOMBRE_ENTIDAD",
    COALESCE(C."U_nconv", '') AS "NUMERO_CONVENIO",
    COALESCE(NULLIF(TRIM(S."Name"), ''), 'SIN SUBUEN') AS "SUBUEN",
    'NO APLICA' AS "ESPECIE_MASCOTA",
    COALESCE(C."U_munMM", '') AS "CODIGO_MUNICIPIO",
    COALESCE(NULLIF(TRIM(MUN."U_Municip"), ''), 'SIN MUNICIPIO') AS "MUNICIPIO",
    COALESCE(H."U_valor", 0) AS "VALOR_ASOCIADO",
    'VALOR MENSUAL DEL CONTRATO' AS "TIPO_VALOR",
    1 AS "APLICA_VALOR",
    CASE WHEN UPPER(TRIM(IFNULL(H."U_estado", ''))) = 'CANCXMORA' THEN 'CANCELADO POR MORA' ELSE COALESCE(E."Name", H."U_estado", 'SIN ESTADO') END AS "ESTADO_CONTRATO",
    COALESCE(NULLIF(TRIM(EC."Name"), ''), NULLIF(TRIM(N."CODIGO_CAUSAL"), ''), 'SIN CAUSAL IDENTIFICADA') AS "CAUSAL_RETIRO",
    COALESCE(N."CODIGO_CAUSAL", '') AS "CODIGO_CAUSAL",
    COALESCE(N."DETALLE_NOVEDAD", '') AS "DETALLE_CAUSAL",
    N."FECHA_NOVEDAD" AS "FECHA_NOVEDAD", N."FECHA_REGISTRO_NOVEDAD" AS "FECHA_REGISTRO_NOVEDAD",
    TIT."U_fecIng" AS "FECHA_INGRESO", COALESCE(TIT."U_fecRet", N."FECHA_NOVEDAD") AS "FECHA_RETIRO"
  FROM ${schema}."@OK1_EXE_CONTR_HEAD" H
  INNER JOIN TITULAR TIT ON TIT."DocEntry" = H."DocEntry"
  LEFT JOIN NOVEDADES N ON N."DocEntry" = H."DocEntry"
  LEFT JOIN ${schema}."@OK1_EXE_CONV_HEAD" C ON C."DocEntry" = H."U_conve"
  LEFT JOIN ${schema}."@OK1_EXE_SUBUEN" S ON S."Code" = C."U_suen"
  LEFT JOIN ${schema}."@OK1_EXE_MUN" MUN ON TRIM(MUN."U_codMun") = TRIM(C."U_munMM")
  LEFT JOIN ${schema}."@OK1_EXE_ESTADOCONTR" E ON E."Code" = H."U_estado"
  LEFT JOIN ${schema}."@OK1_EXE_ESTADOCONTR" EC ON EC."Code" = N."CODIGO_CAUSAL"
  LEFT JOIN ${schema}."OCRD" BP ON BP."CardCode" = H."U_contrant"
  LEFT JOIN ${schema}."@OK1_EXE_TITUBENF" TC ON TC."Code" = TIT."U_numdoc"
  WHERE UPPER(TRIM(IFNULL(H."U_estado", ''))) LIKE 'CANCX%'
    AND COALESCE(TIT."U_fecRet", N."FECHA_NOVEDAD") IS NOT NULL
  UNION ALL
  SELECT
    H."DocEntry", B."LineId", UPPER(TRIM(IFNULL(B."U_tdbenef", ''))),
    CASE WHEN UPPER(TRIM(IFNULL(B."U_tdbenef", ''))) IN ('A','M') THEN 'ADICIONAL' ELSE 'MASCOTA' END,
    CASE UPPER(TRIM(IFNULL(B."U_tdbenef", ''))) WHEN 'A' THEN 'ADICIONAL MAYOR' WHEN 'M' THEN 'ADICIONAL MENOR' WHEN 'P' THEN 'MASCOTA' WHEN 'D' THEN 'MASCOTA ADICIONAL' ELSE 'BENEFICIARIO' END,
    CASE WHEN UPPER(TRIM(IFNULL(B."U_tdbenef", ''))) IN ('A','M') THEN 'ADICIONALES PERSONAS' ELSE 'ADICIONALES MASCOTAS' END,
    COALESCE(NULLIF(TRIM(IFNULL(B."U_pape", '') || ' ' || IFNULL(B."U_sape", '') || ' ' || IFNULL(B."U_nombre", '') || ' ' || IFNULL(B."U_snombre", '')), ''), 'SIN NOMBRE'),
    COALESCE(NULLIF(TRIM(IFNULL(TIT."U_pape", '') || ' ' || IFNULL(TIT."U_sape", '') || ' ' || IFNULL(TIT."U_nombre", '') || ' ' || IFNULL(TIT."U_snombre", '')), ''), NULLIF(TRIM(H."U_ncontrat"), ''), 'SIN ASEGURADO PRINCIPAL'),
    COALESCE(NULLIF(TRIM(B."U_numdoc"), ''), 'SIN DOCUMENTO'),
    COALESCE(NULLIF(TRIM(TIT."U_numdoc"), ''), H."U_contrant", ''),
    CASE UPPER(TRIM(IFNULL(B."U_tdbenef", ''))) WHEN 'A' THEN 'ADICIONAL MAYOR' WHEN 'M' THEN 'ADICIONAL MENOR' WHEN 'P' THEN 'MASCOTA' WHEN 'D' THEN 'MASCOTA ADICIONAL' ELSE 'SIN CLASIFICAR' END,
    COALESCE(BC."U_tel", ''), '', COALESCE(BC."U_cel", ''), COALESCE(BC."U_email", ''), COALESCE(NULLIF(TRIM(IFNULL(BC."U_dir2", '') || ' ' || IFNULL(BC."U_dir3", '') || ' ' || IFNULL(BC."U_dir5", '')), ''), ''),
    NULL, NULL,
    COALESCE(H."U_plan", ''), COALESCE(NULLIF(TRIM(H."U_nompla"), ''), H."U_plan", 'SIN PLAN'), COALESCE(NULLIF(TRIM(H."U_nomVnd"), ''), 'SIN ASESOR'), COALESCE(NULLIF(TRIM(H."U_sucur"), ''), 'SIN SEDE'),
    COALESCE(NULLIF(TRIM(C."U_nconv"), ''), 'SIN ENTIDAD'), COALESCE(NULLIF(TRIM(C."U_empNom"), ''), NULLIF(TRIM(C."U_nconv"), ''), 'SIN ENTIDAD'), COALESCE(C."U_nconv", ''), COALESCE(NULLIF(TRIM(S."Name"), ''), 'SIN SUBUEN'),
    CASE WHEN UPPER(TRIM(IFNULL(B."U_tdbenef", ''))) IN ('P','D') AND TRIM(IFNULL(B."U_parent", '')) = '47' THEN 'PERRO' WHEN UPPER(TRIM(IFNULL(B."U_tdbenef", ''))) IN ('P','D') AND TRIM(IFNULL(B."U_parent", '')) = '48' THEN 'GATO' WHEN UPPER(TRIM(IFNULL(B."U_tdbenef", ''))) IN ('P','D') THEN 'SIN ESPECIE IDENTIFICADA' ELSE 'NO APLICA' END,
    COALESCE(C."U_munMM", ''), COALESCE(NULLIF(TRIM(MUN."U_Municip"), ''), 'SIN MUNICIPIO'),
    CASE WHEN UPPER(TRIM(IFNULL(H."U_estado", ''))) LIKE 'CANCX%' THEN 0 ELSE COALESCE(B."U_valor", 0) END,
    CASE WHEN UPPER(TRIM(IFNULL(H."U_estado", ''))) LIKE 'CANCX%' THEN 'INCLUIDO EN VALOR MENSUAL DEL CONTRATO' ELSE 'VALOR MENSUAL INDIVIDUAL' END,
    CASE WHEN UPPER(TRIM(IFNULL(H."U_estado", ''))) LIKE 'CANCX%' THEN 0 ELSE 1 END,
    CASE WHEN UPPER(TRIM(IFNULL(H."U_estado", ''))) = 'CANCXMORA' THEN 'CANCELADO POR MORA' ELSE COALESCE(E."Name", H."U_estado", 'SIN ESTADO') END,
    CASE WHEN UPPER(TRIM(IFNULL(H."U_estado", ''))) LIKE 'CANCX%' THEN COALESCE(NULLIF(TRIM(EC."Name"), ''), NULLIF(TRIM(N."CODIGO_CAUSAL"), ''), 'SIN CAUSAL IDENTIFICADA') ELSE 'SIN CAUSAL IDENTIFICADA' END,
    CASE WHEN UPPER(TRIM(IFNULL(H."U_estado", ''))) LIKE 'CANCX%' THEN COALESCE(N."CODIGO_CAUSAL", '') ELSE '' END,
    CASE WHEN UPPER(TRIM(IFNULL(H."U_estado", ''))) LIKE 'CANCX%' THEN COALESCE(N."DETALLE_NOVEDAD", '') ELSE '' END,
    CASE WHEN UPPER(TRIM(IFNULL(H."U_estado", ''))) LIKE 'CANCX%' THEN N."FECHA_NOVEDAD" ELSE NULL END,
    CASE WHEN UPPER(TRIM(IFNULL(H."U_estado", ''))) LIKE 'CANCX%' THEN N."FECHA_REGISTRO_NOVEDAD" ELSE NULL END,
    B."U_fecIng", CASE WHEN UPPER(TRIM(IFNULL(H."U_estado", ''))) LIKE 'CANCX%' THEN COALESCE(B."U_fecRet", N."FECHA_NOVEDAD") ELSE B."U_fecRet" END
  FROM ${schema}."@OK1_EXE_CONTR_HEAD" H
  INNER JOIN ${schema}."@OK1_EXE_CONT_BENEFI" B ON B."DocEntry" = H."DocEntry"
  INNER JOIN TITULAR TIT ON TIT."DocEntry" = H."DocEntry"
  LEFT JOIN NOVEDADES N ON N."DocEntry" = H."DocEntry"
  LEFT JOIN ${schema}."@OK1_EXE_CONV_HEAD" C ON C."DocEntry" = H."U_conve"
  LEFT JOIN ${schema}."@OK1_EXE_SUBUEN" S ON S."Code" = C."U_suen"
  LEFT JOIN ${schema}."@OK1_EXE_MUN" MUN ON TRIM(MUN."U_codMun") = TRIM(C."U_munMM")
  LEFT JOIN ${schema}."@OK1_EXE_ESTADOCONTR" E ON E."Code" = H."U_estado"
  LEFT JOIN ${schema}."@OK1_EXE_ESTADOCONTR" EC ON EC."Code" = N."CODIGO_CAUSAL"
  LEFT JOIN ${schema}."@OK1_EXE_TITUBENF" BC ON BC."Code" = B."U_numdoc"
  WHERE UPPER(TRIM(IFNULL(B."U_tdbenef", ''))) IN ('A','M','P','D')
    AND (
      UPPER(TRIM(IFNULL(H."U_estado", ''))) LIKE 'CANCX%'
      OR UPPER(TRIM(COALESCE(E."Name", H."U_estado", ''))) IN ('ACT', 'ACTIVO')
    )
    AND (CASE WHEN UPPER(TRIM(IFNULL(H."U_estado", ''))) LIKE 'CANCX%' THEN COALESCE(B."U_fecRet", N."FECHA_NOVEDAD") ELSE B."U_fecRet" END) IS NOT NULL
)
SELECT R.*, TO_VARCHAR(R."FECHA_RETIRO", 'YYYY-MM-DD') AS "FECHA",
  CASE WHEN R."FECHA_INGRESO" IS NULL OR R."FECHA_RETIRO" IS NULL THEN NULL ELSE DAYS_BETWEEN(R."FECHA_INGRESO", R."FECHA_RETIRO") END AS "DIAS_PERMANENCIA",
  CASE WHEN R."FECHA_INGRESO" IS NULL THEN NULL ELSE GREATEST(0, CAST(FLOOR(MONTHS_BETWEEN(R."FECHA_INGRESO", R."FECHA_RETIRO")) AS INTEGER)) END AS "MESES_VIGENCIA"
FROM RETIROS R
${dates}
ORDER BY R."FECHA_RETIRO" DESC, R."CONTRATO" DESC, R."LINEA"
`
}
