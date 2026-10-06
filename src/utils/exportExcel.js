import { formatVigencia } from './retiros.js'

const defaultColumns = [
  ['fecha', 'Fecha de retiro'], ['contrato', 'Contrato'], ['documento', 'Identificación'], ['nombre', 'Nombre'],
  ['tipo_retiro', 'Tipo de retiro'], ['canal', 'Canal'], ['nombre_entidad', 'Entidad / convenio'], ['plan', 'Plan'],
  ['asesor', 'Asesor'], ['sede', 'Sede'], ['subuen', 'SubUEN'], ['fecha_ingreso', 'Fecha de ingreso'],
  ['meses_vigencia', 'Vigencia'], ['estado_contrato', 'Estado'], ['causal_retiro', 'Causal de retiro'],
]

function safeFileName(value) {
  return String(value || 'retiros').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '').toLowerCase()
}

function cellValue(row, key) {
  if (key === 'meses_vigencia') return formatVigencia(row)
  if (key === 'nombre_entidad') return row.nombre_entidad || row.entidad || ''
  if (key === 'contrato' || key === 'documento') return String(row[key] ?? '')
  return row[key] ?? ''
}

export async function buildRetirosWorkbook(rows, { sheetName = 'Retiros', columns = defaultColumns } = {}) {
  const module = await import('exceljs')
  const ExcelJS = module.default || module
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Dashboard CESINCOR'
  workbook.created = new Date()
  const sheet = workbook.addWorksheet(String(sheetName).slice(0, 31), {
    views: [{ state: 'frozen', ySplit: 1 }],
    properties: { defaultRowHeight: 20 },
  })
  sheet.columns = columns.map(([key, header]) => ({ key, header, width: Math.min(45, Math.max(14, header.length + 3)) }))
  rows.forEach((row) => sheet.addRow(Object.fromEntries(columns.map(([key]) => [key, cellValue(row, key)]))))
  const header = sheet.getRow(1)
  header.height = 24
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBE123C' } }
  header.alignment = { vertical: 'middle', horizontal: 'left' }
  header.eachCell((cell) => { cell.border = { bottom: { style: 'thin', color: { argb: 'FF9F1239' } } } })
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } }
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1 && rowNumber % 2 === 1) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7F8' } }
    row.alignment = { vertical: 'middle' }
  })
  columns.forEach(([key], index) => {
    const values = rows.slice(0, 500).map((row) => String(cellValue(row, key))).concat(columns[index][1])
    sheet.getColumn(index + 1).width = Math.min(60, Math.max(14, ...values.map((value) => value.length + 2)))
  })
  return workbook
}

export async function exportRowsToExcel(rows, { filename = 'detalle-retiros', sheetName = 'Retiros', columns = defaultColumns } = {}) {
  const workbook = await buildRetirosWorkbook(rows, { sheetName, columns })
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${safeFileName(filename)}.xlsx`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
