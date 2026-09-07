import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local', override: true })

const MODULES = new Set(['prevision', 'homenajes', 'cartera', 'facturacion'])

const supabaseUrl = String(process.env.SUPABASE_URL || '').trim()
const supabaseSecretKey = String(process.env.SUPABASE_SECRET_KEY || '').trim()
const supabasePublishableKey = String(process.env.SUPABASE_PUBLISHABLE_KEY || '').trim()

export const supabaseAdmin = supabaseUrl && supabaseSecretKey
  ? createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    })
  : null

export function createUserClient(token) {
  if (!supabaseUrl || !supabasePublishableKey) return null
  return createClient(supabaseUrl, supabasePublishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}

export function sanitizeModules(modules) {
  if (!Array.isArray(modules)) return []
  return [...new Set(modules.map(String).filter((moduleId) => MODULES.has(moduleId)))]
}

export function serializeProfile(profile) {
  const permissions = Array.isArray(profile?.user_module_permissions)
    ? profile.user_module_permissions
    : []

  return {
    id: profile.id,
    fullName: profile.full_name,
    email: profile.email,
    role: profile.role,
    isActive: profile.is_active,
    modules: permissions
      .filter((permission) => permission.can_view)
      .map((permission) => permission.module_id),
    createdAt: profile.created_at,
  }
}

export async function fetchProfile(userId, client) {
  const { data, error } = await client
    .from('profiles')
    .select('id, full_name, email, role, is_active, created_at, user_module_permissions(module_id, can_view)')
    .eq('id', userId)
    .single()

  if (error) throw error
  return serializeProfile(data)
}

function bearerToken(request) {
  const authorization = String(request.headers.authorization || '')
  return authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
}

export async function requireAuth(request, response, next) {
  if (!supabaseAdmin || !supabasePublishableKey) {
    response.status(503).json({ message: 'La autenticación todavía no está configurada en el servidor.' })
    return
  }

  const token = bearerToken(request)
  if (!token) {
    response.status(401).json({ message: 'Debes iniciar sesión para continuar.' })
    return
  }

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !data.user) {
      response.status(401).json({ message: 'La sesión no es válida o ya expiró.' })
      return
    }

    const userClient = createUserClient(token)
    const profile = await fetchProfile(data.user.id, userClient)
    if (!profile.isActive) {
      response.status(403).json({ message: 'Tu usuario se encuentra deshabilitado.' })
      return
    }

    request.auth = { token, user: data.user, profile, client: userClient }
    next()
  } catch (error) {
    console.error('[auth]', error)
    response.status(401).json({ message: 'No fue posible validar la sesión.' })
  }
}

export function requireAdmin(request, response, next) {
  if (request.auth?.profile?.role !== 'admin') {
    response.status(403).json({ message: 'Esta acción requiere permisos de administrador.' })
    return
  }
  next()
}

export function requireModule(moduleId) {
  return (request, response, next) => {
    const profile = request.auth?.profile
    if (profile?.role === 'admin' || profile?.modules?.includes(moduleId)) {
      next()
      return
    }
    response.status(403).json({ message: 'No tienes permiso para consultar este módulo.' })
  }
}
