export const COP_FORMATTER = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export const NUMBER_FORMATTER = new Intl.NumberFormat('es-CO')

export const PERCENT_FORMATTER = new Intl.NumberFormat('es-CO', {
  style: 'percent',
  maximumFractionDigits: 1,
})

export function money(value) {
  return COP_FORMATTER.format(value || 0)
}

export function number(value) {
  return NUMBER_FORMATTER.format(value || 0)
}

export function percent(value) {
  return PERCENT_FORMATTER.format(value || 0)
}

export function shortMoney(value) {
  const safeValue = Number(value || 0)
  if (safeValue >= 1000000000) return `$${(safeValue / 1000000000).toFixed(1)}MM`
  if (safeValue >= 1000000) return `$${(safeValue / 1000000).toFixed(1)}M`
  if (safeValue >= 1000) return `$${Math.round(safeValue / 1000)}K`
  return money(safeValue)
}

export function monthLabel(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`)
  return date.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' })
}

export function getUniqueOptions(rows, key) {
  return Array.from(new Set(rows.map((row) => row[key]).filter(Boolean))).sort((a, b) =>
    String(a).localeCompare(String(b), 'es'),
  )
}

export function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function filterRows(rows, filters) {
  const search = normalizeText(filters.search)
  const from = filters.fechaInicial ? new Date(`${filters.fechaInicial}T00:00:00`) : null
  const to = filters.fechaFinal ? new Date(`${filters.fechaFinal}T23:59:59`) : null

  return rows.filter((row) => {
    const rowDate = new Date(`${row.fecha}T00:00:00`)
    const matchesDate = (!from || rowDate >= from) && (!to || rowDate <= to)
    const matchesSearch =
      !search ||
      [
        row.fallecido,
        row.osf,
        row.plan,
        row.estado,
        row.gestor,
        row.sede,
        row.municipio,
        row.clinica,
        row.cementerio,
        row.tipo_homenaje,
        row.tipo_excedente,
        row.lugar_de_fallecimiento,
        row.tipo_servicio,
      ]
        .map(normalizeText)
        .some((field) => field.includes(search))

    return (
      matchesDate &&
      matchesSearch &&
      (filters.sede === 'TODOS' || row.sede === filters.sede) &&
      (filters.gestor === 'TODOS' || row.gestor === filters.gestor) &&
      (filters.tipoHomenaje === 'TODOS' || row.tipo_homenaje === filters.tipoHomenaje) &&
      (filters.tipoExcedente === 'TODOS' || row.tipo_excedente === filters.tipoExcedente) &&
      (filters.lugarFallecimiento === 'TODOS' || row.lugar_de_fallecimiento === filters.lugarFallecimiento) &&
      (filters.tipoServicio === 'TODOS' || row.tipo_servicio === filters.tipoServicio) &&
      (filters.municipio === 'TODOS' || row.municipio === filters.municipio)
    )
  })
}

export function sumBy(rows, key) {
  return rows.reduce((total, row) => total + Number(row[key] || 0), 0)
}

export function groupBy(rows, key, valueKey = 'valor') {
  const map = new Map()

  rows.forEach((row) => {
    const name = row[key] || 'SIN DEFINIR'
    const current = map.get(name) || { name, cantidad: 0, valor: 0, valor_cubierto: 0, valor_excedente: 0 }
    current.cantidad += Number(row.cantidad || 0)
    current.valor += Number(row[valueKey] || 0)
    current.valor_cubierto += Number(row.valor_cubierto || 0)
    current.valor_excedente += Number(row.valor_excedente || 0)
    map.set(name, current)
  })

  return Array.from(map.values()).sort((a, b) => b.valor - a.valor)
}

export function groupByMonth(rows) {
  const map = new Map()

  rows.forEach((row) => {
    const name = monthLabel(row.fecha)
    const key = row.fecha.slice(0, 7)
    const current = map.get(key) || { key, name, servicios: 0, valor: 0, excedentes: 0, cubierto: 0 }
    current.servicios += Number(row.cantidad || 0)
    current.valor += Number(row.valor || 0)
    current.excedentes += Number(row.valor_excedente || 0)
    current.cubierto += Number(row.valor_cubierto || 0)
    map.set(key, current)
  })

  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key))
}

export function withShare(rows, totalKey = 'valor') {
  const total = sumBy(rows, totalKey)
  return rows.map((row) => ({ ...row, share: total ? row[totalKey] / total : 0 }))
}

export function buildKpis(rows) {
  const totalValor = sumBy(rows, 'valor')
  const totalCubierto = sumBy(rows, 'valor_cubierto')
  const totalExcedente = sumBy(rows, 'valor_excedente')
  const totalServicios = sumBy(rows, 'cantidad')
  const particular = rows.filter((row) => row.tipo_homenaje === 'PARTICULAR')
  const particularesValor = sumBy(particular, 'valor')

  return {
    totalValor,
    totalCubierto,
    totalExcedente,
    totalServicios,
    particularesValor,
    ticketPromedio: totalServicios ? totalValor / totalServicios : 0,
    participacionExcedente: totalValor ? totalExcedente / totalValor : 0,
  }
}

export function getInsight(rows) {
  if (!rows.length) return 'No hay registros con los filtros seleccionados.'

  const sedeTop = groupBy(rows, 'sede')[0]
  const tipoTop = groupBy(rows, 'tipo_homenaje')[0]
  const excedenteTop = groupBy(rows, 'tipo_excedente')[0]

  return `La sede con mayor valor ejecutado es ${sedeTop.name}; el tipo de homenaje con más peso es ${tipoTop.name}; y el excedente más representativo es ${excedenteTop.name}.`
}
