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
  if (from && validDate.test(from)) conditions.push(`TO_DATE(T0."U_FechaSol") >= TO_DATE('${from}')`)
  if (to && validDate.test(to)) conditions.push(`TO_DATE(T0."U_FechaSol") <= TO_DATE('${to}')`)
  return conditions.length ? `AND ${conditions.join(' AND ')}` : ''
}

export function buildHomenajesSql({ from = '', to = '' } = {}) {
  const schema = quotedSchema()
  const dates = dateConditions(from, to)

  return `
SELECT
  T0."DocEntry" AS "ID",
  T0."DocNum" AS "OSF",
  TO_VARCHAR(T0."U_FechaSol", 'YYYY-MM-DD') AS "FECHA",
  COALESCE(NULLIF(TRIM(T0."U_VSedeNom"), ''), 'SIN SEDE') AS "SEDE",
  COALESCE(NULLIF(TRIM(T0."U_NomEncSr"), ''), 'SIN ENCARGADO') AS "ENCARGADO",
  COALESCE(NULLIF(TRIM(T0."U_NombreFa"), ''), 'SIN NOMBRE') AS "FALLECIDO",
  COALESCE(NULLIF(UPPER(TRIM(T4."Name")), ''), 'SIN DEFINIR') AS "TIPO_SERVICIO",
  CASE
    WHEN T0."U_TipoSrv" = '4' THEN 'RED'
    WHEN T0."U_TipoSrv" IN ('2', '6') THEN 'PARTICULAR'
    WHEN T0."U_TipoSrv" = '3' THEN 'REEMBOLSO'
    ELSE 'PLAN'
  END AS "TIPO_HOMENAJE",
  COALESCE(NULLIF(UPPER(TRIM(T6."Name")), ''), 'SIN ESTADO') AS "ESTADO",
  COALESCE(NULLIF(TRIM(T0."U_Plan"), ''), 'SIN PLAN') AS "PLAN",
  COALESCE(NULLIF(UPPER(TRIM(T0."U_nCiudadFa")), ''), 'SIN MUNICIPIO') AS "MUNICIPIO",
  COALESCE(NULLIF(UPPER(TRIM(T25."Name")), ''), NULLIF(UPPER(TRIM(T0."U_nVLugar")), ''), 'SIN DEFINIR') AS "LUGAR_FALLECIMIENTO",
  COALESCE(NULLIF(UPPER(TRIM(T2."Name")), ''), 'SIN DEFINIR') AS "TIPO_MUERTE",
  COALESCE(NULLIF(UPPER(TRIM(T0."U_nILugar")), ''), 'SIN DEFINIR') AS "DESTINO_FINAL",
  COALESCE(NULLIF(UPPER(TRIM(T0."U_nmunVel")), ''), 'SIN DEFINIR') AS "MUNICIPIO_VELACION",
  COALESCE(NULLIF(TRIM(T0."U_VLugar"), ''), NULLIF(TRIM(T0."U_nVLugar"), ''), 'SIN DEFINIR') AS "LUGAR_VELACION",
  IFNULL(T0."U_TotalCubierto", 0) AS "VALOR_CUBIERTO",
  IFNULL(E."VALOR_ADICIONAL", 0) AS "VALOR_EXCEDENTE",
  IFNULL(E."VALOR_AUXILIO", 0) AS "VALOR_AUXILIO",
  IFNULL(T0."U_TotalCubierto", 0) + IFNULL(E."VALOR_ADICIONAL", 0) + IFNULL(E."VALOR_AUXILIO", 0) AS "VALOR_TOTAL",
  IFNULL(E."CUBIERTOS", 0) AS "CUBIERTOS",
  IFNULL(E."ADICIONALES", 0) AS "ADICIONALES",
  COALESCE(NULLIF(E."TIPO_EXCEDENTE", ''), 'SIN EXCEDENTE') AS "TIPO_EXCEDENTE"
FROM ${schema}."@OK1_SF_LLAMADA_HEAD" T0
INNER JOIN ${schema}."NNM1" N
  ON N."Series" = T0."Series"
 AND N."ObjectCode" = 'OK1_SF_LLAMADA'
LEFT JOIN ${schema}."@OK1_SF_TIPOSERVICIO" T4 ON T4."Code" = T0."U_TipoSrv"
LEFT JOIN ${schema}."@OK1_SF_ESTLLAMADA" T6 ON T6."Code" = T0."U_Estado"
LEFT JOIN ${schema}."@OK1_SF_CAUSAFALL" T2 ON T2."Code" = T0."U_CausaFal"
LEFT JOIN ${schema}."@OK1_SF_ORIGCUERPO" T25 ON T25."Code" = T0."U_UbicLoc"
LEFT JOIN (
  SELECT
    L."DocEntry",
    SUM(CASE WHEN L."U_ArtAdMe" = 'C' THEN 1 ELSE 0 END) AS "CUBIERTOS",
    SUM(CASE WHEN L."U_ArtAdMe" IN ('A','M') THEN 1 ELSE 0 END) AS "ADICIONALES",
    SUM(CASE WHEN L."U_ArtAdMe" IN ('A','M') THEN IFNULL(L."U_totalLinea", 0) ELSE 0 END) AS "VALOR_ADICIONAL",
    SUM(IFNULL(L."U_VlrAux", 0)) AS "VALOR_AUXILIO",
    MAX(CASE WHEN L."U_ArtAdMe" IN ('A','M') THEN UPPER(TRIM(L."U_ItemName")) END) AS "TIPO_EXCEDENTE"
  FROM ${schema}."@OK1_SF_ELEM_LIN" L
  WHERE UPPER(TRIM(IFNULL(L."U_Renuncia", 'N'))) NOT IN ('Y','S','SI','YES','1','TRUE')
    AND NULLIF(TRIM(L."U_ItemName"), '') IS NOT NULL
  GROUP BY L."DocEntry"
) E ON E."DocEntry" = T0."DocEntry"
WHERE N."SeriesName" LIKE 'OSF%'
  ${dates}
ORDER BY T0."U_FechaSol" DESC, T0."DocEntry" DESC
`
}

export function buildHomenajeElementsSql({ from = '', to = '' } = {}) {
  const schema = quotedSchema()
  const dates = dateConditions(from, to)

  return `
SELECT
  L."DocEntry" AS "OSF_ID",
  L."LineId" AS "LINEA",
  CASE WHEN L."U_ArtAdMe" = 'C' THEN 'CUBIERTO' ELSE 'ADICIONAL' END AS "CLASIFICACION",
  COALESCE(NULLIF(UPPER(TRIM(L."U_Nombre")), ''), NULLIF(UPPER(TRIM(L."U_ItemName")), ''), 'SIN NOMBRE') AS "CATEGORIA",
  CASE
    WHEN UPPER(TRIM(IFNULL(L."U_Nombre", ''))) IN ('COFRE','DILIGENCIAS_LEGALES','DILIGENCIAS LEGALES')
    THEN COALESCE(NULLIF(UPPER(TRIM(L."U_ItemName")), ''), UPPER(TRIM(L."U_Nombre")))
    ELSE COALESCE(NULLIF(UPPER(TRIM(L."U_Nombre")), ''), UPPER(TRIM(L."U_ItemName")))
  END AS "ELEMENTO",
  IFNULL(L."U_Cant", 0) AS "CANTIDAD",
  IFNULL(L."U_Valor", 0) AS "VALOR_UNITARIO",
  IFNULL(L."U_totalLinea", 0) AS "VALOR_TOTAL",
  IFNULL(L."U_VlrAux", 0) AS "VALOR_AUXILIO",
  CASE WHEN UPPER(TRIM(IFNULL(L."U_Renuncia", 'N'))) IN ('Y','S','SI','YES','1','TRUE') THEN 'NO' ELSE 'SI' END AS "SE_USA"
FROM ${schema}."@OK1_SF_ELEM_LIN" L
INNER JOIN ${schema}."@OK1_SF_LLAMADA_HEAD" T0 ON T0."DocEntry" = L."DocEntry"
INNER JOIN ${schema}."NNM1" N ON N."Series" = T0."Series" AND N."ObjectCode" = 'OK1_SF_LLAMADA'
WHERE N."SeriesName" LIKE 'OSF%'
  AND L."U_ArtAdMe" IN ('C','A','M')
  AND NULLIF(TRIM(L."U_ItemName"), '') IS NOT NULL
  ${dates}
ORDER BY L."DocEntry" DESC, L."LineId"
`
}
