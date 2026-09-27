const text = (value) => String(value || '').trim()
const upper = (value) => text(value).toUpperCase()

export const incomeInitialFilters = {
  search: '',
  fechaInicial: '',
  fechaFinal: '',
  sede: 'TODOS',
  plan: 'TODOS',
  convenio: 'TODOS',
  asesor: 'TODOS',
  tipoAfiliado: 'TODOS',
  parentesco: 'TODOS',
  estado: 'ACTIVO',
}

export function incomeOptions(rows) {
  const options = (key) => [...new Set(rows.map((row) => text(row[key])).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'))
  return {
    sedes: options('sede'),
    planes: options('plan'),
    convenios: options('convenio'),
    asesores: options('asesor'),
    tiposAfiliado: options('categoriaProtegido'),
    parentescos: options('parentesco'),
    estados: options('estado'),
  }
}

export function filterIncomeRows(rows, filters) {
  const search = upper(filters.search)
  const matches = (value, selected) => selected === 'TODOS' || text(value) === selected
  const dimensionRows = rows.filter((row) => {
    if (search && ![row.contrato, row.plan, row.convenio, row.sede, row.asesor, row.parentesco]
      .some((value) => upper(value).includes(search))) return false
    return matches(row.sede, filters.sede)
      && matches(row.plan, filters.plan)
      && matches(row.convenio, filters.convenio)
      && matches(row.asesor, filters.asesor)
      && matches(row.estado, filters.estado)
  })
  const contractsWithActiveTitular = new Set(dimensionRows
    .filter((row) => row.tipoAfiliado === 'TITULAR' && row.estado === 'ACTIVO')
    .map((row) => row.contrato))
  return dimensionRows.filter((row) => contractsWithActiveTitular.has(row.contrato)
    && matches(row.categoriaProtegido, filters.tipoAfiliado)
    && matches(row.parentesco, filters.parentesco))
}

export function buildIncomeSummary(rows) {
  const uniquePeople = new Map(rows.map((row) => [row.id, row]))
  const people = [...uniquePeople.values()]
  const titulares = people.filter((row) => row.tipoAfiliado === 'TITULAR')
  const adicionalesPersonas = people.filter((row) => row.categoriaProtegido === 'ADICIONAL PERSONA')
  const mascotas = people.filter((row) => row.categoriaProtegido === 'MASCOTA')
  const adicionales = [...adicionalesPersonas, ...mascotas]
  const beneficiarios = people.filter((row) => row.tipoAfiliado === 'BENEFICIARIO')
  const contracts = new Set(people.map((row) => row.contrato).filter(Boolean))
  const contractsWithAdditional = new Set(adicionales.map((row) => row.contrato).filter((contract) => contracts.has(contract)))
  const billedByContract = new Map()
  titulares.forEach((row) => billedByContract.set(row.contrato, Number(row.valorFacturado) || 0))
  const facturacion = [...billedByContract.values()].reduce((sum, value) => sum + value, 0)

  return {
    vidas: people.length,
    contratos: contracts.size,
    titulares: titulares.length,
    adicionales: adicionales.length,
    adicionalesPersonas: adicionalesPersonas.length,
    mascotas: mascotas.length,
    beneficiarios: beneficiarios.length,
    facturacion,
    vidasPorContrato: contracts.size ? people.length / contracts.size : 0,
    contratosConAdicional: contractsWithAdditional.size,
    porcentajeConAdicional: contracts.size ? (contractsWithAdditional.size / contracts.size) * 100 : 0,
  }
}

export function buildIncomeComposition(summary) {
  return [
    { name: 'Titulares', value: summary.titulares, color: '#0f766e' },
    { name: 'Adicionales personas', value: summary.adicionalesPersonas, color: '#7c3aed' },
    { name: 'Mascotas', value: summary.mascotas, color: '#f43f5e' },
    { name: 'Beneficiarios', value: summary.beneficiarios, color: '#2563eb' },
  ].filter((item) => item.value > 0)
}

export function buildCommercialPortfolio(rows) {
  const totalProtected = new Set(rows.map((row) => row.id)).size
  const groups = new Map()
  rows.forEach((row) => {
    const name = text(row.asesor) || 'SIN RESPONSABLE'
    if (!groups.has(name)) groups.set(name, [])
    groups.get(name).push(row)
  })

  return [...groups.entries()].map(([name, groupRows]) => {
    const summary = buildIncomeSummary(groupRows)
    return {
      name,
      ...summary,
      convenios: new Set(groupRows.map((row) => row.convenio).filter(Boolean)).size,
      planes: new Set(groupRows.map((row) => row.plan).filter(Boolean)).size,
      sedes: new Set(groupRows.map((row) => row.sede).filter(Boolean)).size,
      participacion: totalProtected ? (summary.vidas / totalProtected) * 100 : 0,
      rows: groupRows,
    }
  })
}

export function buildCommercialKpis(rows) {
  const portfolio = buildCommercialPortfolio(rows)
  return {
    responsables: portfolio.filter((item) => item.contratos > 0).length,
    convenios: new Set(rows.map((row) => row.convenio).filter(Boolean)).size,
    planes: new Set(rows.map((row) => row.plan).filter(Boolean)).size,
    sedes: new Set(rows.map((row) => row.sede).filter(Boolean)).size,
    ...buildIncomeSummary(rows),
  }
}

export function buildDimensionPortfolio(rows, key, limit = 10) {
  const groups = new Map()
  rows.forEach((row) => {
    const name = text(row[key]) || 'SIN DEFINIR'
    if (!groups.has(name)) groups.set(name, [])
    groups.get(name).push(row)
  })
  return [...groups.entries()]
    .map(([name, groupRows]) => ({ name, ...buildIncomeSummary(groupRows) }))
    .sort((a, b) => b.contratos - a.contratos || b.vidas - a.vidas)
    .slice(0, limit)
}

export const incomeQualityAlerts = [
  { id: 'TITULAR_NO_ACTIVO', label: 'Personas activas bajo contrato con titular no activo' },
  { id: 'TITULAR_SIN_FACTURACION', label: 'Titulares activos con valor facturado igual a cero' },
  { id: 'INGRESO_POSTERIOR_CORTE', label: 'Fecha de ingreso posterior al corte' },
  { id: 'VIGENCIA_POSTERIOR_CORTE', label: 'Fecha de inicio de vigencia posterior al corte' },
  { id: 'NACIMIENTO_INVALIDO', label: 'Fecha de nacimiento vacía o no interpretable' },
  { id: 'NACIMIENTO_FUTURO', label: 'Fecha de nacimiento futura' },
  { id: 'EDAD_MAYOR_120', label: 'Edad mayor a 120 años' },
]

export function filterIncomeProfileRows(rows, filters) {
  const search = upper(filters.search)
  const matches = (value, selected) => selected === 'TODOS' || text(value) === selected
  return rows.filter((row) => {
    if (search && ![row.contrato, row.plan, row.convenio, row.sede, row.asesor, row.parentesco]
      .some((value) => upper(value).includes(search))) return false
    return matches(row.sede, filters.sede)
      && matches(row.plan, filters.plan)
      && matches(row.convenio, filters.convenio)
      && matches(row.asesor, filters.asesor)
      && matches(row.categoriaProtegido, filters.tipoAfiliado)
      && matches(row.parentesco, filters.parentesco)
      && matches(row.estado, filters.estado)
  })
}

export function buildSitePortfolio(rows) {
  const totalProtected = new Set(rows.map((row) => row.id)).size
  const groups = new Map()
  rows.forEach((row) => {
    const name = text(row.sede) || 'SIN SEDE'
    if (!groups.has(name)) groups.set(name, [])
    groups.get(name).push(row)
  })

  return [...groups.entries()]
    .map(([name, groupRows]) => {
      const summary = buildIncomeSummary(groupRows)
      return {
        name,
        ...summary,
        participacion: totalProtected ? (summary.vidas / totalProtected) * 100 : 0,
        rows: groupRows,
      }
    })
    .sort((a, b) => b.vidas - a.vidas || a.name.localeCompare(b.name, 'es'))
}

export function buildPlanPortfolio(rows) {
  const totalProtected = new Set(rows.map((row) => row.id)).size
  const groups = new Map()
  rows.forEach((row) => {
    const name = text(row.plan) || 'SIN PLAN'
    if (!groups.has(name)) groups.set(name, [])
    groups.get(name).push(row)
  })

  return [...groups.entries()]
    .map(([name, groupRows]) => {
      const summary = buildIncomeSummary(groupRows)
      return {
        name,
        ...summary,
        participacion: totalProtected ? (summary.vidas / totalProtected) * 100 : 0,
        rows: groupRows,
      }
    })
    .sort((a, b) => b.vidas - a.vidas || a.name.localeCompare(b.name, 'es'))
}

export function buildAffiliateProfile(rows) {
  const active = rows.filter((row) => row.estado === 'ACTIVO')
  const ages = active.map((row) => row.edad).filter((value) => Number.isFinite(value) && value >= 0 && value <= 120).sort((a, b) => a - b)
  const middle = Math.floor(ages.length / 2)
  const median = ages.length ? (ages.length % 2 ? ages[middle] : (ages[middle - 1] + ages[middle]) / 2) : null
  const average = ages.length ? ages.reduce((sum, age) => sum + age, 0) / ages.length : null
  const ranges = [
    { name: '0–5', min: 0, max: 5 }, { name: '6–12', min: 6, max: 12 },
    { name: '13–17', min: 13, max: 17 }, { name: '18–29', min: 18, max: 29 },
    { name: '30–44', min: 30, max: 44 }, { name: '45–59', min: 45, max: 59 },
    { name: '60–74', min: 60, max: 74 }, { name: '75+', min: 75, max: 120 },
  ].map((range) => ({ name: range.name, personas: ages.filter((age) => age >= range.min && age <= range.max).length }))
  const statuses = [...rows.reduce((map, row) => map.set(row.estado, (map.get(row.estado) || 0) + 1), new Map())]
    .map(([name, value]) => ({ name, value }))
  const relationships = groupIncomeBy(active, 'parentesco', Number.MAX_SAFE_INTEGER)
  const ageByType = [...active.reduce((map, row) => {
    if (!Number.isFinite(row.edad) || row.edad < 0 || row.edad > 120) return map
    const current = map.get(row.categoriaProtegido) || { total: 0, count: 0 }
    current.total += row.edad
    current.count += 1
    map.set(row.categoriaProtegido, current)
    return map
  }, new Map())].map(([name, values]) => ({ name, edad: values.total / values.count }))
  const alerts = incomeQualityAlerts.map((alert) => ({ ...alert, count: rows.filter((row) => row.alertas?.includes(alert.id)).length }))

  return {
    average, median, parentescos: new Set(active.map((row) => row.parentesco).filter((value) => value && value !== 'N/A')).size,
    noActivos: rows.length - active.length, active, ranges, statuses, relationships, ageByType, alerts,
  }
}

export function groupIncomeBy(rows, key, limit = 8) {
  const groups = new Map()
  rows.forEach((row) => {
    const name = text(row[key]) || 'SIN DEFINIR'
    if (!groups.has(name)) groups.set(name, { name, vidas: 0, contratos: new Set() })
    const group = groups.get(name)
    group.vidas += 1
    if (row.contrato) group.contratos.add(row.contrato)
  })
  return [...groups.values()]
    .map((group) => ({ name: group.name, vidas: group.vidas, contratos: group.contratos.size }))
    .sort((a, b) => b.vidas - a.vidas)
    .slice(0, limit)
}
