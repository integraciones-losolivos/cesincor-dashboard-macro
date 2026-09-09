import 'dotenv/config'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchHomenajes } from './homenajesRepository.js'
import { fetchPrevisionBillingSummary } from './previsionBillingRepository.js'
import { fetchPrevisionRows } from './previsionRepository.js'
import { fetchRetiros } from './retirosRepository.js'
import { requireAuth, requireModule, supabaseAdmin } from './auth.js'
import usersRouter from './usersRouter.js'

const app = express()
const port = Number(process.env.PORT || process.env.API_PORT || 3001)
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDirectory = path.join(projectRoot, 'dist')

app.use(express.json({ limit: '100kb' }))

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, dataSource: 'hana-direct' })
})

app.get('/api/auth/me', requireAuth, (request, response) => {
  response.json({ profile: request.auth.profile })
})

app.post('/api/auth/update-password', requireAuth, async (request, response) => {
  const password = String(request.body.password || '')
  const strongPassword = password.length >= 8
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password)

  if (!strongPassword) {
    response.status(400).json({ message: 'La contraseña no cumple los requisitos de seguridad.' })
    return
  }

  try {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(request.auth.user.id, {
      password,
      app_metadata: {
        ...request.auth.user.app_metadata,
        force_password_change: false,
        password_changed_at: new Date().toISOString(),
      },
    })
    if (error) throw error
    response.json({ message: 'Contraseña actualizada correctamente.' })
  } catch (error) {
    console.error('[auth:update-password]', error)
    response.status(500).json({ message: 'No fue posible actualizar la contraseña.' })
  }
})

app.use('/api/admin/users', usersRouter)

app.get('/api/prevision', requireAuth, requireModule('prevision'), async (request, response) => {
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

app.get('/api/prevision/facturacion', requireAuth, requireModule('prevision'), async (request, response) => {
  try {
    const range = { from: String(request.query.from || ''), to: String(request.query.to || '') }
    response.json(await fetchPrevisionBillingSummary(range))
  } catch (error) {
    console.error('[api/prevision/facturacion]', error)
    response.status(500).json({
      message: 'No fue posible consultar la facturación de Previsión.',
      ...(process.env.NODE_ENV === 'development' ? { detail: error.message } : {}),
    })
  }
})

app.get('/api/homenajes', requireAuth, requireModule('homenajes'), async (request, response) => {
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

app.get('/api/retiros', requireAuth, requireModule('prevision'), async (request, response) => {
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
