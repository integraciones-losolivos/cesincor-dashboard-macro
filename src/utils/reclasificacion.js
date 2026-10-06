export const initialReclasificacionFilters = { empresa: 'TODOS', plan: 'TODOS', asesor: 'TODOS', parentesco: 'TODOS', estado: 'TODOS', search: '' }

export function filterReclasificacion(rows, filters) {
  const query = filters.search.trim().toLocaleLowerCase('es')
  return rows.filter((row) => {
    if (filters.empresa !== 'TODOS' && row.empresa !== filters.empresa) return false
    if (filters.plan !== 'TODOS' && row.plan !== filters.plan) return false
    if (filters.asesor !== 'TODOS' && row.asesor !== filters.asesor) return false
    if (filters.parentesco !== 'TODOS' && row.parentesco !== filters.parentesco) return false
    if (filters.estado !== 'TODOS' && row.estado !== filters.estado) return false
    return !query || [row.contrato, row.documento_titular, row.titular, row.documento_beneficiario, row.beneficiario].some((value) => String(value || '').toLocaleLowerCase('es').includes(query))
  })
}

export function reclasificacionKpis(rows) {
  const ages = rows.map((row) => row.edad_actual).filter(Number.isFinite)
  return { beneficiarios: rows.length, contratos: new Set(rows.map((row) => row.contrato)).size, titulares: new Set(rows.map((row) => row.documento_titular || row.titular)).size, activos: rows.filter((row) => row.estado === 'ACTIVO').length, retirados: rows.filter((row) => row.estado === 'RETIRADO').length, planes: new Set(rows.map((row) => row.plan)).size, edadPromedio: ages.length ? ages.reduce((a, b) => a + b, 0) / ages.length : 0 }
}

export function groupReclasificacion(rows, key) {
  const map = new Map(); rows.forEach((row) => map.set(row[key] || 'SIN DEFINIR', (map.get(row[key] || 'SIN DEFINIR') || 0) + 1))
  return [...map].map(([name, cantidad]) => ({ name, cantidad, porcentaje: rows.length ? cantidad / rows.length : 0 })).sort((a, b) => b.cantidad - a.cantidad || a.name.localeCompare(b.name))
}

export function buildPlanRelationshipMatrix(rows) {
  const plans = groupReclasificacion(rows, 'plan').slice(0, 8).map((item) => item.name)
  const relationships = groupReclasificacion(rows, 'parentesco').slice(0, 10).map((item) => item.name)
  const counts = new Map(); rows.forEach((row) => counts.set(`${row.parentesco}\0${row.plan}`, (counts.get(`${row.parentesco}\0${row.plan}`) || 0) + 1))
  return { plans, rows: relationships.map((name) => ({ name, values: plans.map((plan) => counts.get(`${name}\0${plan}`) || 0) })) }
}
