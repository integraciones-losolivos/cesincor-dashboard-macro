import { fetchWithRetry } from './http.js'

export async function fetchRetiros({ from = '', to = '' } = {}) {
  const search = new URLSearchParams()
  if (from) search.set('from', from)
  if (to) search.set('to', to)
  const response = await fetchWithRetry(`/api/retiros${search.size ? `?${search}` : ''}`)
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || 'No fue posible cargar los retiros.')
  return (await response.json()).rows || []
}
