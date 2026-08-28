import { connectHana, executeQuery } from './hanaConnection.js'
import { buildRetirosSql } from './retirosSql.js'

const cache = new Map()
const CACHE_TTL_MS = Number(process.env.RETIROS_CACHE_TTL_MS || 5 * 60 * 1000)

function number(value) { return Number(value || 0) }

function normalize(row, index) {
  return { id: `${row.CONTRATO}-${row.LINEA}-${index}`, contrato: String(row.CONTRATO || ''), linea: number(row.LINEA), fecha: row.FECHA, fecha_ingreso: row.FECHA_INGRESO, documento: row.DOCUMENTO || '', nombre: row.NOMBRE || 'SIN NOMBRE', tipo_retiro: row.TIPO_RETIRO || 'SIN DEFINIR', plan: row.PLAN || 'SIN PLAN', asesor: row.ASESOR || 'SIN ASESOR', sede: row.SEDE || 'SIN SEDE', entidad: row.ENTIDAD || 'SIN ENTIDAD', subuen: row.SUBUEN || 'SIN SUBUEN', estado_contrato: row.ESTADO_CONTRATO || 'SIN ESTADO', meses_vigencia: number(row.MESES_VIGENCIA) }
}

export async function fetchRetiros(range = {}) {
  const key = `${range.from || ''}:${range.to || ''}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.createdAt < CACHE_TTL_MS) return hit.rows
  const connection = await connectHana()
  try {
    const rows = (await executeQuery(connection, buildRetirosSql(range))).map(normalize)
    cache.set(key, { createdAt: Date.now(), rows })
    return rows
  } finally { connection.disconnect() }
}
