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
    (!search || [row.contrato, row.documento, row.nombre, row.numero_convenio, row.entidad, row.nombre_entidad, row.plan, row.asesor]
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

export function buildRetirosValueKpis(rows) {
  const applicable = rows.filter((row) => row.aplica_valor)
  const total = applicable.reduce((sum, row) => sum + Number(row.valor_asociado || 0), 0)
  const contracts = applicable.filter((row) => row.tipo_registro === 'CONTRATO')
  const contractValue = contracts.reduce((sum, row) => sum + Number(row.valor_asociado || 0), 0)
  const businessValue = contracts.filter((row) => row.canal === 'EMPRESARIALES').reduce((sum, row) => sum + Number(row.valor_asociado || 0), 0)
  const independentValue = contracts.filter((row) => row.canal === 'INDEPENDIENTES').reduce((sum, row) => sum + Number(row.valor_asociado || 0), 0)
  return { total, contractValue, businessValue, independentValue, average: applicable.length ? total / applicable.length : 0, applicable: applicable.length, withoutValue: applicable.filter((row) => !Number(row.valor_asociado || 0)).length }
}

export function buildValueSummary(rows, key) {
  const totalValue = buildRetirosValueKpis(rows).total
  const grouped = new Map()
  rows.forEach((row) => {
    const name = row[key] || 'SIN DEFINIR'
    const current = grouped.get(name) || []
    current.push(row)
    grouped.set(name, current)
  })
  return [...grouped.entries()].map(([name, entries]) => {
    const value = buildRetirosValueKpis(entries)
    const cantidad = buildRetirosKpis(entries).total
    return { name, cantidad, valor: value.total, promedio: value.applicable ? value.total / value.applicable : 0, participacion: totalValue ? value.total / totalValue : 0, unidadesValoradas: value.applicable }
  }).sort((a, b) => b.valor - a.valor || a.name.localeCompare(b.name))
}

export function buildValueMonthly(rows) {
  const grouped = new Map()
  rows.filter((row) => row.aplica_valor && row.fecha).forEach((row) => {
    const key = row.fecha.slice(0, 7)
    const current = grouped.get(key) || { key, valor: 0, empresariales: 0, independientes: 0, adicionales_personas: 0, adicionales_mascotas: 0 }
    const value = Number(row.valor_asociado || 0)
    current.valor += value
    const channelKey = String(row.canal || '').toLowerCase().replaceAll(' ', '_')
    if (channelKey in current) current[channelKey] += value
    grouped.set(key, current)
  })
  let previous = null
  return [...grouped.values()].sort((a, b) => a.key.localeCompare(b.key)).map((item) => {
    const variacion = previous === null ? null : item.valor - previous
    const variacionPorcentual = previous ? variacion / previous : null
    previous = item.valor
    return { ...item, variacion, variacionPorcentual }
  })
}

export const PERMANENCE_RANGES = [
  { key: 'MENOS_1_MES', name: 'Menos de 1 mes', min: 0, max: 29 },
  { key: '1_A_3_MESES', name: '1 a 3 meses', min: 30, max: 90 },
  { key: '4_A_6_MESES', name: '4 a 6 meses', min: 91, max: 180 },
  { key: '7_A_12_MESES', name: '7 a 12 meses', min: 181, max: 365 },
  { key: '1_A_2_ANOS', name: '1 a 2 años', min: 366, max: 730 },
  { key: '2_A_5_ANOS', name: '2 a 5 años', min: 731, max: 1825 },
  { key: 'MAS_5_ANOS', name: 'Más de 5 años', min: 1826, max: Infinity },
  { key: 'SIN_CALCULO', name: 'Sin permanencia calculable', invalid: true },
]

export function additionalRows(rows) { return rows.filter((row) => row.codigo_tipo === 'A' || row.codigo_tipo === 'M') }
export function permanenceRange(row) {
  const days = row.dias_permanencia
  if (days === null || days === undefined || days < 0) return PERMANENCE_RANGES.at(-1)
  return PERMANENCE_RANGES.find((range) => !range.invalid && days >= range.min && days <= range.max)
}
function median(values) {
  const sorted = values.filter((value) => Number.isFinite(value) && value >= 0).sort((a, b) => a - b)
  if (!sorted.length) return null
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}
export function buildPermanenceKpis(rows) {
  const additions = additionalRows(rows)
  const valid = additions.map((row) => row.dias_permanencia).filter((days) => Number.isFinite(days) && days >= 0)
  return {
    total: additions.length, calculable: valid.length, invalid: additions.length - valid.length,
    average: valid.length ? valid.reduce((sum, days) => sum + days, 0) / valid.length : null,
    median: median(valid), before1: valid.filter((days) => days < 30).length,
    before3: valid.filter((days) => days < 90).length, before6: valid.filter((days) => days < 180).length,
    over1Year: valid.filter((days) => days > 365).length,
  }
}
export function buildPermanenceDistribution(rows) {
  const additions = additionalRows(rows)
  return PERMANENCE_RANGES.map((range) => ({
    key: range.key, name: range.name,
    cantidad: additions.filter((row) => permanenceRange(row)?.key === range.key).length,
    mayor: additions.filter((row) => row.codigo_tipo === 'A' && permanenceRange(row)?.key === range.key).length,
    menor: additions.filter((row) => row.codigo_tipo === 'M' && permanenceRange(row)?.key === range.key).length,
  }))
}
export function buildPermanenceSummary(rows, key) {
  const grouped = new Map()
  additionalRows(rows).forEach((row) => {
    const name = row[key] || 'SIN DEFINIR'
    const current = grouped.get(name) || []
    current.push(row); grouped.set(name, current)
  })
  return [...grouped.entries()].map(([name, entries]) => {
    const kpis = buildPermanenceKpis(entries)
    return { name, ...kpis, earlyPercentage: kpis.calculable ? kpis.before6 / kpis.calculable : 0 }
  }).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
}
export function buildPermanenceMonthly(rows) {
  const grouped = new Map()
  additionalRows(rows).forEach((row) => {
    const key = row.fecha?.slice(0, 7)
    if (!key) return
    const current = grouped.get(key) || []
    current.push(row); grouped.set(key, current)
  })
  return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, entries]) => ({ key, ...buildPermanenceKpis(entries) }))
}

export function petRows(rows) { return rows.filter((row) => row.codigo_tipo === 'P' || row.codigo_tipo === 'D') }
export function buildPetKpis(rows, allRetirements = rows) {
  const pets = petRows(rows)
  const valid = pets.map((row) => row.dias_permanencia).filter((days) => Number.isFinite(days) && days >= 0)
  const totalRetirements = buildRetirosKpis(allRetirements).total
  return {
    total: pets.length, pet: pets.filter((row) => row.codigo_tipo === 'P').length,
    additionalPet: pets.filter((row) => row.codigo_tipo === 'D').length,
    contracts: new Set(pets.map((row) => row.contrato)).size,
    participation: totalRetirements ? pets.length / totalRetirements : 0,
    calculable: valid.length, invalid: pets.length - valid.length,
    average: valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null,
    median: median(valid), before1: valid.filter((value) => value < 30).length,
    before6: valid.filter((value) => value < 180).length, over1Year: valid.filter((value) => value > 365).length,
  }
}
export function buildPetMonthly(rows) {
  const grouped = new Map()
  petRows(rows).forEach((row) => {
    const key = row.fecha?.slice(0, 7)
    if (!key) return
    const current = grouped.get(key) || { key, mascota: 0, mascotaAdicional: 0, total: 0 }
    if (row.codigo_tipo === 'P') current.mascota += 1
    if (row.codigo_tipo === 'D') current.mascotaAdicional += 1
    current.total += 1; grouped.set(key, current)
  })
  let previous = null
  return [...grouped.values()].sort((a, b) => a.key.localeCompare(b.key)).map((item) => {
    const variation = previous === null ? null : item.total - previous
    const variationPercentage = previous ? variation / previous : null
    previous = item.total
    return { ...item, variation, variationPercentage }
  })
}
export function buildPetSummary(rows, key) {
  const pets = petRows(rows), grouped = new Map()
  pets.forEach((row) => {
    const name = row[key] || 'SIN DEFINIR', current = grouped.get(name) || []
    current.push(row); grouped.set(name, current)
  })
  return [...grouped.entries()].map(([name, entries]) => {
    const kpis = buildPetKpis(entries, pets)
    return { name, total: kpis.total, mascota: kpis.pet, mascotaAdicional: kpis.additionalPet, porcentaje: pets.length ? kpis.total / pets.length : 0, average: kpis.average, median: kpis.median, principalPlan: groupRetirosCounted(entries, 'plan', { limit: 1 })[0]?.name || 'SIN PLAN', principalSede: groupRetirosCounted(entries, 'sede', { limit: 1 })[0]?.name || 'SIN SEDE', principalAsesor: groupRetirosCounted(entries, 'asesor', { limit: 1 })[0]?.name || 'SIN ASESOR' }
  }).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
}
export function buildPetPermanenceDistribution(rows) {
  const pets = petRows(rows)
  return PERMANENCE_RANGES.map((range) => ({ name: range.name, cantidad: pets.filter((row) => permanenceRange(row)?.key === range.key).length }))
}

export function hasContactValue(value) { return String(value || '').trim().length > 0 }
export function isContactable(row) { return [row.telefono_1, row.telefono_2, row.celular, row.correo].some(hasContactValue) }
export const QUALITY_ALERTS = [
  { key: 'SIN_TELEFONO', name: 'Sin teléfono', test: (row) => ![row.telefono_1, row.telefono_2, row.celular].some(hasContactValue) },
  { key: 'SIN_CORREO', name: 'Sin correo', test: (row) => !hasContactValue(row.correo) },
  { key: 'SIN_CONTACTO', name: 'Sin teléfono ni correo', test: (row) => !isContactable(row) },
  { key: 'SIN_DIRECCION', name: 'Sin dirección', test: (row) => !hasContactValue(row.direccion) },
  { key: 'SIN_ASESOR', name: 'Sin asesor', test: (row) => !hasContactValue(row.asesor) || row.asesor === 'SIN ASESOR' },
  { key: 'SIN_PLAN', name: 'Sin plan', test: (row) => !hasContactValue(row.plan) || row.plan === 'SIN PLAN' },
  { key: 'SIN_SEDE', name: 'Sin sede', test: (row) => !hasContactValue(row.sede) || row.sede === 'SIN SEDE' },
  { key: 'SIN_ENTIDAD', name: 'Sin entidad / convenio', test: (row) => !hasContactValue(row.entidad) || row.entidad === 'SIN ENTIDAD' },
  { key: 'SIN_FECHA_RETIRO', name: 'Sin fecha de retiro', test: (row) => !hasContactValue(row.fecha) },
  { key: 'SIN_CANAL', name: 'Sin canal clasificado', test: (row) => !hasContactValue(row.canal) || row.canal === 'SIN CLASIFICAR' },
]
export function buildQualityKpis(rows) {
  const withPhone = rows.filter((row) => [row.telefono_1, row.telefono_2, row.celular].some(hasContactValue)).length
  const withEmail = rows.filter((row) => hasContactValue(row.correo)).length
  const contactable = rows.filter(isContactable).length
  return { total: rows.length, withPhone, withoutPhone: rows.length - withPhone, withEmail, withoutEmail: rows.length - withEmail, contactable, notContactable: rows.length - contactable, contactablePercentage: rows.length ? contactable / rows.length : 0 }
}
export function buildQualityAlerts(rows) {
  return QUALITY_ALERTS.map((alert) => { const matched = rows.filter(alert.test); return { ...alert, cantidad: matched.length, porcentaje: rows.length ? matched.length / rows.length : 0 } })
}
export function buildQualityDimension(rows, key) {
  const grouped = new Map()
  rows.forEach((row) => { const name = row[key] || 'SIN DEFINIR'; const current = grouped.get(name) || []; current.push(row); grouped.set(name, current) })
  return [...grouped.entries()].map(([name, entries]) => ({ name, ...buildQualityKpis(entries) })).sort((a, b) => b.notContactable - a.notContactable || b.total - a.total)
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
    const current = grouped.get(name) || { name, rows: [] }
    current.rows.push(row)
    grouped.set(name, current)
  })
  const result = [...grouped.values()]
    .map(({ name, rows: groupedRows }) => ({ name, cantidad: buildRetirosKpis(groupedRows).total }))
    .sort((a, b) => b.cantidad - a.cantidad || a.name.localeCompare(b.name))
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
    const current = grouped.get(key) || { name: sede, subuen, rows: [] }
    current.rows.push(row)
    grouped.set(key, current)
  })
  return [...grouped.values()]
    .map(({ name, subuen, rows: groupedRows }) => ({ name, subuen, cantidad: buildRetirosKpis(groupedRows).total }))
    .sort((a, b) => b.cantidad - a.cantidad).slice(0, 10)
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

export function timelineKey(dateValue, granularity = 'monthly') {
  if (!dateValue || granularity === 'monthly') return dateValue?.slice(0, 7) || ''
  if (granularity === 'daily') return dateValue.slice(0, 10)
  const date = new Date(`${dateValue.slice(0, 10)}T00:00:00`)
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  return date.toISOString().slice(0, 10)
}

export function buildRetirosTimeline(rows, granularity = 'monthly', range = {}) {
  if (granularity === 'monthly') return buildRetirosMonthly(rows, range)
  const grouped = new Map()
  rows.forEach((row) => { const key = timelineKey(row.fecha, granularity); if (!key) return; const current = grouped.get(key) || []; current.push(row); grouped.set(key, current) })
  let previous = null
  return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, entries]) => {
    const kpis = buildRetirosKpis(entries)
    const empresariales = new Set(entries.filter((row) => row.canal === 'EMPRESARIALES').map((row) => row.contrato)).size
    const independientes = new Set(entries.filter((row) => row.canal === 'INDEPENDIENTES').map((row) => row.contrato)).size
    const item = { key, total: kpis.total, contratos: kpis.contratos, adicionales: kpis.adicionales, mascotas: kpis.mascotas, empresariales, independientes,
      adicionalMayor: entries.filter((row) => row.codigo_tipo === 'A').length, adicionalMenor: entries.filter((row) => row.codigo_tipo === 'M').length,
      mascota: entries.filter((row) => row.codigo_tipo === 'P').length, mascotaAdicional: entries.filter((row) => row.codigo_tipo === 'D').length }
    item.variacion = previous === null ? null : item.total - previous
    item.variacionPorcentual = previous ? item.variacion / previous : null
    previous = item.total
    return item
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
