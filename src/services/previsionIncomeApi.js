import { fetchWithRetry } from './http.js'

const CACHE_MAX_AGE_MS = 30 * 60 * 1000
const memoryCache = new Map()
const DB_NAME = 'crystal-dashboard-cache'
const STORE_NAME = 'prevision-income'

function cacheKey(from, to) { return `v3-billing-period:${from || 'all'}:${to || 'all'}` }

function openCache() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
  })
}

export async function fetchPrevisionIncomeAlertDetails(alerta, { from = '', to = '', ...filters } = {}) {
  const search = new URLSearchParams()
  if (from) search.set('from', from)
  if (to) search.set('to', to)
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== 'TODOS') search.set(key, value)
  })
  const response = await fetchWithRetry(`/api/prevision/ingresos/alertas/${encodeURIComponent(alerta)}${search.size ? `?${search}` : ''}`, { timeoutMs: 30000 })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.message || 'No fue posible consultar el detalle de la alerta.')
  }
  const payload = await response.json()
  return payload.rows || []
}

async function readPersistentCache(key) {
  const db = await openCache()
  if (!db) return null
  return new Promise((resolve) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => resolve(null)
  }).finally(() => db.close())
}

async function writePersistentCache(key, value) {
  const db = await openCache()
  if (!db) return
  await new Promise((resolve) => {
    const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(value, key)
    request.onsuccess = resolve
    request.onerror = resolve
  })
  db.close()
}

export async function fetchPrevisionIncomeRows({ from = '', to = '', refresh = false } = {}) {
  const key = cacheKey(from, to)
  let staleCache = memoryCache.get(key) || await readPersistentCache(key)
  if (!refresh) {
    if (staleCache && Date.now() - staleCache.createdAt < CACHE_MAX_AGE_MS) {
      memoryCache.set(key, staleCache)
      return staleCache.rows
    }
  }

  const search = new URLSearchParams()
  if (from) search.set('from', from)
  if (to) search.set('to', to)
  if (refresh) search.set('refresh', 'true')

  let response
  try {
    response = await fetchWithRetry(`/api/prevision/ingresos${search.size ? `?${search}` : ''}`, { attempts: 1, timeoutMs: 240000 })
  } catch (error) {
    if (staleCache?.rows?.length) return staleCache.rows
    if (error.name === 'AbortError') throw new Error('La consulta de Ingresos tardó más de 4 minutos. Se conservará la última caché disponible.')
    throw error
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.message || 'No fue posible cargar los ingresos de Previsión.')
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error('El servidor de Previsión necesita reiniciarse para habilitar la interfaz de Ingresos.')
  }

  const payload = await response.json()
  const rows = payload.rows || []
  const cached = { createdAt: Date.now(), rows }
  memoryCache.set(key, cached)
  writePersistentCache(key, cached).catch(() => {})
  return rows
}
