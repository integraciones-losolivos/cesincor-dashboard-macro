function quotedSchema() {
  const schema = process.env.HANA_SCHEMA
  if (!/^[A-Za-z0-9_]+$/.test(schema || '')) {
    throw new Error('HANA_SCHEMA solo puede contener letras, numeros y guion bajo.')
  }
  return `"${schema}"`
}

function incomeDateCondition(from, to) {
  const validDate = /^\d{4}-\d{2}-\d{2}$/
  if ((from && !validDate.test(from)) || (to && !validDate.test(to))) {
    throw new Error('Las fechas de Ingresos deben usar el formato YYYY-MM-DD.')
  }
  const conditions = []
  if (from && validDate.test(from)) conditions.push(`P."FECHA_INGRESO" >= TO_DATE('${from}')`)
  if (to && validDate.test(to)) conditions.push(`P."FECHA_INGRESO" < ADD_DAYS(TO_DATE('${to}'), 1)`)
  return conditions.length ? conditions.join('\n      AND ') : '1 = 1'
}

function billingDateCondition(from, to, alias = 'O') {
  const validDate = /^\d{4}-\d{2}-\d{2}$/
  const conditions = []
  if (from && validDate.test(from)) conditions.push(`${alias}."RefDate" >= TO_DATE('${from}')`)
  if (to && validDate.test(to)) conditions.push(`${alias}."RefDate" < ADD_DAYS(TO_DATE('${to}'), 1)`)
  return conditions.length ? `AND ${conditions.join(`\n    AND `)}` : ''
}

export function buildPrevisionIncomeSql({ from = '', to = '' } = {}) {
  const schema = quotedSchema()
  const dateCondition = incomeDateCondition(from, to)
  const billingDates = billingDateCondition(from, to)

  return `
WITH TITULAR AS (
  SELECT T.*
  FROM (
    SELECT
      B.*,
      ROW_NUMBER() OVER (PARTITION BY B."DocEntry" ORDER BY B."LineId") AS "RN"
    FROM ${schema}."@OK1_EXE_CONT_BENEFI" B
    WHERE TRIM(IFNULL(B."U_parent", '')) = '0'
  ) T
  WHERE T."RN" = 1
),
DATOS_TITULAR AS (
  SELECT
    TRIM(TO_NVARCHAR(T."Code")) AS "DOCUMENTO_TITULAR",
    MAX(T."U_fecNac") AS "FECHA_NACIMIENTO"
  FROM ${schema}."@OK1_EXE_TITUBENF" T
  WHERE NULLIF(TRIM(TO_NVARCHAR(T."Code")), '') IS NOT NULL
  GROUP BY TRIM(TO_NVARCHAR(T."Code"))
),
CONTRATOS_ACTIVOS AS (
  SELECT
    TH."DocEntry",
    TH."U_contrant" AS "CEDULA_CONTRATANTE",
    COALESCE(NULLIF(TRIM(TH."U_nompla"), ''), TH."U_plan") AS "PLAN",
    TH."U_nomcon" AS "CONVENIO",
    TH."U_sucur" AS "SEDE",
    TH."U_nomVnd" AS "ASESOR_CONTRATO",
    TH."U_estado" AS "CODIGO_ESTADO",
    IFNULL(EST."Name", TH."U_estado") AS "ESTADO_CONTRATO",
    TH."U_fecIn" AS "FECHA_INICIO_VIGENCIA"
  FROM ${schema}."@OK1_EXE_CONTR_HEAD" TH
  INNER JOIN TITULAR TIT ON TIT."DocEntry" = TH."DocEntry"
  LEFT JOIN ${schema}."@OK1_EXE_ESTADOCONTR" EST ON EST."Code" = TH."U_estado"
  WHERE UPPER(TRIM(IFNULL(EST."Name", TH."U_estado"))) IN ('ACTIVO', 'ACT')
),
PERSONAS AS (
  SELECT
    CA."DocEntry",
    TIT."LineId",
    CA."PLAN",
    CA."CONVENIO",
    CA."SEDE",
    CA."ASESOR_CONTRATO",
    IFNULL(NULLIF(TRIM(TIT."U_numdoc"), ''), CA."CEDULA_CONTRATANTE") AS "DOCUMENTO",
    TIT."U_pape" AS "PRIMER_APELLIDO",
    TIT."U_sape" AS "SEGUNDO_APELLIDO",
    TIT."U_nombre" AS "PRIMER_NOMBRE",
    TIT."U_snombre" AS "SEGUNDO_NOMBRE",
    'TITULAR' AS "TIPO_BENEFICIARIO",
    'T' AS "CODIGO_TIPO",
    DTIT."FECHA_NACIMIENTO",
    TIT."U_fecIng" AS "FECHA_INGRESO",
    CA."FECHA_INICIO_VIGENCIA",
    TIT."U_fecRet" AS "FECHA_RETIRO",
    TIT."U_fecSin" AS "FECHA_SINIESTRO",
    TIT."U_parent",
    TIT."U_parentCoEd"
  FROM CONTRATOS_ACTIVOS CA
  INNER JOIN TITULAR TIT ON TIT."DocEntry" = CA."DocEntry"
  LEFT JOIN DATOS_TITULAR DTIT
    ON DTIT."DOCUMENTO_TITULAR" = TRIM(TO_NVARCHAR(IFNULL(NULLIF(TRIM(TIT."U_numdoc"), ''), CA."CEDULA_CONTRATANTE")))

  UNION ALL

  SELECT
    CA."DocEntry",
    B."LineId",
    CA."PLAN",
    CA."CONVENIO",
    CA."SEDE",
    CA."ASESOR_CONTRATO",
    IFNULL(NULLIF(TRIM(B."U_numdoc"), ''), 'N/A') AS "DOCUMENTO",
    B."U_pape" AS "PRIMER_APELLIDO",
    B."U_sape" AS "SEGUNDO_APELLIDO",
    B."U_nombre" AS "PRIMER_NOMBRE",
    B."U_snombre" AS "SEGUNDO_NOMBRE",
    CASE
      WHEN UPPER(TRIM(IFNULL(B."U_tdbenef", ''))) = 'B' THEN 'BENEFICIARIO'
      WHEN UPPER(TRIM(IFNULL(B."U_tdbenef", ''))) IN ('A', 'M', 'P', 'D') THEN 'ADICIONAL'
      ELSE 'SIN CLASIFICAR'
    END AS "TIPO_BENEFICIARIO",
    UPPER(TRIM(IFNULL(B."U_tdbenef", ''))) AS "CODIGO_TIPO",
    B."U_fecnaci" AS "FECHA_NACIMIENTO",
    B."U_fecIng" AS "FECHA_INGRESO",
    CA."FECHA_INICIO_VIGENCIA",
    B."U_fecRet" AS "FECHA_RETIRO",
    B."U_fecSin" AS "FECHA_SINIESTRO",
    B."U_parent",
    B."U_parentCoEd"
  FROM CONTRATOS_ACTIVOS CA
  INNER JOIN ${schema}."@OK1_EXE_CONT_BENEFI" B ON B."DocEntry" = CA."DocEntry"
  WHERE TRIM(IFNULL(B."U_parent", '')) <> '0'
    AND UPPER(TRIM(IFNULL(B."U_tdbenef", ''))) IN ('B', 'A', 'M', 'P', 'D')
    AND (
      UPPER(TRIM(IFNULL(B."U_tdbenef", ''))) IN ('P', 'D')
      OR B."U_codPlaAsis" IS NULL
      OR TRIM(B."U_codPlaAsis") = ''
    )
),
CONTRATOS_CON_INGRESO AS (
  SELECT DISTINCT P."DocEntry"
  FROM PERSONAS P
  WHERE ${dateCondition}
),
FACT_ADICIONALES AS (
  SELECT
    CAST(D."U_numFactura" AS INTEGER) AS "N_FACTURA",
    CAST(D."U_numContrato" AS INTEGER) AS "DOCENTRY",
    SUM(
      CASE
        WHEN D."U_valorAdicional" IS NULL OR TRIM(D."U_valorAdicional") = '' THEN 0
        ELSE TO_DOUBLE(REPLACE(D."U_valorAdicional", ',00', ''))
      END
    ) AS "VALOR_ADICIONAL"
  FROM ${schema}."@OK1_EXE_DETFACT" D
  INNER JOIN CONTRATOS_CON_INGRESO CCI ON CCI."DocEntry" = CAST(D."U_numContrato" AS INTEGER)
  WHERE D."U_tipoBenf" IN ('A', 'M', 'P', 'D')
    OR (D."U_codPlanAsis" IS NOT NULL AND TRIM(D."U_codPlanAsis") <> '')
  GROUP BY D."U_numFactura", D."U_numContrato"
),
FACT_SEGUROS_EMPRESA AS (
  SELECT
    CAST(F."U_contra" AS INTEGER) AS "DOCENTRY",
    F."U_TransIdOJDT" AS "TRANSID",
    SUM(
      CASE
        WHEN J."U_Ref2" LIKE 'SOLICA%' OR J."U_Ref2" LIKE 'AP%' OR J."U_Ref2" LIKE 'SINER%'
          THEN IFNULL(J."U_Credit", 0)
        ELSE 0
      END
    ) AS "VALOR_SEGUROS"
  FROM ${schema}."@OK1_EXE_FACT_OJDT" F
  INNER JOIN CONTRATOS_CON_INGRESO CCI ON CCI."DocEntry" = CAST(F."U_contra" AS INTEGER)
  INNER JOIN ${schema}."@OK1_EXE_FACT_JDT1" J ON J."DocEntry" = F."DocEntry"
  WHERE F."U_contra" IS NOT NULL
  GROUP BY F."U_contra", F."U_TransIdOJDT"
),
FACT_COMPLEMENTO_EMPRESA AS (
  SELECT
    CAST(F."U_contra" AS INTEGER) AS "DOCENTRY",
    F."U_TransIdOJDT" AS "TRANSID",
    SUM(IFNULL(J."U_Credit", 0)) AS "VALOR_COMPLEMENTO"
  FROM ${schema}."@OK1_EXE_FACT_OJDT" F
  INNER JOIN CONTRATOS_CON_INGRESO CCI ON CCI."DocEntry" = CAST(F."U_contra" AS INTEGER)
  INNER JOIN ${schema}."@OK1_EXE_FACT_JDT1" J ON J."DocEntry" = F."DocEntry"
  INNER JOIN ${schema}."@OK1_EXE_CONT_BENEFI" B
    ON B."DocEntry" = F."U_contra"
    AND SUBSTRING(J."U_Ref2", LOCATE(J."U_Ref2", '-') + 1) = B."U_numdoc"
    AND (
      B."U_tdbenef" IN ('A', 'M', 'P', 'D')
      OR (B."U_codPlaAsis" IS NOT NULL AND TRIM(B."U_codPlaAsis") <> '')
    )
  WHERE J."U_Ref2" LIKE '%FACTCOMPL%'
  GROUP BY F."U_contra", F."U_TransIdOJDT"
),
FACT_SEGUROS_DIRECTO AS (
  SELECT
    CAST(O."U_contra" AS INTEGER) AS "DOCENTRY",
    O."TransId" AS "TRANSID",
    SUM(
      CASE
        WHEN J."Ref2" LIKE 'SOLICA%' OR J."Ref2" LIKE 'AP%' OR J."Ref2" LIKE 'SINER%'
          THEN IFNULL(J."Credit", 0)
        ELSE 0
      END
    ) AS "VALOR_SEGUROS"
  FROM ${schema}."OJDT" O
  INNER JOIN CONTRATOS_CON_INGRESO CCI ON CCI."DocEntry" = CAST(O."U_contra" AS INTEGER)
  INNER JOIN ${schema}."JDT1" J ON J."TransId" = O."TransId"
  WHERE O."TransCode" = 'OKEX' AND O."U_contra" IS NOT NULL
  GROUP BY O."U_contra", O."TransId"
),
FACT_COMPLEMENTO_DIRECTO AS (
  SELECT
    CAST(O."U_contra" AS INTEGER) AS "DOCENTRY",
    O."TransId" AS "TRANSID",
    SUM(IFNULL(J."Credit", 0)) AS "VALOR_COMPLEMENTO"
  FROM ${schema}."OJDT" O
  INNER JOIN CONTRATOS_CON_INGRESO CCI ON CCI."DocEntry" = CAST(O."U_contra" AS INTEGER)
  INNER JOIN ${schema}."JDT1" J ON J."TransId" = O."TransId"
  INNER JOIN ${schema}."@OK1_EXE_CONT_BENEFI" B
    ON CAST(B."DocEntry" AS NVARCHAR) = CAST(O."U_contra" AS NVARCHAR)
    AND TRIM(SUBSTRING(J."Ref2", LOCATE(J."Ref2", ':') + 1)) = B."U_numdoc"
    AND (
      B."U_tdbenef" IN ('A', 'M', 'P', 'D')
      OR (B."U_codPlaAsis" IS NOT NULL AND TRIM(B."U_codPlaAsis") <> '')
    )
  WHERE O."TransCode" = 'OKEX'
    AND O."Ref3" LIKE '%FACTCOMPL%'
    AND IFNULL(J."Credit", 0) <> 0
  GROUP BY O."U_contra", O."TransId"
),
FACTURACION_EMPRESA AS (
  SELECT
    CAST(F."U_contra" AS INTEGER) AS "DOCENTRY",
    O."TransId" AS "TRANSID",
    CAST(O."U_nFactExe" AS INTEGER) AS "N_FACTURA",
    O."RefDate" AS "FECHA_FACTURA",
    CASE
      WHEN (
        SUM(IFNULL(F."U_LocTotal", 0))
        - IFNULL(MAX(FA."VALOR_ADICIONAL"), 0)
        - IFNULL(MAX(FSE."VALOR_SEGUROS"), 0)
        - IFNULL(MAX(FCE."VALOR_COMPLEMENTO"), 0)
      ) < 0 THEN 0
      ELSE (
        SUM(IFNULL(F."U_LocTotal", 0))
        - IFNULL(MAX(FA."VALOR_ADICIONAL"), 0)
        - IFNULL(MAX(FSE."VALOR_SEGUROS"), 0)
        - IFNULL(MAX(FCE."VALOR_COMPLEMENTO"), 0)
      )
    END AS "VALOR_FACTURADO"
  FROM ${schema}."@OK1_EXE_FACT_OJDT" F
  INNER JOIN CONTRATOS_CON_INGRESO CCI ON CCI."DocEntry" = CAST(F."U_contra" AS INTEGER)
  INNER JOIN ${schema}."OJDT" O ON O."TransId" = F."U_TransIdOJDT"
  LEFT JOIN FACT_ADICIONALES FA
    ON FA."N_FACTURA" = CAST(O."U_nFactExe" AS INTEGER)
    AND FA."DOCENTRY" = CAST(F."U_contra" AS INTEGER)
  LEFT JOIN FACT_SEGUROS_EMPRESA FSE
    ON FSE."DOCENTRY" = CAST(F."U_contra" AS INTEGER) AND FSE."TRANSID" = O."TransId"
  LEFT JOIN FACT_COMPLEMENTO_EMPRESA FCE
    ON FCE."DOCENTRY" = CAST(F."U_contra" AS INTEGER) AND FCE."TRANSID" = O."TransId"
  WHERE O."TransCode" = 'OKEX' AND F."U_contra" IS NOT NULL
    ${billingDates}
  GROUP BY F."U_contra", O."TransId", O."U_nFactExe", O."RefDate"
),
FACTURACION_DIRECTA AS (
  SELECT
    CAST(O."U_contra" AS INTEGER) AS "DOCENTRY",
    O."TransId" AS "TRANSID",
    CAST(O."U_nFactExe" AS INTEGER) AS "N_FACTURA",
    O."RefDate" AS "FECHA_FACTURA",
    CASE
      WHEN (
        IFNULL(O."LocTotal", 0)
        - IFNULL(FA."VALOR_ADICIONAL", 0)
        - IFNULL(FSD."VALOR_SEGUROS", 0)
        - IFNULL(FCD."VALOR_COMPLEMENTO", 0)
      ) < 0 THEN 0
      ELSE (
        IFNULL(O."LocTotal", 0)
        - IFNULL(FA."VALOR_ADICIONAL", 0)
        - IFNULL(FSD."VALOR_SEGUROS", 0)
        - IFNULL(FCD."VALOR_COMPLEMENTO", 0)
      )
    END AS "VALOR_FACTURADO"
  FROM ${schema}."OJDT" O
  INNER JOIN CONTRATOS_CON_INGRESO CCI ON CCI."DocEntry" = CAST(O."U_contra" AS INTEGER)
  LEFT JOIN FACT_ADICIONALES FA
    ON FA."N_FACTURA" = CAST(O."U_nFactExe" AS INTEGER)
    AND FA."DOCENTRY" = CAST(O."U_contra" AS INTEGER)
  LEFT JOIN FACT_SEGUROS_DIRECTO FSD ON FSD."DOCENTRY" = CAST(O."U_contra" AS INTEGER) AND FSD."TRANSID" = O."TransId"
  LEFT JOIN FACT_COMPLEMENTO_DIRECTO FCD ON FCD."DOCENTRY" = CAST(O."U_contra" AS INTEGER) AND FCD."TRANSID" = O."TransId"
  WHERE O."TransCode" = 'OKEX'
    AND O."U_contra" IS NOT NULL
    ${billingDates}
    AND NOT EXISTS (
      SELECT 1
      FROM ${schema}."@OK1_EXE_FACT_OJDT" FX
      WHERE FX."U_TransIdOJDT" = O."TransId"
        AND CAST(FX."U_contra" AS NVARCHAR) = CAST(O."U_contra" AS NVARCHAR)
    )
),
FACTURACION_TODOS AS (
  SELECT * FROM FACTURACION_EMPRESA
  UNION ALL
  SELECT * FROM FACTURACION_DIRECTA
),
FACTURACION_ORDENADA AS (
  SELECT
    F.*,
    ROW_NUMBER() OVER (
      PARTITION BY F."DOCENTRY"
      ORDER BY F."FECHA_FACTURA" DESC, F."TRANSID" DESC, F."N_FACTURA" DESC
    ) AS "RN"
  FROM FACTURACION_TODOS F
),
FACTURACION_CONTRATO AS (
  SELECT F."DOCENTRY", F."N_FACTURA", F."FECHA_FACTURA", F."VALOR_FACTURADO"
  FROM FACTURACION_ORDENADA F
  WHERE F."RN" = 1
)
SELECT
  P."DocEntry" AS "CONTRATO",
  P."LineId" AS "LINEA",
  P."PLAN",
  P."CONVENIO",
  P."SEDE",
  COALESCE(NULLIF(TRIM(P."ASESOR_CONTRATO"), ''), 'N/A') AS "ASESOR",
  CASE WHEN P."TIPO_BENEFICIARIO" = 'TITULAR' THEN FC."VALOR_FACTURADO" ELSE NULL END AS "VALOR_FACTURADO",
  CASE WHEN P."TIPO_BENEFICIARIO" = 'TITULAR' THEN TO_VARCHAR(FC."FECHA_FACTURA", 'YYYY-MM-DD') ELSE NULL END AS "FECHA_FACTURA",
  P."TIPO_BENEFICIARIO",
  CASE
    WHEN P."TIPO_BENEFICIARIO" = 'TITULAR' THEN 'TITULAR'
    WHEN P."CODIGO_TIPO" IN ('P', 'D') THEN 'MASCOTA'
    WHEN P."TIPO_BENEFICIARIO" = 'ADICIONAL' THEN 'ADICIONAL PERSONA'
    WHEN P."TIPO_BENEFICIARIO" = 'BENEFICIARIO' THEN 'BENEFICIARIO'
    ELSE 'SIN CLASIFICAR'
  END AS "CATEGORIA_PROTEGIDO",
  P."DOCUMENTO",
  P."PRIMER_APELLIDO",
  P."SEGUNDO_APELLIDO",
  P."PRIMER_NOMBRE",
  P."SEGUNDO_NOMBRE",
  TO_VARCHAR(P."FECHA_NACIMIENTO", 'YYYY-MM-DD') AS "FECHA_NACIMIENTO",
  CASE
    WHEN P."FECHA_SINIESTRO" IS NOT NULL THEN 'FALLECIDO'
    WHEN P."FECHA_RETIRO" IS NOT NULL THEN 'RETIRADO'
    ELSE 'ACTIVO'
  END AS "ESTADO",
  TO_VARCHAR(P."FECHA_INGRESO", 'YYYY-MM-DD') AS "FECHA_INGRESO",
  TO_VARCHAR(P."FECHA_INICIO_VIGENCIA", 'YYYY-MM-DD') AS "FECHA_INICIO_VIGENCIA",
  CASE
    WHEN P."TIPO_BENEFICIARIO" = 'TITULAR' THEN 'TITULAR'
    WHEN P."U_parentCoEd" IS NOT NULL
      AND TRIM(TO_NVARCHAR(P."U_parentCoEd")) <> ''
      AND TRIM(TO_NVARCHAR(P."U_parentCoEd")) <> '?'
      AND NULLIF(TRIM(PCO."Name"), '') IS NOT NULL THEN PCO."Name"
    ELSE COALESCE(NULLIF(TRIM(PAR."Name"), ''), 'N/A')
  END AS "PARENTESCO"
FROM PERSONAS P
INNER JOIN CONTRATOS_CON_INGRESO CCI ON CCI."DocEntry" = P."DocEntry"
LEFT JOIN FACTURACION_CONTRATO FC ON FC."DOCENTRY" = P."DocEntry"
LEFT JOIN ${schema}."@OK1_EXE_PARENTESCOS" PAR ON TO_NVARCHAR(PAR."Code") = TO_NVARCHAR(P."U_parent")
LEFT JOIN ${schema}."@OK1_EXE_PARENTESCOS" PCO ON TO_NVARCHAR(PCO."Code") = TO_NVARCHAR(P."U_parentCoEd")
ORDER BY P."DocEntry", P."LineId"
`
}
