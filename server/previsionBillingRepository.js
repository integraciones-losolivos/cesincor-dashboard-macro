import { connectHana, executeQuery } from './hanaConnection.js'
import { buildPrevisionBillingSql } from './previsionBillingSql.js'

function normalizeDate(value) {
  const match = String(value || '').match(/^\d{4}-\d{2}-\d{2}/)
  return match ? match[0] : null
}

export async function fetchPrevisionBillingSummary(range = {}) {
  const connection = await connectHana()

  try {
    const [row = {}] = await executeQuery(connection, buildPrevisionBillingSql(range))
    return {
      totalFacturado: Number(row.TOTAL_FACTURADO || 0),
      contratosFacturados: Number(row.CONTRATOS_FACTURADOS || 0),
      primeraFecha: normalizeDate(row.PRIMERA_FECHA),
      ultimaFecha: normalizeDate(row.ULTIMA_FECHA),
    }
  } finally {
    connection.disconnect()
  }
}
