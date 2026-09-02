import 'dotenv/config'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchHomenajes } from './homenajesRepository.js'
import { fetchPrevisionRows } from './previsionRepository.js'
import { fetchRetiros } from './retirosRepository.js'

const app = express()
const port = Number(process.env.PORT || process.env.API_PORT || 3001)
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDirectory = path.join(projectRoot, 'dist')

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, dataSource: 'hana-direct' })
})

app.get('/api/prevision', async (request, response) => {
  try {
    const range = { from: String(request.query.from || ''), to: String(request.query.to || ''), refresh: String(request.query.refresh || '') }
    response.json({ rows: await fetchPrevisionRows(range) })
  } catch (error) {
    console.error('[api/prevision]', error)
    response.status(500).json({
      message: 'No fue posible consultar la base de datos de Previsión.',
      ...(process.env.NODE_ENV === 'development' ? { detail: error.message } : {}),
    })
  }
})

app.get('/api/homenajes', async (request, response) => {
  try {
    const range = { from: String(request.query.from || ''), to: String(request.query.to || '') }
    response.json(await fetchHomenajes(range))
  } catch (error) {
    console.error('[api/homenajes]', error)
    response.status(500).json({
      message: 'No fue posible consultar las órdenes de servicio funerario.',
      ...(process.env.NODE_ENV === 'development' ? { detail: error.message } : {}),
    })
  }
})

app.get('/api/retiros', async (request, response) => {
  try {
    const range = { from: String(request.query.from || ''), to: String(request.query.to || ''), refresh: String(request.query.refresh || '') }
    response.json({ rows: await fetchRetiros(range) })
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
