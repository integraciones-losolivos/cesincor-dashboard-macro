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
