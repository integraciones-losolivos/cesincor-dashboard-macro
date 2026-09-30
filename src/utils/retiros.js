import { normalizeText } from './dashboard.js'

export const RETIRO_TODOS = 'TODOS'

export const initialRetirosFilters = {
  search: '',
  fechaInicial: '',
  fechaFinal: '',
  canal: RETIRO_TODOS,
  sede: RETIRO_TODOS,
  subuen: RETIRO_TODOS,
  entidad: RETIRO_TODOS,
  plan: RETIRO_TODOS,
  asesor: RETIRO_TODOS,
  tipoRegistro: RETIRO_TODOS,
  estadoContrato: RETIRO_TODOS,
}

export function filterRetiros(rows, filters) {
  const search = normalizeText(filters.search)
  return rows.filter((row) => (
    (!filters.fechaInicial || row.fecha >= filters.fechaInicial) &&
    (!filters.fechaFinal || row.fecha <= filters.fechaFinal) &&
    (!search || [row.contrato, row.documento, row.nombre, row.entidad, row.plan, row.asesor]
      .map(normalizeText).some((value) => value.includes(search))) &&
    (filters.canal === RETIRO_TODOS || row.canal === filters.canal) &&
    (filters.sede === RETIRO_TODOS || row.sede === filters.sede) &&
    (filters.subuen === RETIRO_TODOS || row.subuen === filters.subuen) &&
    (filters.entidad === RETIRO_TODOS || row.entidad === filters.entidad) &&
    (filters.plan === RETIRO_TODOS || row.plan === filters.plan) &&
    (filters.asesor === RETIRO_TODOS || row.asesor === filters.asesor) &&
    (filters.tipoRegistro === RETIRO_TODOS || row.tipo_registro === filters.tipoRegistro) &&
    (filters.estadoContrato === RETIRO_TODOS || row.estado_contrato === filters.estadoContrato)
  ))
}

export function buildRetirosKpis(rows) {
  const contratos = new Set(rows.filter((row) => row.tipo_registro === 'CONTRATO').map((row) => row.contrato)).size
  const adicionales = rows.filter((row) => row.tipo_registro === 'ADICIONAL').length
  const mascotas = rows.filter((row) => row.tipo_registro === 'MASCOTA').length
  return {
    contratos,
    adicionales,
    mascotas,
    total: contratos + adicionales + mascotas,
    participacionMascotas: contratos + adicionales + mascotas ? mascotas / (contratos + adicionales + mascotas) : 0,
  }
}

export function groupRetiros(rows, key, { limit } = {}) {
  const grouped = new Map()
  rows.forEach((row) => {
    const name = row[key] || 'SIN DEFINIR'
    const current = grouped.get(name) || { name, cantidad: 0 }
    current.cantidad += 1
    grouped.set(name, current)
  })
  const result = [...grouped.values()].sort((a, b) => b.cantidad - a.cantidad || a.name.localeCompare(b.name))
  return limit ? result.slice(0, limit) : result
}

export function buildRetirosComposition(rows) {
  const total = buildRetirosKpis(rows).total
  return groupRetiros(rows, 'canal').map((item) => ({
    ...item,
    porcentaje: total ? item.cantidad / total : 0,
  }))
}

export function groupRetirosBySede(rows) {
  const grouped = new Map()
  rows.forEach((row) => {
    const sede = row.sede || 'SIN SEDE'
    const subuen = row.subuen || 'SIN SUBUEN'
    const key = `${sede}\u0000${subuen}`
    const current = grouped.get(key) || { name: sede, subuen, cantidad: 0 }
    current.cantidad += 1
    grouped.set(key, current)
  })
  return [...grouped.values()].sort((a, b) => b.cantidad - a.cantidad).slice(0, 10)
}
