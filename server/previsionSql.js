function quotedSchema() {
  const schema = process.env.HANA_SCHEMA
  if (!/^[A-Za-z0-9_]+$/.test(schema || '')) {
    throw new Error('HANA_SCHEMA solo puede contener letras, numeros y guion bajo.')
  }
  return `"${schema}"`
}

function rowLimit() {
  const limit = Number(process.env.PREVISION_LIMIT || 0)
  return Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 0
}

function dateCondition(alias, from, to) {
  const validDate = /^\d{4}-\d{2}-\d{2}$/
  const conditions = []
  if (from && validDate.test(from)) conditions.push(`TO_DATE(${alias}."U_fecIng") >= TO_DATE('${from}')`)
  if (to && validDate.test(to)) conditions.push(`TO_DATE(${alias}."U_fecIng") <= TO_DATE('${to}')`)
  return conditions.length ? `AND ${conditions.join(' AND ')}` : ''
}

export function buildPrevisionSql({ from = '', to = '' } = {}) {
  const schema = quotedSchema()
  const limit = rowLimit()
  const limitClause = limit ? `LIMIT ${limit}` : ''
  const titularDateCondition = dateCondition('TIT', from, to)
  const beneficiaryDateCondition = dateCondition('B', from, to)

  return `
WITH SEGUROS AS (
  SELECT
    S."DocEntry",
    SUM(
      CASE
        WHEN UPPER(TRIM(COALESCE(S."U_nomSeg", ''))) IN ('SINERGIA', 'SOLICANASTA')
        THEN COALESCE(S."U_valor", 0)
        ELSE 0
      END
    ) AS "Valor_Seguro"
  FROM ${schema}."@OK1_EXE_CONT_SEGURO" S
  GROUP BY S."DocEntry"
),
TARIFAS AS (
  SELECT *
  FROM (
    SELECT
      "Code",
      "U_vlrFijo",
      "U_vlrAdcMay",
      "U_vlrAdcMen",
      "U_vlrMascota",
      ROW_NUMBER() OVER (
        PARTITION BY "Code"
        ORDER BY "U_fecini" DESC
      ) AS rn
    FROM ${schema}."@OK1_EXE_VIGENFECHAS"
    WHERE CURRENT_DATE BETWEEN TO_DATE("U_fecini") AND TO_DATE("U_fecfin")
  )
  WHERE rn = 1
),
TITULAR AS (
  SELECT T.*
  FROM (
    SELECT
      B.*,
      ROW_NUMBER() OVER (
        PARTITION BY B."DocEntry"
        ORDER BY B."LineId"
      ) AS "RN"
    FROM ${schema}."@OK1_EXE_CONT_BENEFI" B
    WHERE TRIM(IFNULL(B."U_parent", '')) = '0'
  ) T
  WHERE T."RN" = 1
),
CONTRATOS_ACTIVOS AS (
  SELECT
    T1."DocEntry" AS "CONTRATO",
    T0."DocEntry" AS "CODIGO_CONVENIO",
    CASE
      WHEN TRIM(COALESCE(T0."U_uen", '')) = 'UEN1' THEN 'EMPRESAS'
      WHEN TRIM(COALESCE(T0."U_uen", '')) = 'UEN2' THEN 'INDEPENDIENTES'
      ELSE TRIM(COALESCE(T0."U_uen", 'SIN UEN'))
    END AS "UEN",
    T1."U_sucur" AS "LOCALIDAD",
    COALESCE(SLP."SlpName", T0."U_nomAsc", 'SIN NOMBRE') AS "ASESOR",
    COALESCE(NULLIF(TRIM(T0."U_empNom"), ''), NULLIF(TRIM(T0."U_nconv"), ''), 'SIN CONVENIO') AS "NOMBRE_CONVENIO",
    T1."U_plan" AS "CODIGO_PLAN",
    COALESCE(NULLIF(TRIM(T1."U_nompla"), ''), T1."U_plan", 'SIN PLAN') AS "PLAN",
    CASE
      WHEN UPPER(TRIM(COALESCE(T0."U_perpag", ''))) IN ('M','MEN','MENS','MENSUAL') THEN 'Mensual'
      WHEN UPPER(TRIM(COALESCE(T0."U_perpag", ''))) IN ('B','BIM','BIMES','BIMESTRAL') THEN 'Bimestral'
      WHEN UPPER(TRIM(COALESCE(T0."U_perpag", ''))) IN ('T','TRI','TRIM','TRIMESTRAL') THEN 'Trimestral'
      WHEN UPPER(TRIM(COALESCE(T0."U_perpag", ''))) IN ('S','SEM','SEMES','SEMESTRAL') THEN 'Semestral'
      WHEN UPPER(TRIM(COALESCE(T0."U_perpag", ''))) IN ('C','CUA','CUAT','CUATRIMESTRAL') THEN 'Cuatrimestral'
      WHEN UPPER(TRIM(COALESCE(T0."U_perpag", ''))) IN ('A','ANU','ANUA','ANUAL') THEN 'Anual'
      ELSE COALESCE(T0."U_perpag", 'SIN DEFINIR')
    END AS "PERIODICIDAD_PAGO",
    CASE COALESCE(T1."U_recaudo", '')
      WHEN 'CSA' THEN 'Casa'
      WHEN 'OFI' THEN 'Oficina'
      WHEN 'PPA' THEN 'Punto de pago'
      ELSE COALESCE(T1."U_recaudo", 'SIN DEFINIR')
    END AS "COBRADOR",
    T1."U_contrant" AS "CEDULA_CONTRATANTE",
    COALESCE(T1."U_estado", 'SIN ESTADO') AS "CODIGO_ESTADO",
    COALESCE(EST."Name", T1."U_estado", 'SIN ESTADO') AS "ESTADO_CONTRATO",
    'ACT' AS "ESTADO_CRYSTAL",
    COALESCE(T1."U_valor", 0) AS "VALOR_CONTRATO",
    T1."U_fecIn" AS "FECHA_INICIO_VIGENCIA"
  FROM ${schema}."@OK1_EXE_CONV_HEAD" T0
  INNER JOIN ${schema}."@OK1_EXE_CONTR_HEAD" T1
    ON T1."U_conve" = T0."DocEntry"
  INNER JOIN TITULAR TIT
    ON TIT."DocEntry" = T1."DocEntry"
  LEFT JOIN ${schema}."@OK1_EXE_ESTADOCONTR" EST
    ON EST."Code" = T1."U_estado"
  LEFT JOIN ${schema}."OSLP" SLP
    ON SLP."SlpCode" = T1."U_vendedor"
  WHERE UPPER(TRIM(IFNULL(EST."Name", T1."U_estado"))) IN ('ACTIVO', 'ACT')
),
PERSONAS AS (
  SELECT
    CA.*,
    TIT."LineId",
    TIT."U_tdd",
    IFNULL(NULLIF(TRIM(TIT."U_numdoc"), ''), CA."CEDULA_CONTRATANTE") AS "DOCUMENTO",
    TIT."U_pape" AS "PRIMER_APELLIDO",
    TIT."U_sape" AS "SEGUNDO_APELLIDO",
    TIT."U_nombre" AS "PRIMER_NOMBRE",
    TIT."U_snombre" AS "SEGUNDO_NOMBRE",
    'TITULAR' AS "TIPO_AFILIADO",
    TIT."U_fecIng" AS "FECHA",
    TIT."U_fecRet" AS "FECHA_RETIRO",
    TIT."U_fecSin" AS "FECHA_SINIESTRO",
    TIT."U_parent",
    TIT."U_parentCoEd",
    TIT."U_tdbenef",
    TIT."U_codPlaAsis",
    TIT."U_valor"
  FROM CONTRATOS_ACTIVOS CA
  INNER JOIN TITULAR TIT
    ON TIT."DocEntry" = CA."CONTRATO"
  WHERE 1 = 1
    ${titularDateCondition}

  UNION ALL

  SELECT
    CA.*,
    B."LineId",
    B."U_tdd",
    IFNULL(NULLIF(TRIM(B."U_numdoc"), ''), 'N/A') AS "DOCUMENTO",
    B."U_pape" AS "PRIMER_APELLIDO",
    B."U_sape" AS "SEGUNDO_APELLIDO",
    B."U_nombre" AS "PRIMER_NOMBRE",
    B."U_snombre" AS "SEGUNDO_NOMBRE",
    CASE
      WHEN UPPER(TRIM(IFNULL(B."U_tdbenef", ''))) = 'B' THEN 'BENEFICIARIO'
      WHEN UPPER(TRIM(IFNULL(B."U_tdbenef", ''))) IN ('P','D') THEN 'MASCOTA'
      WHEN UPPER(TRIM(IFNULL(B."U_tdbenef", ''))) IN ('A','M') THEN 'ADICIONAL'
      ELSE 'SIN CLASIFICAR'
    END AS "TIPO_AFILIADO",
    B."U_fecIng" AS "FECHA",
    B."U_fecRet" AS "FECHA_RETIRO",
    B."U_fecSin" AS "FECHA_SINIESTRO",
    B."U_parent",
    B."U_parentCoEd",
    B."U_tdbenef",
    B."U_codPlaAsis",
    B."U_valor"
  FROM CONTRATOS_ACTIVOS CA
  INNER JOIN ${schema}."@OK1_EXE_CONT_BENEFI" B
    ON B."DocEntry" = CA."CONTRATO"
  WHERE TRIM(IFNULL(B."U_parent", '')) <> '0'
    AND UPPER(TRIM(IFNULL(B."U_tdbenef", ''))) IN ('B','A','M','P','D')
    AND (
      UPPER(TRIM(IFNULL(B."U_tdbenef", ''))) IN ('P','D')
      OR B."U_codPlaAsis" IS NULL
      OR TRIM(B."U_codPlaAsis") = ''
    )
    ${beneficiaryDateCondition}
),
BASE AS (
  SELECT
    P.*,
    CASE
      WHEN COALESCE(P."U_tdbenef", '') IN ('P','D') AND COALESCE(P."U_parent", '') = '47' THEN 'PERRO'
      WHEN COALESCE(P."U_tdbenef", '') IN ('P','D') AND COALESCE(P."U_parent", '') = '48' THEN 'GATO'
      WHEN COALESCE(P."U_tdbenef", '') IN ('P','D') THEN 'OTRA MASCOTA'
      ELSE 'NO APLICA'
    END AS "TIPO_MASCOTA",
    CASE
      WHEN P."FECHA_SINIESTRO" IS NOT NULL THEN 'FALLECIDO'
      WHEN P."FECHA_RETIRO" IS NOT NULL THEN 'RETIRADO'
      ELSE 'ACTIVO'
    END AS "ESTADO_PERSONA",
    CASE
      WHEN P."TIPO_AFILIADO" = 'TITULAR' THEN COALESCE(TAR."U_vlrFijo", 0)
      WHEN P."TIPO_AFILIADO" = 'MASCOTA' THEN COALESCE(P."U_valor", TAR."U_vlrMascota", 0)
      WHEN COALESCE(P."U_tdbenef", '') = 'M' THEN COALESCE(P."U_valor", TAR."U_vlrAdcMay", 0)
      ELSE COALESCE(P."U_valor", TAR."U_vlrAdcMen", 0)
    END AS "VALOR_PLAN",
    CASE
      WHEN P."TIPO_AFILIADO" = 'TITULAR' THEN P."VALOR_CONTRATO"
      ELSE 0
    END AS "VALOR_PLAN_BASE",
    CASE
      WHEN P."TIPO_AFILIADO" = 'ADICIONAL' THEN COALESCE(P."U_valor", 0)
      ELSE 0
    END AS "VALOR_ADICIONAL",
    0 AS "VALOR_ASISTENCIA",
    CASE WHEN P."TIPO_AFILIADO" = 'TITULAR' THEN COALESCE(SEG."Valor_Seguro", 0) ELSE 0 END AS "VALOR_SEGURO",
    CASE
      WHEN P."TIPO_AFILIADO" = 'MASCOTA'
      THEN COALESCE(P."U_valor", TAR."U_vlrMascota", 0)
      ELSE 0
    END AS "VALOR_MASCOTA",
    0 AS "VALOR_CLUB"
  FROM PERSONAS P
  LEFT JOIN SEGUROS SEG
    ON SEG."DocEntry" = P."CONTRATO"
  LEFT JOIN TARIFAS TAR
    ON TAR."Code" = TO_NVARCHAR(P."CODIGO_CONVENIO") || '-' || TRIM(P."CODIGO_PLAN")
)
SELECT
  "CONTRATO",
  "CODIGO_CONVENIO",
  "UEN",
  "UEN" AS "TIPO_PERSONA",
  "LOCALIDAD",
  "ASESOR",
  "NOMBRE_CONVENIO",
  "CODIGO_PLAN",
  "PLAN",
  "PERIODICIDAD_PAGO",
  "COBRADOR",
  "ESTADO_CONTRATO",
  "ESTADO_CRYSTAL",
  CASE
    WHEN YEAR("FECHA") BETWEEN 1900 AND YEAR(CURRENT_DATE) + 1
    THEN TO_VARCHAR("FECHA", 'YYYY-MM-DD')
    ELSE NULL
  END AS "FECHA",
  "TIPO_AFILIADO",
  "TIPO_MASCOTA",
  "ESTADO_PERSONA" AS "TIPO_MOVIMIENTO",
  "ESTADO_PERSONA" AS "MOTIVO",
  "VALOR_PLAN",
  CASE WHEN "ESTADO_PERSONA" = 'ACTIVO' THEN 1 ELSE 0 END AS "AFILIACIONES",
  CASE WHEN "ESTADO_PERSONA" = 'RETIRADO' THEN 1 ELSE 0 END AS "RETIROS",
  CASE
    WHEN "TIPO_AFILIADO" = 'TITULAR' AND "ESTADO_PERSONA" = 'ACTIVO'
    THEN "VALOR_CONTRATO"
    ELSE 0
  END AS "INGRESO_MENSUAL",
  0 AS "PERDIDA_MENSUAL",
  1 AS "TOTAL_PERSONAS",
  CASE WHEN "TIPO_AFILIADO" = 'TITULAR' THEN 1 ELSE 0 END AS "TOTAL_TITULARES",
  CASE WHEN "TIPO_AFILIADO" <> 'TITULAR' THEN 1 ELSE 0 END AS "TOTAL_BENEFICIARIOS",
  CASE WHEN "TIPO_AFILIADO" = 'MASCOTA' THEN 1 ELSE 0 END AS "TOTAL_MASCOTAS",
  "VALOR_PLAN_BASE",
  "VALOR_ADICIONAL",
  "VALOR_ASISTENCIA",
  "VALOR_SEGURO",
  "VALOR_MASCOTA",
  "VALOR_CLUB"
FROM BASE
${limitClause}
`
}
