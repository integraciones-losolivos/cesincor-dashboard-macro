import test from 'node:test'
import assert from 'node:assert/strict'
import { buildRetirosComposition, buildRetirosTimeline, filterRetiros, formatVigencia, initialRetirosFilters } from '../src/utils/retiros.js'

test('the final day of a withdrawal range is inclusive even when SAP returns time precision', () => {
  const rows = [{
    contrato: '3565', fecha: '2026-10-01', fecha_retiro: '2026-10-01 15:04:25.119000000',
    canal: 'EMPRESARIALES', sede: 'SEDE', subuen: 'SUBUEN', municipio: 'MONTERIA', entidad: 'CONVENIO',
    plan: 'PLAN', asesor: 'ASESOR', tipo_retiro: 'TITULAR', causal_retiro: 'RETIRO', estado_contrato: 'CANCELADO',
  }]
  const result = filterRetiros(rows, { ...initialRetirosFilters, fechaInicial: '2026-06-01', fechaFinal: '2026-10-01' })
  assert.equal(result.length, 1)
})

test('channel composition keeps commercial channel separate from withdrawal type', () => {
  const rows = [
    { contrato: '1', tipo_registro: 'CONTRATO', canal: 'EMPRESARIALES' },
    { contrato: '1', tipo_registro: 'ADICIONAL', canal: 'EMPRESARIALES' },
    { contrato: '2', tipo_registro: 'MASCOTA', canal: 'INDEPENDIENTES' },
  ]
  assert.deepEqual(buildRetirosComposition(rows).map(({ name, cantidad }) => ({ name, cantidad })), [
    { name: 'EMPRESARIALES', cantidad: 2 },
    { name: 'INDEPENDIENTES', cantidad: 1 },
  ])
})

test('daily timeline fills every day in a selected month range', () => {
  const rows = [{ contrato: '1', tipo_registro: 'CONTRATO', canal: 'EMPRESARIALES', fecha: '2026-06-03' }]
  const timeline = buildRetirosTimeline(rows, 'daily', { from: '2026-06-01', to: '2026-06-05' })
  assert.deepEqual(timeline.map(({ key, total }) => ({ key, total })), [
    { key: '2026-06-01', total: 0 }, { key: '2026-06-02', total: 0 }, { key: '2026-06-03', total: 1 },
    { key: '2026-06-04', total: 0 }, { key: '2026-06-05', total: 0 },
  ])
})

test('withdrawal duration is displayed as calendar years, months and days', () => {
  assert.equal(formatVigencia({ fecha_ingreso: '2024-03-02', fecha_retiro: '2025-05-05 09:20:00' }), '1 año, 2 meses, 3 días')
  assert.equal(formatVigencia({ fecha_ingreso: '2026-06-01', fecha: '2026-06-01' }), '0 días')
})
