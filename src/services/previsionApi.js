import { fetchWithRetry } from './http.js'

export async function fetchPrevisionRows({ from = '', to = '', refresh = '' } = {}) {
  let response
  const search = new URLSearchParams()
  if (from) search.set('from', from)
  if (to) search.set('to', to)
  if (refresh) search.set('refresh', refresh)
  const endpoint = `/api/prevision${search.size ? `?${search}` : ''}`

  try {
    response = await fetchWithRetry(endpoint)
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('La consulta a SAP HANA tardó más de 3 minutos. Recargue la página para intentarlo nuevamente.')
    }
    throw error
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    const technicalDetail = String(payload.detail || '')
    const hanaIsUnavailable =
      response.status >= 500 &&
      (/SAP HANA no respondi/i.test(technicalDetail) || /Connection failed/i.test(technicalDetail) || /RTE:\[89006\]/i.test(technicalDetail))

    if (hanaIsUnavailable) {
      throw new Error('SAP HANA no está respondiendo en este momento. Espere un momento y vuelva a intentarlo.')
    }

    throw new Error(payload.message || 'No fue posible cargar Previsión.')
  }

  const payload = await response.json()
  return payload.rows || []
}

export async function fetchPrevisionBillingSummary({ from = '', to = '' } = {}) {
  const search = new URLSearchParams()
  if (from) search.set('from', from)
  if (to) search.set('to', to)
  const endpoint = `/api/prevision/facturacion${search.size ? `?${search}` : ''}`

  let response
  try {
    response = await fetchWithRetry(endpoint, { timeoutMs: 30000 })
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('La consulta de facturación tardó demasiado.')
    }
    throw error
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.message || 'No fue posible cargar la facturación de Previsión.')
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error('El servicio de facturación necesita reiniciarse para aplicar la actualización.')
  }

  return response.json()
}
