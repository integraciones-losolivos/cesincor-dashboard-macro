import { connectHana, executeQuery } from './hanaConnection.js'
import { buildPrevisionSql } from './previsionSql.js'

const CACHE_TTL_MS = Number(process.env.PREVISION_CACHE_TTL_MS || 5 * 60 * 1000)
let cachedRows = null
let cacheCreatedAt = 0
let cachedRangeKey = ''
let activeQuery = null
let activeRangeKey = ''

function normalizeApiRow(row, index) {
  return {
    id: index + 1,
    fecha: row.FECHA || row.fecha,
    sede: row.LOCALIDAD || row.sede || 'SIN LOCALIDAD',
    asesor: row.ASESOR || row.asesor || 'SIN NOMBRE',
    convenio: row.NOMBRE_CONVENIO || row.convenio || 'SIN CONVENIO',
    tipo_movimiento: row.TIPO_MOVIMIENTO || row.tipo_movimiento,
    tipo_afiliado: row.TIPO_AFILIADO || row.tipo_afiliado,
    motivo: row.MOTIVO || row.motivo || '',
    estado_contrato: row.ESTADO_CONTRATO || row.estado_contrato,
    retiros: Number(row.RETIROS || row.retiros || 0),
    afiliaciones: Number(row.AFILIACIONES || row.afiliaciones || 0),
    valor_plan: Number(row.VALOR_PLAN || row.valor_plan || 0),
    perdida_mensual: Number(row.PERDIDA_MENSUAL || row.perdida_mensual || 0),
    ingreso_mensual: Number(row.INGRESO_MENSUAL || row.ingreso_mensual || 0),
    contrato: String(row.CONTRATO || row.contrato || ''),
    uen: row.UEN || row.uen || 'SIN UEN',
    tipo_persona: row.TIPO_PERSONA || row.tipo_persona || row.UEN || 'SIN UEN',
    localidad: row.LOCALIDAD || row.localidad || 'SIN LOCALIDAD',
    codigo_convenio: String(row.CODIGO_CONVENIO || row.codigo_convenio || ''),
    nombre_convenio: row.NOMBRE_CONVENIO || row.nombre_convenio || 'SIN CONVENIO',
    plan: row.PLAN || row.plan || 'SIN PLAN',
    codigo_plan: String(row.CODIGO_PLAN || row.codigo_plan || ''),
    periodicidad_pago: row.PERIODICIDAD_PAGO || row.periodicidad_pago || 'SIN DEFINIR',
    cobrador: row.COBRADOR || row.cobrador || 'SIN DEFINIR',
    estado_crystal: row.ESTADO_CRYSTAL || row.estado_crystal || 'SIN ESTADO',
    tipo_mascota: row.TIPO_MASCOTA || row.tipo_mascota || 'NO APLICA',
    total_personas: Number(row.TOTAL_PERSONAS || row.total_personas || 0),
    total_titulares: Number(row.TOTAL_TITULARES || row.total_titulares || 0),
    total_beneficiarios: Number(row.TOTAL_BENEFICIARIOS || row.total_beneficiarios || 0),
    total_mascotas: Number(row.TOTAL_MASCOTAS || row.total_mascotas || 0),
    valor_plan_base: Number(row.VALOR_PLAN_BASE || row.valor_plan_base || 0),
    valor_adicional: Number(row.VALOR_ADICIONAL || row.valor_adicional || 0),
    valor_asistencia: Number(row.VALOR_ASISTENCIA || row.valor_asistencia || 0),
    valor_seguro: Number(row.VALOR_SEGURO || row.valor_seguro || 0),
    valor_mascota: Number(row.VALOR_MASCOTA || row.valor_mascota || 0),
    valor_club: Number(row.VALOR_CLUB || row.valor_club || 0),
  }
}

async function queryPrevisionRows(range) {
  const connection = await connectHana()

  try {
    const rows = await executeQuery(connection, buildPrevisionSql(range))
    return rows.map(normalizeApiRow)
  } finally {
    connection.disconnect()
  }
}

export async function fetchPrevisionRows(range = {}) {
  const rangeKey = `${range.from || ''}:${range.to || ''}`
  const cacheIsFresh = cachedRows && cachedRangeKey === rangeKey && Date.now() - cacheCreatedAt < CACHE_TTL_MS
  if (cacheIsFresh) return cachedRows

  if (activeQuery && activeRangeKey === rangeKey) return activeQuery

  activeRangeKey = rangeKey
  activeQuery = queryPrevisionRows(range)
    .then((rows) => {
      cachedRows = rows
      cacheCreatedAt = Date.now()
      cachedRangeKey = rangeKey
      return rows
    })
    .catch((error) => {
      if (cachedRows && cachedRangeKey === rangeKey) {
        console.warn('[prevision] HANA no respondió; se conserva el último resultado válido.', error.message)
        return cachedRows
      }
      throw error
    })
    .finally(() => {
      activeQuery = null
      activeRangeKey = ''
    })

  return activeQuery
}
