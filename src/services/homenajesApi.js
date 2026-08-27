import { fetchWithRetry } from './http.js'

export async function fetchHomenajes({ from = '', to = '' } = {}) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)

  try {
    const response = await fetchWithRetry(`/api/homenajes?${params}`)
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.detail || payload.message || 'No fue posible cargar Homenajes.')
    return { rows: payload.rows || [], elements: payload.elements || [] }
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('La consulta de Homenajes tardó demasiado. Intenta nuevamente.')
    throw error
  }
}
