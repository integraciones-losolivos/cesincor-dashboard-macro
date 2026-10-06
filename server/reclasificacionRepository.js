import { connectHana, executeQuery } from './hanaConnection.js'
import { buildReclasificacionSql } from './reclasificacionSql.js'

const text = (value, fallback = '') => String(value ?? '').trim() || fallback
const date = (value) => value ? String(value).slice(0, 10) : ''
const number = (value) => Number(value || 0)

function normalize(row, index) {
  return {
    id: `${row.CONTRATO}-${row.LINEID}-${index}`, contrato: text(row.CONTRATO), documento_titular: text(row.DOCUMENTO_TITULAR),
    titular: text(row.TITULAR, 'SIN TITULAR'), telefono_1: text(row.TELEFONO_1), telefono_2: text(row.TELEFONO_2),
    empresa: text(row.EMPRESA, 'SIN EMPRESA'), codigo_plan: text(row.CODIGO_PLAN), plan: text(row.PLAN, 'SIN PLAN'),
    asesor: text(row.ASESOR, 'SIN ASESOR'), documento_beneficiario: text(row.DOCUMENTO_BENEFICIARIO),
    beneficiario: text(row.BENEFICIARIO, 'SIN NOMBRE'), line_id: number(row.LINEID), parentesco: text(row.PARENTESCO, 'SIN INFORMACION'),
    fecha_nacimiento: date(row.FECHA_NACIMIENTO), fecha_ingreso: date(row.FECHA_INGRESO), fecha_retiro: date(row.FECHA_RETIRO),
    edad_actual: number(row.EDAD_ACTUAL), edad_permanencia: number(row.EDAD_PERMANENCIA),
    edad_reclasificacion: number(row.EDAD_RECLASIFICACION), anos_excedidos: number(row.ANOS_EXCEDIDOS), estado: row.FECHA_RETIRO ? 'RETIRADO' : 'ACTIVO',
  }
}

export async function fetchReclasificacion({ vigencia }) {
  const connection = await connectHana()
  try { return (await executeQuery(connection, buildReclasificacionSql({ vigencia }))).map(normalize) }
  finally { connection.disconnect() }
}
