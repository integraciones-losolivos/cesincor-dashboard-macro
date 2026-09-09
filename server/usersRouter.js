import { Router } from 'express'
import { randomBytes } from 'node:crypto'
import {
  fetchProfile,
  requireAdmin,
  requireAuth,
  sanitizeModules,
  serializeProfile,
  supabaseAdmin,
} from './auth.js'

const router = Router()
const VALID_ROLES = new Set(['admin', 'user'])
const appUrl = String(process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '')

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

function normalizeRole(value) {
  const role = String(value || 'user')
  return VALID_ROLES.has(role) ? role : 'user'
}

function temporaryPassword() {
  return `Tmp-${randomBytes(12).toString('base64url')}9a!`
}

function isEmailRateLimitError(error) {
  return error?.code === 'over_email_send_rate_limit'
    || /email rate limit|rate limit.*email/i.test(String(error?.message || ''))
}

function authAccountStatus(user) {
  if (!user) return 'unknown'
  if (!user.email_confirmed_at && !user.confirmed_at) return 'invited'
  if (!user.last_sign_in_at) return 'confirmed'
  return 'active'
}

async function replacePermissions(client, userId, modules) {
  const { error: deleteError } = await client
    .from('user_module_permissions')
    .delete()
    .eq('user_id', userId)

  if (deleteError) throw deleteError

  const rows = sanitizeModules(modules).map((moduleId) => ({
    user_id: userId,
    module_id: moduleId,
    can_view: true,
  }))

  if (rows.length) {
    const { error: insertError } = await client
      .from('user_module_permissions')
      .insert(rows)
    if (insertError) throw insertError
  }
}

router.use(requireAuth, requireAdmin)

router.get('/', async (_request, response) => {
  try {
    const [{ data, error }, authResult] = await Promise.all([
      _request.auth.client
      .from('profiles')
      .select('id, full_name, email, role, is_active, created_at, user_module_permissions(module_id, can_view)')
      .order('full_name', { ascending: true }),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ])

    if (error) throw error
    if (authResult.error) throw authResult.error
    const authUsers = new Map(authResult.data.users.map((user) => [user.id, user]))
    response.json({
      users: data.map((profile) => ({
        ...serializeProfile(profile),
        accountStatus: authAccountStatus(authUsers.get(profile.id)),
      })),
    })
  } catch (error) {
    console.error('[admin/users:list]', error)
    response.status(500).json({ message: 'No fue posible consultar los usuarios.' })
  }
})

router.post('/', async (request, response) => {
  const email = normalizeEmail(request.body.email)
  const fullName = String(request.body.fullName || '').trim()
  const role = normalizeRole(request.body.role)
  const isActive = request.body.isActive !== false
  const modules = sanitizeModules(request.body.modules)
  const accessMethod = request.body.accessMethod === 'email' ? 'email' : 'temporary-password'

  if (!email || !fullName) {
    response.status(400).json({ message: 'El nombre y el correo son obligatorios.' })
    return
  }

  let createdUser
  try {
    const generatedPassword = accessMethod === 'temporary-password' ? temporaryPassword() : null
    const { data, error } = accessMethod === 'email'
      ? await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          data: { full_name: fullName },
          redirectTo: `${appUrl}/?flow=invite`,
        })
      : await supabaseAdmin.auth.admin.createUser({
          email,
          password: generatedPassword,
          email_confirm: true,
          user_metadata: { full_name: fullName, force_password_change: true },
        })
    if (error) throw error
    createdUser = data.user

    const { error: profileError } = await request.auth.client
      .from('profiles')
      .upsert({
        id: createdUser.id,
        full_name: fullName,
        email,
        role,
        is_active: isActive,
      })
    if (profileError) throw profileError

    await replacePermissions(request.auth.client, createdUser.id, modules)
    if (!isActive) {
      await supabaseAdmin.auth.admin.updateUserById(createdUser.id, { ban_duration: '876000h' })
    }

    response.status(201).json({
      user: await fetchProfile(createdUser.id, request.auth.client),
      accessMethod,
      ...(generatedPassword ? { temporaryPassword: generatedPassword } : {}),
    })
  } catch (error) {
    console.error('[admin/users:create]', error)
    if (createdUser?.id) await supabaseAdmin.auth.admin.deleteUser(createdUser.id).catch(() => {})
    const duplicate = /already|registered|exists/i.test(String(error.message || ''))
    const rateLimited = isEmailRateLimitError(error)
    response.status(duplicate ? 409 : rateLimited ? 429 : 500).json({
      message: duplicate
        ? 'Ya existe un usuario registrado con ese correo.'
        : rateLimited
          ? 'Supabase alcanzó el límite temporal de correos. Espera unos minutos antes de volver a invitar.'
          : 'No fue posible crear e invitar al usuario.',
    })
  }
})

router.patch('/:userId', async (request, response) => {
  const { userId } = request.params
  const fullName = String(request.body.fullName || '').trim()
  const role = normalizeRole(request.body.role)
  const isActive = request.body.isActive !== false
  const modules = sanitizeModules(request.body.modules)

  if (!fullName) {
    response.status(400).json({ message: 'El nombre es obligatorio.' })
    return
  }

  if (userId === request.auth.user.id && (!isActive || role !== 'admin')) {
    response.status(400).json({ message: 'No puedes deshabilitar ni quitar tu propio rol de administrador.' })
    return
  }

  try {
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: isActive ? 'none' : '876000h',
      user_metadata: { full_name: fullName },
    })
    if (authError) throw authError

    const { error: profileError } = await request.auth.client
      .from('profiles')
      .update({ full_name: fullName, role, is_active: isActive })
      .eq('id', userId)
    if (profileError) throw profileError

    await replacePermissions(request.auth.client, userId, modules)
    response.json({ user: await fetchProfile(userId, request.auth.client) })
  } catch (error) {
    console.error('[admin/users:update]', error)
    response.status(500).json({ message: 'No fue posible actualizar el usuario.' })
  }
})

router.post('/:userId/reset-password', async (request, response) => {
  try {
    const profile = await fetchProfile(request.params.userId, request.auth.client)
    const { data: authData, error: userError } = await supabaseAdmin.auth.admin.getUserById(request.params.userId)
    if (userError) throw userError
    if (!authData.user.email_confirmed_at && !authData.user.confirmed_at) {
      response.status(409).json({
        message: 'La persona todavía no ha aceptado la invitación. El restablecimiento de contraseña solo está disponible después de activar la cuenta.',
      })
      return
    }
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${appUrl}/reset-password`,
    })
    if (error) throw error
    response.json({ message: 'Se envió el enlace para restablecer la contraseña.' })
  } catch (error) {
    console.error('[admin/users:reset-password]', error)
    const rateLimited = isEmailRateLimitError(error)
    response.status(rateLimited ? 429 : 500).json({
      message: rateLimited
        ? 'Supabase alcanzó el límite temporal de correos. Espera unos minutos antes de volver a enviar el enlace.'
        : 'No fue posible enviar el correo de recuperación.',
    })
  }
})

export default router
