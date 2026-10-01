import { normalizeText } from './dashboard.js'

export const RETIRO_TODOS = 'TODOS'
export const RETIRO_CHANNELS = ['EMPRESARIALES', 'INDEPENDIENTES', 'ADICIONALES PERSONAS', 'ADICIONALES MASCOTAS']

export const initialRetirosFilters = {
  search: '',
  fechaInicial: '',
  fechaFinal: '',
  canal: RETIRO_TODOS,
  sede: RETIRO_TODOS,
  subuen: RETIRO_TODOS,
  municipio: RETIRO_TODOS,
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
    (filters.municipio === RETIRO_TODOS || row.municipio === filters.municipio) &&
    (filters.entidad === RETIRO_TODOS || row.entidad === filters.entidad) &&
    (filters.plan === RETIRO_TODOS || row.plan === filters.plan) &&
    (filters.asesor === RETIRO_TODOS || row.asesor === filters.asesor) &&
    (filters.tipoRetiro === RETIRO_TODOS || row.tipo_retiro === filters.tipoRetiro) &&
    (filters.causal === RETIRO_TODOS || row.causal_retiro === filters.causal) &&
    (filters.estadoContrato === RETIRO_TODOS || row.estado_contrato === filters.estadoContrato)
  ))
}

export function buildTerritorySummary(rows, key = 'sede') {
  const total = buildRetirosKpis(rows).total
  const grouped = new Map()
  rows.forEach((row) => {
    const name = row[key] || `SIN ${key.toUpperCase()}`
    const current = grouped.get(name) || []
    current.push(row)
    grouped.set(name, current)
  })
  return [...grouped.entries()].map(([name, entries]) => {
    const kpis = buildRetirosKpis(entries)
    const channels = buildChannelSummary(entries)
    return {
      name, total: kpis.total, contratos: kpis.contratos, adicionales: kpis.adicionales, mascotas: kpis.mascotas,
      empresariales: channels[0].cantidad, independientes: channels[1].cantidad,
      adicionales_personas: channels[2].cantidad, adicionales_mascotas: channels[3].cantidad,
      porcentaje: total ? kpis.total / total : 0,
      principalCausal: buildCausalSummary(entries)[0]?.name || 'SIN CAUSAL IDENTIFICADA',
    }
  }).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
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

function channelCount(rows, channel) {
  const selected = rows.filter((row) => row.canal === channel)
  if (channel === 'EMPRESARIALES' || channel === 'INDEPENDIENTES') {
    return new Set(selected.map((row) => row.contrato)).size
  }
  return selected.length
}

function topNames(rows, key, limit = 3) {
  const grouped = new Map()
  rows.forEach((row) => {
    const name = row[key] || 'SIN DEFINIR'
    const current = grouped.get(name) || []
    current.push(row)
    grouped.set(name, current)
  })
  return [...grouped.entries()].map(([name, entries]) => ({ name, cantidad: channelCount(entries, entries[0]?.canal) }))
    .sort((a, b) => b.cantidad - a.cantidad).slice(0, limit)
}

export function buildChannelSummary(rows) {
  const total = buildRetirosKpis(rows).total
  return RETIRO_CHANNELS.map((name) => {
    const channelRows = rows.filter((row) => row.canal === name)
    const cantidad = channelCount(channelRows, name)
    return {
      name,
      cantidad,
      porcentaje: total ? cantidad / total : 0,
      contratos: name === 'EMPRESARIALES' || name === 'INDEPENDIENTES' ? cantidad : 0,
      adicionales: name === 'ADICIONALES PERSONAS' ? cantidad : 0,
      mascotas: name === 'ADICIONALES MASCOTAS' ? cantidad : 0,
      planes: topNames(channelRows, 'plan'),
      sedes: topNames(channelRows, 'sede'),
    }
  })
}

export function buildChannelDimension(rows, key, { limit = 8 } = {}) {
  const grouped = new Map()
  rows.forEach((row) => {
    const name = row[key] || 'SIN DEFINIR'
    const current = grouped.get(name) || []
    current.push(row)
    grouped.set(name, current)
  })
  return [...grouped.entries()].map(([name, entries]) => {
    const item = { name, total: 0 }
    RETIRO_CHANNELS.forEach((channel) => {
      const keyName = channel.toLowerCase().replaceAll(' ', '_')
      item[keyName] = channelCount(entries, channel)
      item.total += item[keyName]
    })
    return item
  }).sort((a, b) => b.total - a.total).slice(0, limit)
}

export function groupRetirosCounted(rows, key, { limit } = {}) {
  const grouped = new Map()
  rows.forEach((row) => {
    const name = row[key] || 'SIN DEFINIR'
    const current = grouped.get(name) || []
    current.push(row)
    grouped.set(name, current)
  })
  const result = [...grouped.entries()].map(([name, entries]) => ({ name, cantidad: buildRetirosKpis(entries).total }))
    .sort((a, b) => b.cantidad - a.cantidad || a.name.localeCompare(b.name))
  return limit ? result.slice(0, limit) : result
}

export function buildAdvisorSummary(rows) {
  const total = buildRetirosKpis(rows).total
  const grouped = new Map()
  rows.forEach((row) => {
    const name = row.asesor || 'SIN ASESOR'
    const current = grouped.get(name) || []
    current.push(row)
    grouped.set(name, current)
  })
  return [...grouped.entries()].map(([name, entries]) => {
    const kpis = buildRetirosKpis(entries)
    const channels = buildChannelSummary(entries)
    const cause = buildCausalSummary(entries)[0]
    return {
      name, total: kpis.total, contratos: kpis.contratos, adicionales: kpis.adicionales, mascotas: kpis.mascotas,
      empresariales: channels[0].cantidad, independientes: channels[1].cantidad,
      porcentaje: total ? kpis.total / total : 0, principalCausal: cause?.name || 'SIN CAUSAL IDENTIFICADA',
    }
  }).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
}

export function buildPlanSummary(rows) {
  const total = buildRetirosKpis(rows).total
  const grouped = new Map()
  rows.forEach((row) => {
    const name = row.plan || 'SIN PLAN'
    const current = grouped.get(name) || []
    current.push(row)
    grouped.set(name, current)
  })
  return [...grouped.entries()].map(([name, entries]) => {
    const kpis = buildRetirosKpis(entries)
    const channels = buildChannelSummary(entries)
    const cause = buildCausalSummary(entries)[0]
    return {
      name, codigo: entries[0]?.codigo_plan || '', total: kpis.total, contratos: kpis.contratos,
      adicionales: kpis.adicionales, mascotas: kpis.mascotas, empresariales: channels[0].cantidad,
      independientes: channels[1].cantidad, porcentaje: total ? kpis.total / total : 0,
      principalCausal: cause?.name || 'SIN CAUSAL IDENTIFICADA',
    }
  }).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
}
