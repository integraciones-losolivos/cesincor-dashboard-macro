import { connectHana, executeQuery } from './hanaConnection.js'
import { buildHomenajeElementsSql, buildHomenajesSql } from './homenajesSql.js'

const CACHE_TTL_MS = Number(process.env.HOMENAJES_CACHE_TTL_MS || 5 * 60 * 1000)
const cache = new Map()

function number(value) {
  return Number(value || 0)
}

function normalizeRow(row) {
  return {
    id: number(row.ID),
    osf: String(row.OSF || ''),
    fecha: row.FECHA,
    sede: row.SEDE,
    gestor: row.ENCARGADO,
    fallecido: row.FALLECIDO,
    tipo_homenaje: row.TIPO_HOMENAJE,
    tipo_excedente: row.TIPO_EXCEDENTE,
    lugar_de_fallecimiento: row.LUGAR_FALLECIMIENTO,
    clinica: row.LUGAR_FALLECIMIENTO,
    municipio: row.MUNICIPIO,
    tipo_muerte: row.TIPO_MUERTE,
    cementerio: row.DESTINO_FINAL,
    tipo_servicio: row.TIPO_SERVICIO,
    estado: row.ESTADO,
    plan: row.PLAN,
    municipio_velacion: row.MUNICIPIO_VELACION,
    lugar_velacion: row.LUGAR_VELACION,
    cantidad: 1,
    cubiertos: number(row.CUBIERTOS),
    adicionales: number(row.ADICIONALES),
    valor: number(row.VALOR_TOTAL),
    valor_cubierto: number(row.VALOR_CUBIERTO),
    valor_excedente: number(row.VALOR_EXCEDENTE),
    valor_auxilio: number(row.VALOR_AUXILIO),
  }
}

function normalizeElement(row) {
  return {
    osf_id: number(row.OSF_ID),
    linea: number(row.LINEA),
    clasificacion: row.CLASIFICACION,
    categoria: row.CATEGORIA,
    elemento: row.ELEMENTO,
    cantidad: number(row.CANTIDAD),
    valor_unitario: number(row.VALOR_UNITARIO),
    valor_total: number(row.VALOR_TOTAL),
    valor_auxilio: number(row.VALOR_AUXILIO),
    se_usa: row.SE_USA,
  }
}

export async function fetchHomenajes(range = {}) {
  const key = `${range.from || ''}:${range.to || ''}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.createdAt < CACHE_TTL_MS) return hit.data

  const connection = await connectHana()
  try {
    const rows = await executeQuery(connection, buildHomenajesSql(range))
    const elements = await executeQuery(connection, buildHomenajeElementsSql(range))
    const data = { rows: rows.map(normalizeRow), elements: elements.map(normalizeElement) }
    cache.set(key, { createdAt: Date.now(), data })
    return data
  } finally {
    connection.disconnect()
  }
}
