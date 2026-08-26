export async function fetchHomenajes({ from = '', to = '' } = {}) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 180000)
  try {
    const response = await fetch(`/api/homenajes?${params}`, { signal: controller.signal })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.detail || payload.message || 'No fue posible cargar Homenajes.')
    return { rows: payload.rows || [], elements: payload.elements || [] }
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('La consulta de Homenajes tardó demasiado. Intenta nuevamente.')
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
