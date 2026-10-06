import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildCommercialKpis,
  buildConventionPortfolio,
  buildDimensionPortfolio,
  filterIncomeRows,
  incomeInitialFilters,
  incomeOptions,
} from '../src/utils/previsionIncome.js'
import { buildPrevisionIncomeSql } from '../server/previsionIncomeSql.js'

function convention14Rows() {
  return Array.from({ length: 152 }, (_, index) => ({
    id: `contract-${index + 1}-titular`,
    contrato: String(index + 1),
    convenioId: '14',
    numeroConvenio: '14',
    convenio: index % 2
      ? '14 - CAJA DE COMPENSACION FILIAR DE CORDOBA'
      : '14 - CAJA DE COMPENSACION',
    nombreConvenio: index % 2 ? 'CAJA DE COMPENSACION FILIAR DE CORDOBA' : 'CAJA DE COMPENSACION',
    nombreEmpresa: index % 2 ? 'CAJA DE COMPENSACION FILIAR DE CORDOBA' : '',
    nombreConvenioMostrar: index % 2 ? 'CAJA DE COMPENSACION FILIAR DE CORDOBA' : 'CAJA DE COMPENSACION',
    plan: 'PLAN BASE',
    sede: 'MONTERIA',
    asesor: 'ASESOR',
    tipoAfiliado: 'TITULAR',
    categoriaProtegido: 'TITULAR',
    parentesco: 'TITULAR',
    estado: 'ACTIVO',
    valorFacturado: 100,
  }))
}

test('convenio 14 uses its number as the only option and grouping key', () => {
  const rows = convention14Rows()
  const options = incomeOptions(rows).convenios
  const filtered = filterIncomeRows(rows, { ...incomeInitialFilters, convenio: '14' })
  const portfolio = buildConventionPortfolio(rows)

  assert.deepEqual(options, [{ value: '14', label: '14 - CAJA DE COMPENSACION FILIAR DE CORDOBA' }])
  assert.equal(filtered.length, 152)
  assert.equal(portfolio.length, 1)
  assert.equal(portfolio[0].id, '14')
  assert.equal(portfolio[0].contratos, 152)
})

test('all convention-derived KPIs and rankings count ids instead of labels', () => {
  const rows = convention14Rows()
  const kpis = buildCommercialKpis(rows)
  const ranking = buildDimensionPortfolio(rows, 'convenio', 10)

  assert.equal(kpis.convenios, 1)
  assert.equal(ranking.length, 1)
  assert.equal(ranking[0].id, '14')
  assert.equal(ranking[0].contratos, 152)
})

test('backend convention filter is numeric and targets U_conve directly', () => {
  const previousSchema = process.env.HANA_SCHEMA
  process.env.HANA_SCHEMA = 'SBO_TEST'
  try {
    const sql = buildPrevisionIncomeSql({ convenio: '14' })
    assert.match(sql, /TH\."U_conve" = 14/)
    assert.doesNotMatch(sql, /U_nconv"\s+LIKE|U_empNom"\s+LIKE/)
    assert.throws(() => buildPrevisionIncomeSql({ convenio: '14 OR 1=1' }), /identificador numérico/)
  } finally {
    if (previousSchema === undefined) delete process.env.HANA_SCHEMA
    else process.env.HANA_SCHEMA = previousSchema
  }
})
