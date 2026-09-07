import { Router } from 'express'
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
    const { data, error } = await _request.auth.client
      .from('profiles')
      .select('id, full_name, email, role, is_active, created_at, user_module_permissions(module_id, can_view)')
      .order('full_name', { ascending: true })

    if (error) throw error
    response.json({ users: data.map(serializeProfile) })
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

  if (!email || !fullName) {
    response.status(400).json({ message: 'El nombre y el correo son obligatorios.' })
    return
  }

  let createdUser
  try {
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
      redirectTo: `${appUrl}/`,
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

    response.status(201).json({ user: await fetchProfile(createdUser.id, request.auth.client) })
  } catch (error) {
    console.error('[admin/users:create]', error)
    if (createdUser?.id) await supabaseAdmin.auth.admin.deleteUser(createdUser.id).catch(() => {})
    const duplicate = /already|registered|exists/i.test(String(error.message || ''))
    response.status(duplicate ? 409 : 500).json({
      message: duplicate
        ? 'Ya existe un usuario registrado con ese correo.'
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
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${appUrl}/`,
    })
    if (error) throw error
    response.json({ message: 'Se envió el enlace para restablecer la contraseña.' })
  } catch (error) {
    console.error('[admin/users:reset-password]', error)
    response.status(500).json({ message: 'No fue posible enviar el correo de recuperación.' })
  }
})

export default router
