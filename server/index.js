import 'dotenv/config'
import express from 'express'
import { fetchHomenajes } from './homenajesRepository.js'
import { fetchPrevisionRows } from './previsionRepository.js'

const app = express()
const port = Number(process.env.API_PORT || 3001)

app.get('/api/health', (_request, response) => {
  response.json({ ok: true })
})

app.get('/api/prevision', async (request, response) => {
  try {
    const rows = await fetchPrevisionRows({
      from: String(request.query.from || ''),
      to: String(request.query.to || ''),
    })
    response.json({ rows })
  } catch (error) {
    console.error('[api/prevision]', error)
    response.status(500).json({
      message: 'No fue posible consultar la base de datos de Previsión.',
      detail: error.message,
    })
  }
})

app.get('/api/homenajes', async (request, response) => {
  try {
    const data = await fetchHomenajes({
      from: String(request.query.from || ''),
      to: String(request.query.to || ''),
    })
    response.json(data)
  } catch (error) {
    console.error('[api/homenajes]', error)
    response.status(500).json({
      message: 'No fue posible consultar las órdenes de servicio funerario.',
      detail: error.message,
    })
  }
})

app.listen(port, () => {
  console.log(`API Crystal Dashboard escuchando en http://127.0.0.1:${port}`)
})
