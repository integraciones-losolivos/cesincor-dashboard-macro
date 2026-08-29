import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

const cacheRoot = process.env.DASHBOARD_CACHE_DIR || path.join(process.env.LOCALAPPDATA || process.cwd(), 'CesincorDashboard', 'cache')

function cacheFile(namespace, key) {
  const digest = createHash('sha256').update(key).digest('hex')
  return path.join(cacheRoot, `${namespace}-${digest}.json`)
}

async function readPersistentEntry(namespace, key) {
  try {
    return JSON.parse(await readFile(cacheFile(namespace, key), 'utf8'))
  } catch (error) {
    if (error.code !== 'ENOENT') console.warn(`[${namespace}] No fue posible leer la caché persistente.`, error.message)
    return null
  }
}

async function writePersistentEntry(namespace, key, entry) {
  try {
    await mkdir(cacheRoot, { recursive: true })
    const target = cacheFile(namespace, key)
    const temporary = `${target}.${process.pid}.tmp`
    await writeFile(temporary, JSON.stringify(entry), 'utf8')
    await rename(temporary, target)
  } catch (error) {
    console.warn(`[${namespace}] No fue posible guardar la caché persistente.`, error.message)
  }
}

function latestDate(rows, dateField) {
  return rows.reduce((latest, row) => {
    const value = String(row[dateField] || '').slice(0, 10)
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && value > latest ? value : latest
  }, '')
}

function mergeRows(existingRows, incomingRows, rowKey) {
  const merged = new Map(existingRows.map((row) => [rowKey(row), row]))
  incomingRows.forEach((row) => merged.set(rowKey(row), row))
  return Array.from(merged.values())
}

export function createPersistentRangeCache({ namespace, ttlMs, dateField, rowKey }) {
  const memory = new Map()
  const activeQueries = new Map()

  return async function loadRange(range, loader) {
    const key = `${range.from || ''}:${range.to || ''}`
    const refreshMode = range.refresh === 'full' ? 'full' : range.refresh ? 'incremental' : ''
    let entry = memory.get(key)
    if (!entry) {
      entry = await readPersistentEntry(namespace, key)
      if (entry) memory.set(key, entry)
    }

    const isFresh = entry && Date.now() - Number(entry.createdAt || 0) < ttlMs
    if (entry && !refreshMode && isFresh) return entry.rows
    if (activeQueries.has(key)) return activeQueries.get(key)

    const query = (async () => {
      try {
        let queryRange = { from: range.from || '', to: range.to || '' }
        const shouldUpdateIncrementally = entry && refreshMode !== 'full'
        if (shouldUpdateIncrementally) {
          const latest = latestDate(entry.rows, dateField)
          if (latest && (!queryRange.from || latest > queryRange.from)) queryRange.from = latest
        }

        const incomingRows = await loader(queryRange)
        const rows = shouldUpdateIncrementally
          ? mergeRows(entry.rows, incomingRows, rowKey)
          : incomingRows
        const nextEntry = { createdAt: Date.now(), rows }
        memory.set(key, nextEntry)
        await writePersistentEntry(namespace, key, nextEntry)
        return rows
      } catch (error) {
        if (entry) {
          console.warn(`[${namespace}] La fuente no respondió; se usa la última caché válida.`, error.message)
          return entry.rows
        }
        throw error
      } finally {
        activeQueries.delete(key)
      }
    })()

    activeQueries.set(key, query)
    return query
  }
}
