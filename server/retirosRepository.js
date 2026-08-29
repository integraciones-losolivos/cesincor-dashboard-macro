import { connectHana, executeQuery } from './hanaConnection.js'
import { buildRetirosSql } from './retirosSql.js'
import { createPersistentRangeCache } from './persistentRangeCache.js'

const CACHE_TTL_MS = Number(process.env.RETIROS_CACHE_TTL_MS || 6 * 60 * 60 * 1000)

function number(value) { return Number(value || 0) }

function normalize(row, index) {
  const tipoRetiro = row.TIPO_RETIRO || 'SIN DEFINIR'
  return { id: `${row.CONTRATO}-${row.LINEA}-${tipoRetiro || index}`, contrato: String(row.CONTRATO || ''), linea: number(row.LINEA), fecha: row.FECHA, fecha_ingreso: row.FECHA_INGRESO, documento: row.DOCUMENTO || '', nombre: row.NOMBRE || 'SIN NOMBRE', tipo_retiro: tipoRetiro, plan: row.PLAN || 'SIN PLAN', asesor: row.ASESOR || 'SIN ASESOR', sede: row.SEDE || 'SIN SEDE', entidad: row.ENTIDAD || 'SIN ENTIDAD', subuen: row.SUBUEN || 'SIN SUBUEN', estado_contrato: row.ESTADO_CONTRATO || 'SIN ESTADO', meses_vigencia: number(row.MESES_VIGENCIA) }
}

async function queryRetiros(range) {
  const connection = await connectHana()
  try {
    return (await executeQuery(connection, buildRetirosSql(range))).map(normalize)
  } finally { connection.disconnect() }
}

const loadCachedRange = createPersistentRangeCache({
  namespace: `retiros-${process.env.HANA_SCHEMA || 'default'}`,
  ttlMs: CACHE_TTL_MS,
  dateField: 'fecha',
  rowKey: (row) => row.id,
})

export async function fetchRetiros(range = {}) {
  return loadCachedRange(range, queryRetiros)
}
