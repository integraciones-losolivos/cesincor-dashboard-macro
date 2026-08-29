import 'dotenv/config'
import express from 'express'
import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchHomenajes } from './homenajesRepository.js'
import { fetchPrevisionRows } from './previsionRepository.js'
import { fetchRetiros } from './retirosRepository.js'
import { fetchUpstreamJson, hasUpstreamApi } from './upstreamApi.js'

const app = express()
const port = Number(process.env.PORT || process.env.API_PORT || 3001)
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDirectory = path.join(projectRoot, 'dist')

app.get('/api/health', async (_request, response) => {
  if (!hasUpstreamApi()) {
    response.json({ ok: true, dataSource: 'hana-direct' })
    return
  }

  try {
    await fetchUpstreamJson('/api/health')
    response.json({ ok: true, dataSource: 'office-bridge', bridgeOk: true })
  } catch (error) {
    console.warn('[api/health] El puente de la oficina no respondió.', error.message)
    response.status(503).json({ ok: false, dataSource: 'office-bridge', bridgeOk: false })
  }
})

function requireGatewayToken(request, response, next) {
  const expected = String(process.env.GATEWAY_SHARED_SECRET || '')
  if (!expected) {
    next()
    return
  }

  const provided = String(request.get('authorization') || '').replace(/^Bearer\s+/i, '')
  const expectedBuffer = Buffer.from(expected)
  const providedBuffer = Buffer.from(provided)
  const matches =
    expectedBuffer.length === providedBuffer.length && crypto.timingSafeEqual(expectedBuffer, providedBuffer)

  if (!matches) {
    response.status(401).json({ message: 'No autorizado.' })
    return
  }
  next()
}

app.get('/api/prevision', requireGatewayToken, async (request, response) => {
  try {
    const range = { from: String(request.query.from || ''), to: String(request.query.to || ''), refresh: String(request.query.refresh || '') }
    const data = hasUpstreamApi() ? await fetchUpstreamJson('/api/prevision', range) : { rows: await fetchPrevisionRows(range) }
    response.json(data)
  } catch (error) {
    console.error('[api/prevision]', error)
    response.status(500).json({
      message: 'No fue posible consultar la base de datos de Previsión.',
      ...(process.env.NODE_ENV === 'development' ? { detail: error.message } : {}),
    })
  }
})

app.get('/api/homenajes', requireGatewayToken, async (request, response) => {
  try {
    const range = { from: String(request.query.from || ''), to: String(request.query.to || '') }
    const data = hasUpstreamApi() ? await fetchUpstreamJson('/api/homenajes', range) : await fetchHomenajes(range)
    response.json(data)
  } catch (error) {
    console.error('[api/homenajes]', error)
    response.status(500).json({
      message: 'No fue posible consultar las órdenes de servicio funerario.',
      ...(process.env.NODE_ENV === 'development' ? { detail: error.message } : {}),
    })
  }
})

app.get('/api/retiros', requireGatewayToken, async (request, response) => {
  try {
    const range = { from: String(request.query.from || ''), to: String(request.query.to || ''), refresh: String(request.query.refresh || '') }
    const data = hasUpstreamApi() ? await fetchUpstreamJson('/api/retiros', range) : { rows: await fetchRetiros(range) }
    response.json(data)
  } catch (error) {
    console.error('[api/retiros]', error)
    response.status(500).json({ message: 'No fue posible consultar los retiros.' })
  }
})

app.use(express.static(distDirectory))

app.use((request, response, next) => {
  if (request.method === 'GET' && request.accepts('html')) {
    response.sendFile(path.join(distDirectory, 'index.html'))
    return
  }
  next()
})

app.listen(port, () => {
  console.log(`Crystal Dashboard escuchando en el puerto ${port}`)
})
