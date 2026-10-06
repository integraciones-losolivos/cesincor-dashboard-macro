import 'dotenv/config'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchHomenajes } from './homenajesRepository.js'
import { fetchPrevisionBillingSummary } from './previsionBillingRepository.js'
import { buildIncomeAlertDetails, fetchPrevisionIncomeRows, toPublicIncomeRow } from './previsionIncomeRepository.js'
import { fetchPrevisionRows } from './previsionRepository.js'
import { fetchRetiros } from './retirosRepository.js'
import { fetchReclasificacion } from './reclasificacionRepository.js'
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

app.get('/api/prevision/ingresos', requireAuth, requireModule('prevision'), async (request, response) => {
  try {
    const range = {
      from: String(request.query.from || ''),
      to: String(request.query.to || ''),
      convenio: String(request.query.convenio || ''),
      forceRefresh: String(request.query.refresh || '') === 'true',
    }
    const rows = await fetchPrevisionIncomeRows(range)
    response.json({ rows: rows.map(toPublicIncomeRow) })
  } catch (error) {
    console.error('[api/prevision/ingresos]', error)
    response.status(500).json({
      message: 'No fue posible consultar los ingresos de Previsión.',
      ...(process.env.NODE_ENV === 'development' ? { detail: error.message } : {}),
    })
  }
})

app.get('/api/prevision/ingresos/alertas/:alerta', requireAuth, requireModule('prevision'), async (request, response) => {
  const allowedAlerts = new Set([
    'TITULAR_NO_ACTIVO', 'TITULAR_SIN_FACTURACION', 'INGRESO_POSTERIOR_CORTE',
    'VIGENCIA_POSTERIOR_CORTE', 'NACIMIENTO_INVALIDO', 'NACIMIENTO_FUTURO', 'EDAD_MAYOR_120',
  ])
  const alerta = String(request.params.alerta || '')
  if (!allowedAlerts.has(alerta)) {
    response.status(400).json({ message: 'La alerta solicitada no es válida.' })
    return
  }
  try {
    const range = { from: String(request.query.from || ''), to: String(request.query.to || '') }
    const filters = {
      sede: String(request.query.sede || ''), plan: String(request.query.plan || ''),
      convenio: String(request.query.convenio || ''), asesor: String(request.query.asesor || ''),
      tipoAfiliado: String(request.query.tipoAfiliado || ''), parentesco: String(request.query.parentesco || ''),
      estado: String(request.query.estado || ''), search: String(request.query.search || ''),
    }
    const rows = await fetchPrevisionIncomeRows(range)
    response.json({ rows: buildIncomeAlertDetails(rows, alerta, filters) })
  } catch (error) {
    console.error('[api/prevision/ingresos/alertas]', error)
    response.status(500).json({ message: 'No fue posible consultar el detalle de la alerta.' })
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

app.get('/api/retiros/reclasificacion', requireAuth, requireModule('prevision'), async (request, response) => {
  try {
    response.json({ rows: await fetchReclasificacion({ vigencia: String(request.query.vigencia || '') }) })
  } catch (error) {
    console.error('[api/retiros/reclasificacion]', error)
    const invalidInput = /fecha de vigencia|formato YYYY-MM-DD/i.test(error.message)
    response.status(invalidInput ? 400 : 500).json({ message: invalidInput ? error.message : 'No fue posible consultar la reclasificación.' })
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
