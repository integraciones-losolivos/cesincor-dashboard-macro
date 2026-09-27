import { connectHana, executeQuery } from './hanaConnection.js'
import { buildPrevisionIncomeSql } from './previsionIncomeSql.js'

const CACHE_TTL_MS = Number(process.env.PREVISION_INCOME_CACHE_TTL_MS || 10 * 60 * 1000)
const cache = new Map()

function normalizedDate(value) {
  const match = String(value || '').match(/^\d{4}-\d{2}-\d{2}/)
  return match ? match[0] : null
}

function normalizeRow(row, index) {
  return {
    id: `${row.CONTRATO || ''}-${row.LINEA ?? index}`,
    contrato: String(row.CONTRATO || ''),
    linea: Number(row.LINEA || 0),
    plan: row.PLAN || 'SIN PLAN',
    convenio: row.CONVENIO || 'SIN CONVENIO',
    sede: row.SEDE || 'SIN SEDE',
    asesor: row.ASESOR || '',
    tipoAfiliado: row.TIPO_BENEFICIARIO || 'SIN CLASIFICAR',
    categoriaProtegido: row.CATEGORIA_PROTEGIDO || row.TIPO_BENEFICIARIO || 'SIN CLASIFICAR',
    estado: row.ESTADO || 'SIN ESTADO',
    parentesco: row.PARENTESCO || 'N/A',
    fechaIngreso: normalizedDate(row.FECHA_INGRESO),
    fechaInicioVigencia: normalizedDate(row.FECHA_INICIO_VIGENCIA),
    valorFacturado: Number(row.VALOR_FACTURADO || 0),
  }
}

export async function fetchPrevisionIncomeRows(range = {}) {
  const key = `${range.from || ''}:${range.to || ''}`
  const hit = cache.get(key)
  if (!range.forceRefresh && hit && Date.now() - hit.createdAt < CACHE_TTL_MS) return hit.rows

  let connection
  try {
    connection = await connectHana({ attempts: 5, retryDelayMs: 2500 })
    const rows = await executeQuery(connection, buildPrevisionIncomeSql(range))
    const normalized = rows.map(normalizeRow)
    cache.set(key, { createdAt: Date.now(), rows: normalized })
    return normalized
  } catch (error) {
    if (hit) return hit.rows
    throw error
  } finally {
    connection?.disconnect()
  }
}
