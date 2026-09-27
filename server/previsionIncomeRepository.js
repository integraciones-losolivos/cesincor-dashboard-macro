import { connectHana, executeQuery } from './hanaConnection.js'
import { buildPrevisionIncomeSql } from './previsionIncomeSql.js'

const CACHE_TTL_MS = Number(process.env.PREVISION_INCOME_CACHE_TTL_MS || 10 * 60 * 1000)
const cache = new Map()

function normalizedDate(value) {
  const match = String(value || '').match(/^\d{4}-\d{2}-\d{2}/)
  return match ? match[0] : null
}

function calculateAge(dateValue, cutoff = new Date()) {
  if (!dateValue) return null
  const birth = new Date(`${dateValue}T00:00:00`)
  if (Number.isNaN(birth.getTime())) return null
  let age = cutoff.getFullYear() - birth.getFullYear()
  const beforeBirthday = cutoff.getMonth() < birth.getMonth()
    || (cutoff.getMonth() === birth.getMonth() && cutoff.getDate() < birth.getDate())
  if (beforeBirthday) age -= 1
  return age
}

function normalizeRow(row, index) {
  return {
    id: `${row.CONTRATO || ''}-${row.LINEA ?? index}`,
    contrato: String(row.CONTRATO || ''),
    linea: Number(row.LINEA || 0),
    documento: String(row.DOCUMENTO || ''),
    nombre: [row.PRIMER_NOMBRE, row.SEGUNDO_NOMBRE, row.PRIMER_APELLIDO, row.SEGUNDO_APELLIDO]
      .map((value) => String(value || '').trim()).filter(Boolean).join(' '),
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
    fechaNacimiento: normalizedDate(row.FECHA_NACIMIENTO),
    valorFacturado: Number(row.VALOR_FACTURADO || 0),
  }
}

function decorateQuality(rows) {
  const cutoff = new Date()
  cutoff.setHours(0, 0, 0, 0)
  const cutoffKey = [cutoff.getFullYear(), String(cutoff.getMonth() + 1).padStart(2, '0'), String(cutoff.getDate()).padStart(2, '0')].join('-')
  const titularState = new Map(rows.filter((row) => row.tipoAfiliado === 'TITULAR').map((row) => [row.contrato, row.estado]))
  return rows.map((row) => {
    const edad = calculateAge(row.fechaNacimiento, cutoff)
    const alertas = []
    if (row.estado === 'ACTIVO' && titularState.get(row.contrato) !== 'ACTIVO') alertas.push('TITULAR_NO_ACTIVO')
    if (row.tipoAfiliado === 'TITULAR' && row.estado === 'ACTIVO' && row.valorFacturado === 0) alertas.push('TITULAR_SIN_FACTURACION')
    if (row.fechaIngreso && row.fechaIngreso > cutoffKey) alertas.push('INGRESO_POSTERIOR_CORTE')
    if (row.fechaInicioVigencia && row.fechaInicioVigencia > cutoffKey) alertas.push('VIGENCIA_POSTERIOR_CORTE')
    if (!row.fechaNacimiento) alertas.push('NACIMIENTO_INVALIDO')
    if (row.fechaNacimiento && row.fechaNacimiento > cutoffKey) alertas.push('NACIMIENTO_FUTURO')
    if (edad !== null && edad > 120) alertas.push('EDAD_MAYOR_120')
    return { ...row, edad, alertas }
  })
}

export function toPublicIncomeRow(row) {
  const { documento: _documento, nombre: _nombre, fechaNacimiento: _fechaNacimiento, ...publicRow } = row
  return publicRow
}

export function buildIncomeAlertDetails(rows, alert, filters = {}) {
  const matches = (value, selected) => !selected || selected === 'TODOS' || String(value || '') === selected
  const search = String(filters.search || '').trim().toUpperCase()
  return rows
    .filter((row) => row.alertas.includes(alert)
      && matches(row.sede, filters.sede)
      && matches(row.plan, filters.plan)
      && matches(row.convenio, filters.convenio)
      && matches(row.asesor, filters.asesor)
      && matches(row.categoriaProtegido, filters.tipoAfiliado)
      && matches(row.parentesco, filters.parentesco)
      && matches(row.estado, filters.estado)
      && (!search || [row.contrato, row.documento, row.nombre, row.plan, row.convenio, row.sede, row.asesor]
        .some((value) => String(value || '').toUpperCase().includes(search))))
    .slice(0, 500)
    .map((row) => ({
      id: row.id, contrato: row.contrato, documento: row.documento, nombre: row.nombre,
      categoriaProtegido: row.categoriaProtegido, estado: row.estado,
      fechaIngreso: row.fechaIngreso, fechaNacimiento: row.fechaNacimiento, edad: row.edad,
      plan: row.plan, convenio: row.convenio, sede: row.sede, asesor: row.asesor,
      valorFacturado: row.valorFacturado,
    }))
}

export async function fetchPrevisionIncomeRows(range = {}) {
  const key = `${range.from || ''}:${range.to || ''}`
  const hit = cache.get(key)
  if (!range.forceRefresh && hit && Date.now() - hit.createdAt < CACHE_TTL_MS) return hit.rows

  let connection
  try {
    connection = await connectHana({ attempts: 5, retryDelayMs: 2500 })
    const rows = await executeQuery(connection, buildPrevisionIncomeSql(range))
    const normalized = decorateQuality(rows.map(normalizeRow))
    cache.set(key, { createdAt: Date.now(), rows: normalized })
    return normalized
  } catch (error) {
    if (hit) return hit.rows
    throw error
  } finally {
    connection?.disconnect()
  }
}
