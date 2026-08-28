import { fetchWithRetry } from './http.js'

export async function fetchRetiros() {
  const response = await fetchWithRetry('/api/retiros')
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || 'No fue posible cargar los retiros.')
  return (await response.json()).rows || []
}
