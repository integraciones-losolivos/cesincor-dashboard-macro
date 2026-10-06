import { fetchWithRetry } from './http.js'

export async function fetchReclasificacion(vigencia) {
  const response = await fetchWithRetry(`/api/retiros/reclasificacion?vigencia=${encodeURIComponent(vigencia)}`, { cache: 'no-store' })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.message || 'No fue posible consultar la reclasificación.')
  return payload.rows || []
}
