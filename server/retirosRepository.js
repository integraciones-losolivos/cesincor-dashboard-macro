import { connectHana, executeQuery } from './hanaConnection.js'
import { buildRetirosSql } from './retirosSql.js'
import { createPersistentRangeCache } from './persistentRangeCache.js'

const CACHE_TTL_MS = Number(process.env.RETIROS_CACHE_TTL_MS || 6 * 60 * 60 * 1000)

function number(value) { return Number(value || 0) }
function nullableNumber(value) { return value === null || value === undefined || value === '' ? null : Number(value) }

function normalize(row, index) {
  const tipoRetiro = row.TIPO_RETIRO || 'SIN DEFINIR'
  return { id: `${row.CONTRATO}-${row.LINEA}-${tipoRetiro || index}`, contrato: String(row.CONTRATO || ''), linea: number(row.LINEA), fecha: row.FECHA, fecha_ingreso: row.FECHA_INGRESO, fecha_novedad: row.FECHA_NOVEDAD, fecha_registro_novedad: row.FECHA_REGISTRO_NOVEDAD, documento: row.DOCUMENTO || '', nombre: row.NOMBRE || 'SIN NOMBRE', asegurado_principal: row.ASEGURADO_PRINCIPAL || 'SIN ASEGURADO PRINCIPAL', codigo_tipo: row.CODIGO_TIPO || '', tipo_registro: row.TIPO_REGISTRO || 'SIN DEFINIR', tipo_retiro: tipoRetiro, canal: row.CANAL || 'SIN CLASIFICAR', causal_retiro: row.CAUSAL_RETIRO || 'SIN CAUSAL IDENTIFICADA', codigo_causal: row.CODIGO_CAUSAL || '', detalle_causal: row.DETALLE_CAUSAL || '', codigo_plan: row.CODIGO_PLAN || '', plan: row.PLAN || 'SIN PLAN', asesor: row.ASESOR || 'SIN ASESOR', sede: row.SEDE || 'SIN SEDE', entidad: row.ENTIDAD || 'SIN ENTIDAD', subuen: row.SUBUEN || 'SIN SUBUEN', codigo_municipio: row.CODIGO_MUNICIPIO || '', municipio: row.MUNICIPIO || 'SIN MUNICIPIO', valor_asociado: number(row.VALOR_ASOCIADO), tipo_valor: row.TIPO_VALOR || 'SIN VALOR IDENTIFICADO', aplica_valor: number(row.APLICA_VALOR) === 1, estado_contrato: row.ESTADO_CONTRATO || 'SIN ESTADO', dias_permanencia: nullableNumber(row.DIAS_PERMANENCIA), meses_vigencia: number(row.MESES_VIGENCIA) }
}

async function queryRetiros(range) {
  const connection = await connectHana()
  try {
    return (await executeQuery(connection, buildRetirosSql(range))).map(normalize)
  } finally { connection.disconnect() }
}

const loadCachedRange = createPersistentRangeCache({
  // v10 invalida filas persistidas antes de incorporar permanencia numérica.
  namespace: `retiros-v10-${process.env.HANA_SCHEMA || 'default'}`,
  ttlMs: CACHE_TTL_MS,
  dateField: 'fecha',
  rowKey: (row) => row.id,
})

export async function fetchRetiros(range = {}) {
  return loadCachedRange(range, queryRetiros)
}
