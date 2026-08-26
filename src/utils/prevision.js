import { monthLabel, normalizeText, sumBy, withShare } from './dashboard.js'

const MONEY_TYPES = ['TITULAR', 'ADICIONAL', 'MASCOTA']

function emptyAccumulator(name) {
  return {
    name,
    retiros: 0,
    afiliaciones: 0,
    perdida_mensual: 0,
    ingreso_mensual: 0,
    total_personas: 0,
    total_titulares: 0,
    total_beneficiarios: 0,
    total_mascotas: 0,
    contratos: new Set(),
    contratosRetirados: new Set(),
  }
}

function applyMovementTotals(target, row) {
  target.retiros += Number(row.retiros || 0)
  target.afiliaciones += Number(row.afiliaciones || 0)
  target.perdida_mensual += Number(row.perdida_mensual || 0)
  target.ingreso_mensual += Number(row.ingreso_mensual || 0)
  target.total_personas += Number(row.total_personas || 0)
  target.total_titulares += Number(row.total_titulares || 0)
  target.total_beneficiarios += Number(row.total_beneficiarios || 0)
  target.total_mascotas += Number(row.total_mascotas || 0)
  target.contratos.add(row.contrato)
  if (row.estado_contrato === 'RETIRADO') target.contratosRetirados.add(row.contrato)
}

function finalizeGroup(item) {
  return {
    ...item,
    contratos: item.contratos.size,
    contratos_retirados: item.contratosRetirados.size,
    contratosRetirados: undefined,
  }
}

export function filterPrevisionRows(rows, filters) {
  const search = normalizeText(filters.search)
  const from = filters.fechaInicial ? new Date(`${filters.fechaInicial}T00:00:00`) : null
  const to = filters.fechaFinal ? new Date(`${filters.fechaFinal}T23:59:59`) : null

  return rows.filter((row) => {
    const rowDate = row.fecha ? new Date(`${row.fecha}T00:00:00`) : null
    const matchesDate = (!from && !to) || (rowDate && (!from || rowDate >= from) && (!to || rowDate <= to))
    const matchesSearch =
      !search ||
      [
        row.contrato,
        row.localidad,
        row.asesor,
        row.nombre_convenio,
        row.codigo_convenio,
        row.plan,
        row.tipo_afiliado,
        row.periodicidad_pago,
        row.cobrador,
        row.motivo,
      ]
        .map(normalizeText)
        .some((field) => field.includes(search))

    return (
      matchesDate &&
      matchesSearch &&
      (filters.uen === 'TODOS' || row.uen === filters.uen) &&
      (filters.localidad === 'TODOS' || row.localidad === filters.localidad) &&
      (filters.asesor === 'TODOS' || row.asesor === filters.asesor) &&
      (filters.convenio === 'TODOS' || row.nombre_convenio === filters.convenio) &&
      (filters.plan === 'TODOS' || row.plan === filters.plan) &&
      (filters.periodicidad === 'TODOS' || row.periodicidad_pago === filters.periodicidad) &&
      (filters.cobrador === 'TODOS' || row.cobrador === filters.cobrador) &&
      (filters.tipoAfiliado === 'TODOS' || row.tipo_afiliado === filters.tipoAfiliado) &&
      (filters.movimiento === 'TODOS' || row.tipo_movimiento === filters.movimiento) &&
      (filters.estadoContrato === 'TODOS' || row.estado_crystal === filters.estadoContrato)
    )
  })
}

export function buildPrevisionKpis(rows) {
  const rowsWithMoney = rows.filter((row) => MONEY_TYPES.includes(row.tipo_afiliado))
  const perdidaMensual = sumBy(rowsWithMoney, 'perdida_mensual')
  const ingresoMensual = sumBy(rowsWithMoney, 'ingreso_mensual')
  const retiros = sumBy(rowsWithMoney, 'retiros')
  const afiliaciones = sumBy(rowsWithMoney, 'afiliaciones')
  const contratosRetirados = new Set(rows.filter((row) => row.estado_contrato === 'RETIRADO').map((row) => row.contrato)).size
  const contratosActivos = new Set(rows.map((row) => row.contrato).filter(Boolean)).size
  const personasActivas = rows.filter((row) => row.tipo_movimiento === 'ACTIVO').length
  const personasRetiradas = rows.filter((row) => row.tipo_movimiento === 'RETIRADO').length
  const personasFallecidas = rows.filter((row) => row.tipo_movimiento === 'FALLECIDO').length
  const totalPersonas = sumBy(rows, 'total_personas')
  const totalTitulares = sumBy(rows, 'total_titulares')
  const totalBeneficiarios = sumBy(rows, 'total_beneficiarios') - sumBy(rows, 'total_mascotas')
  const totalMascotas = sumBy(rows, 'total_mascotas')

  return {
    retiros,
    afiliaciones,
    contratosActivos,
    personasActivas,
    personasRetiradas,
    personasFallecidas,
    totalPersonas,
    totalTitulares,
    totalBeneficiarios,
    totalMascotas,
    perdidaMensual,
    ingresoMensual,
    balanceMensual: ingresoMensual - perdidaMensual,
    contratosRetirados,
    perdidaAnualizada: perdidaMensual * 12,
    ingresoAnualizado: ingresoMensual * 12,
    tasaReposicion: retiros ? afiliaciones / retiros : 0,
    valorPromedioContrato: contratosActivos ? ingresoMensual / contratosActivos : 0,
    personasPorContrato: contratosActivos ? totalPersonas / contratosActivos : 0,
  }
}

export function groupPrevisionBy(rows, key) {
  const grouped = new Map()

  rows.forEach((row) => {
    const name = row[key] || 'SIN DEFINIR'
    const current = grouped.get(name) || emptyAccumulator(name)
    applyMovementTotals(current, row)
    grouped.set(name, current)
  })

  return Array.from(grouped.values())
    .map(finalizeGroup)
    .sort((a, b) => b.perdida_mensual + b.ingreso_mensual - (a.perdida_mensual + a.ingreso_mensual))
}

export function groupPrevisionByMonth(rows) {
  const grouped = new Map()

  rows.forEach((row) => {
    const key = row.fecha ? row.fecha.slice(0, 7) : 'SIN_FECHA'
    const current = grouped.get(key) || { ...emptyAccumulator(row.fecha ? monthLabel(row.fecha) : 'SIN FECHA'), key }
    applyMovementTotals(current, row)
    grouped.set(key, current)
  })

  return Array.from(grouped.values())
    .map(finalizeGroup)
    .map((item) => ({ ...item, balance: item.ingreso_mensual - item.perdida_mensual }))
    .sort((a, b) => a.key.localeCompare(b.key))
}

export function summarizeContracts(rows) {
  const grouped = new Map()

  rows.forEach((row) => {
    const current =
      grouped.get(row.contrato) || {
        contrato: row.contrato,
        sede: row.localidad || row.sede,
        convenio: row.nombre_convenio || row.convenio,
        plan: row.plan || row.convenio,
        uen: row.uen,
        periodicidad_pago: row.periodicidad_pago,
        cobrador: row.cobrador,
        estado_contrato: row.estado_contrato,
        retiros: 0,
        afiliaciones: 0,
        perdida_mensual: 0,
        ingreso_mensual: 0,
        tipos: new Set(),
        motivos: new Set(),
      }

    current.retiros += Number(row.retiros || 0)
    current.afiliaciones += Number(row.afiliaciones || 0)
    current.perdida_mensual += Number(row.perdida_mensual || 0)
    current.ingreso_mensual += Number(row.ingreso_mensual || 0)
    current.tipos.add(row.tipo_afiliado)
    current.motivos.add(row.motivo)
    if (row.estado_contrato === 'RETIRADO') current.estado_contrato = 'RETIRADO'
    grouped.set(row.contrato, current)
  })

  return Array.from(grouped.values())
    .map((item) => ({
      ...item,
      tipos: Array.from(item.tipos).join(', '),
      motivos: Array.from(item.motivos).slice(0, 2).join(', '),
      balance: item.ingreso_mensual - item.perdida_mensual,
    }))
    .sort((a, b) => b.perdida_mensual - a.perdida_mensual)
}

export function buildTypeMix(rows) {
  return withShare(groupPrevisionBy(rows, 'tipo_afiliado'), 'retiros').map((item) => ({
    ...item,
    fill: {
      TITULAR: '#0f766e',
      ADICIONAL: '#2563eb',
      MASCOTA: '#f59e0b',
    }[item.name] || '#64748b',
  }))
}

export function buildPlanPortfolio(rows) {
  const grouped = new Map()

  rows.forEach((row) => {
    const name = row.plan || 'SIN PLAN'
    const current =
      grouped.get(name) || {
        name,
        total_personas: 0,
        total_titulares: 0,
        total_beneficiarios: 0,
        total_mascotas: 0,
        ingreso_mensual: 0,
        perdida_mensual: 0,
      }

    current.total_personas += Number(row.total_personas || 0)
    current.total_titulares += Number(row.total_titulares || 0)
    current.total_beneficiarios += Number(row.total_beneficiarios || 0)
    current.total_mascotas += Number(row.total_mascotas || 0)
    current.ingreso_mensual += Number(row.ingreso_mensual || 0)
    current.perdida_mensual += Number(row.perdida_mensual || 0)
    grouped.set(name, current)
  })

  return Array.from(grouped.values()).sort((a, b) => b.total_personas - a.total_personas)
}

export function buildValueComponents(rows) {
  const components = [
    { name: 'Plan base', key: 'valor_plan_base' },
    { name: 'Adicionales', key: 'valor_adicional' },
    { name: 'Asistencias', key: 'valor_asistencia' },
    { name: 'Seguros', key: 'valor_seguro' },
    { name: 'Mascotas', key: 'valor_mascota' },
    { name: 'Club beneficios', key: 'valor_club' },
  ]

  return components
    .map((component) => ({
      name: component.name,
      valor: sumBy(rows, component.key),
      cantidad: rows.filter((row) => Number(row[component.key] || 0) > 0).length,
    }))
    .filter((item) => item.valor > 0)
    .sort((a, b) => b.valor - a.valor)
}

export function buildPetSummary(rows) {
  const grouped = new Map()

  rows
    .filter((row) => row.tipo_afiliado === 'MASCOTA')
    .forEach((row) => {
      const name = row.tipo_mascota || 'SIN TIPO'
      const current = grouped.get(name) || { name, total_mascotas: 0, valor_mascota: 0, ingreso_mensual: 0, retiros: 0, afiliaciones: 0 }
      current.total_mascotas += Number(row.total_mascotas || 0)
      current.valor_mascota += Number(row.valor_mascota || 0)
      current.ingreso_mensual += Number(row.ingreso_mensual || 0)
      current.retiros += Number(row.retiros || 0)
      current.afiliaciones += Number(row.afiliaciones || 0)
      grouped.set(name, current)
    })

  return Array.from(grouped.values()).sort((a, b) => b.total_mascotas - a.total_mascotas)
}
