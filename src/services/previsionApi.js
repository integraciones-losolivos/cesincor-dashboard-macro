import { fetchWithRetry } from './http.js'

export async function fetchPrevisionRows() {
  let response

  try {
    response = await fetchWithRetry('/api/prevision')
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
