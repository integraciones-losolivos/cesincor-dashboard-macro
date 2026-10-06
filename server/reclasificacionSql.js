function quotedSchema() {
  const schema = process.env.HANA_SCHEMA
  if (!/^[A-Za-z0-9_]+$/.test(schema || '')) throw new Error('HANA_SCHEMA solo puede contener letras, números y guion bajo.')
  return `"${schema}"`
}

export function buildReclasificacionSql({ vigencia = '' } = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(vigencia)) throw new Error('La fecha de vigencia debe usar el formato YYYY-MM-DD.')
  const schema = quotedSchema()
  return `
WITH PARAMETROS AS (
  SELECT TRIM(TO_NVARCHAR(D."Code")) AS "PLAN", TRIM(TO_NVARCHAR(D."U_codpar")) AS "PARENTESCO", MIN(CAST(D."U_edperm" AS INTEGER)) AS "EDAD_PERMANENCIA"
  FROM ${schema}."@OK1_EXE_DETPLA" D
  WHERE UPPER(TRIM(IFNULL(D."U_grupo", ''))) = 'B'
    AND D."U_edperm" IS NOT NULL AND D."U_edperm" > 0 AND D."U_edperm" <= 110
  GROUP BY TRIM(TO_NVARCHAR(D."Code")), TRIM(TO_NVARCHAR(D."U_codpar"))
), BASE AS (
  SELECT H."DocEntry" AS "CONTRATO", H."U_contrant" AS "DOCUMENTO_TITULAR", H."U_ncontrat" AS "TITULAR",
    IFNULL(NULLIF(TRIM(BP."Phone1"), ''), '') AS "TELEFONO_1", IFNULL(NULLIF(TRIM(BP."Phone2"), ''), '') AS "TELEFONO_2",
    H."U_nomcon" AS "EMPRESA", H."U_plan" AS "CODIGO_PLAN", H."U_nompla" AS "PLAN", H."U_nomVnd" AS "ASESOR",
    B."U_numdoc" AS "DOCUMENTO_BENEFICIARIO",
    TRIM(IFNULL(B."U_pape", '') || ' ' || IFNULL(B."U_sape", '') || ' ' || IFNULL(B."U_nombre", '') || ' ' || IFNULL(B."U_snombre", '')) AS "BENEFICIARIO",
    B."LineId" AS "LINEID", TRIM(TO_NVARCHAR(B."U_parent")) AS "CODIGO_PARENTESCO",
    TRIM(IFNULL(PAR."Name", 'SIN INFORMACION')) AS "PARENTESCO", B."U_fecnaci" AS "FECHA_NACIMIENTO",
    B."U_fecIng" AS "FECHA_INGRESO", B."U_fecRet" AS "FECHA_RETIRO",
    CASE WHEN B."U_edad" IS NOT NULL THEN CAST(B."U_edad" AS INTEGER)
      ELSE YEAR(TO_DATE('${vigencia}')) - YEAR(B."U_fecnaci") - CASE WHEN ADD_YEARS(B."U_fecnaci", YEAR(TO_DATE('${vigencia}')) - YEAR(B."U_fecnaci")) > TO_DATE('${vigencia}') THEN 1 ELSE 0 END
    END AS "EDAD_ACTUAL"
  FROM ${schema}."@OK1_EXE_CONTR_HEAD" H
  INNER JOIN ${schema}."@OK1_EXE_CONT_BENEFI" B ON B."DocEntry" = H."DocEntry"
  LEFT JOIN ${schema}."OCRD" BP ON BP."CardCode" = H."U_contrant"
  LEFT JOIN ${schema}."@OK1_EXE_PARENTESCOS" PAR ON TO_NVARCHAR(PAR."Code") = TO_NVARCHAR(B."U_parent")
  WHERE UPPER(TRIM(IFNULL(B."U_tdbenef", ''))) = 'B'
    AND TRIM(IFNULL(TO_NVARCHAR(B."U_parent"), '')) <> '0'
    AND B."U_fecnaci" IS NOT NULL
)
SELECT B.*, P."EDAD_PERMANENCIA", P."EDAD_PERMANENCIA" + 1 AS "EDAD_RECLASIFICACION",
  CASE WHEN B."EDAD_ACTUAL" > P."EDAD_PERMANENCIA" THEN B."EDAD_ACTUAL" - (P."EDAD_PERMANENCIA" + 1) ELSE 0 END AS "ANOS_EXCEDIDOS"
FROM BASE B
INNER JOIN PARAMETROS P ON P."PLAN" = TRIM(TO_NVARCHAR(B."CODIGO_PLAN")) AND P."PARENTESCO" = B."CODIGO_PARENTESCO"
WHERE ADD_YEARS(B."FECHA_NACIMIENTO", P."EDAD_PERMANENCIA" + 1) <= TO_DATE('${vigencia}')
ORDER BY B."FECHA_INGRESO", B."CONTRATO", B."LINEID"`
}
