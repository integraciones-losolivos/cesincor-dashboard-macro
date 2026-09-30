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
  tipoRetiro: RETIRO_TODOS,
  causal: RETIRO_TODOS,
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
    (filters.tipoRetiro === RETIRO_TODOS || row.tipo_retiro === filters.tipoRetiro) &&
    (filters.causal === RETIRO_TODOS || row.causal_retiro === filters.causal) &&
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

function monthKeys(from, to, rows) {
  const rowKeys = rows.map((row) => row.fecha?.slice(0, 7)).filter(Boolean).sort()
  const first = from?.slice(0, 7) || rowKeys[0]
  const last = to?.slice(0, 7) || rowKeys.at(-1)
  if (!first || !last || first > last) return []
  const [year, month] = first.split('-').map(Number)
  const cursor = new Date(year, month - 1, 1)
  const result = []
  while (`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}` <= last) {
    result.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`)
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return result
}

export function buildRetirosMonthly(rows, { from = '', to = '' } = {}) {
  const grouped = new Map(monthKeys(from, to, rows).map((key) => [key, {
    key, contratosSet: new Set(), adicionales: 0, mascotas: 0, empresarialesSet: new Set(), independientesSet: new Set(),
    adicionalMayor: 0, adicionalMenor: 0, mascota: 0, mascotaAdicional: 0,
  }]))
  rows.forEach((row) => {
    const key = row.fecha?.slice(0, 7)
    if (!key) return
    const current = grouped.get(key) || { key, contratosSet: new Set(), adicionales: 0, mascotas: 0, empresarialesSet: new Set(), independientesSet: new Set(), adicionalMayor: 0, adicionalMenor: 0, mascota: 0, mascotaAdicional: 0 }
    if (row.tipo_registro === 'CONTRATO') current.contratosSet.add(row.contrato)
    if (row.tipo_registro === 'ADICIONAL') current.adicionales += 1
    if (row.tipo_registro === 'MASCOTA') current.mascotas += 1
    if (row.canal === 'EMPRESARIALES') current.empresarialesSet.add(row.contrato)
    if (row.canal === 'INDEPENDIENTES') current.independientesSet.add(row.contrato)
    if (row.codigo_tipo === 'A') current.adicionalMayor += 1
    if (row.codigo_tipo === 'M') current.adicionalMenor += 1
    if (row.codigo_tipo === 'P') current.mascota += 1
    if (row.codigo_tipo === 'D') current.mascotaAdicional += 1
    grouped.set(key, current)
  })
  let previous = null
  return [...grouped.values()].sort((a, b) => a.key.localeCompare(b.key)).map((item) => {
    const contratos = item.contratosSet.size
    const empresariales = item.empresarialesSet.size
    const independientes = item.independientesSet.size
    const total = contratos + item.adicionales + item.mascotas
    const variacion = previous === null ? null : total - previous
    const variacionPorcentual = previous ? variacion / previous : null
    previous = total
    return { ...item, contratos, empresariales, independientes, total, variacion, variacionPorcentual }
  })
}

export function buildCausalSummary(rows) {
  const total = buildRetirosKpis(rows).total
  const grouped = new Map()
  rows.forEach((row) => {
    const causal = row.causal_retiro || 'SIN CAUSAL IDENTIFICADA'
    const current = grouped.get(causal) || {
      name: causal, contratosSet: new Set(), adicionales: 0, mascotas: 0,
      empresarialesSet: new Set(), independientesSet: new Set(),
    }
    if (row.tipo_registro === 'CONTRATO') current.contratosSet.add(row.contrato)
    if (row.tipo_registro === 'ADICIONAL') current.adicionales += 1
    if (row.tipo_registro === 'MASCOTA') current.mascotas += 1
    if (row.canal === 'EMPRESARIALES') current.empresarialesSet.add(row.contrato)
    if (row.canal === 'INDEPENDIENTES') current.independientesSet.add(row.contrato)
    grouped.set(causal, current)
  })
  return [...grouped.values()].map((item) => {
    const contratos = item.contratosSet.size
    const empresariales = item.empresarialesSet.size
    const independientes = item.independientesSet.size
    const cantidad = contratos + item.adicionales + item.mascotas
    return { name: item.name, cantidad, porcentaje: total ? cantidad / total : 0, contratos, adicionales: item.adicionales, mascotas: item.mascotas, empresariales, independientes }
  }).sort((a, b) => b.cantidad - a.cantidad || a.name.localeCompare(b.name))
}

export function buildCausalMonthly(rows, causal) {
  const selected = causal ? rows.filter((row) => row.causal_retiro === causal) : rows
  const bounds = selected.map((row) => row.fecha).filter(Boolean).sort()
  return buildRetirosMonthly(selected, { from: bounds[0], to: bounds.at(-1) })
}
