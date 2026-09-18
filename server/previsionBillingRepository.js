import { connectHana, executeQuery } from './hanaConnection.js'
import { buildPrevisionBillingSql } from './previsionBillingSql.js'

export async function fetchPrevisionBillingSummary(range = {}) {
  const connection = await connectHana()

  try {
    const [row = {}] = await executeQuery(connection, buildPrevisionBillingSql(range))
    return {
      totalFacturado: Number(row.TOTAL_FACTURADO || 0),
      asientosContables: Number(row.ASIENTOS_CONTABLES || 0),
      clientesPrevisionNeto: Number(row.CLIENTES_PREVISION_NETO || 0),
      seguroCanasta: Number(row.SEGURO_CANASTA || 0),
      cuentaPuente: Number(row.CUENTA_PUENTE || 0),
      planEmpresarial: Number(row.PLAN_EMPRESARIAL || 0),
      planIndependiente: Number(row.PLAN_INDEPENDIENTE || 0),
      diferenciaPlanesEmpresas: Number(row.DIF_PLANES_EMPRESAS || 0),
      diferenciaPlanesIndependientes: Number(row.DIF_PLANES_INDEPENDIENTES || 0),
      totalValidacion: Number(row.TOTAL_VALIDACION || 0),
      diferenciaValidacion: Number(row.DIFERENCIA_VALIDACION || 0),
    }
  } finally {
    connection.disconnect()
  }
}
