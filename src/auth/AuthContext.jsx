import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)

function callbackAuthError() {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const queryParams = new URLSearchParams(window.location.search)
  const description = hashParams.get('error_description') || queryParams.get('error_description')
  if (!description) return ''
  if (/expired/i.test(description)) return 'El enlace venció. Solicita uno nuevo.'
  return 'El enlace de acceso no es válido o ya fue utilizado. Solicita uno nuevo.'
}

function callbackPasswordFlow() {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const queryParams = new URLSearchParams(window.location.search)
  const type = hashParams.get('type') || queryParams.get('type') || queryParams.get('flow')
  if (window.location.pathname === '/reset-password') return 'recovery'
  return type === 'invite' || type === 'recovery' ? type : null
}

function tokenHashCallback() {
  const params = new URLSearchParams(window.location.search)
  const type = params.get('type')
  const tokenHash = params.get('token_hash')
  return tokenHash && (type === 'invite' || type === 'recovery') ? { tokenHash, type } : null
}

function sessionIssuedAt(session) {
  try {
    const encoded = session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return Number(JSON.parse(window.atob(encoded)).iat || 0) * 1000
  } catch {
    return 0
  }
}

function clearAuthCallbackUrl() {
  window.history.replaceState({}, document.title, '/')
}

async function requestProfile(accessToken) {
  const response = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.message || 'No fue posible validar tu acceso.')
    error.status = response.status
    throw error
  }
  return payload.profile
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(callbackAuthError)
  const [passwordFlow, setPasswordFlow] = useState(callbackPasswordFlow)

  const loadProfile = useCallback(async (nextSession) => {
    if (!nextSession?.access_token) {
      setProfile(null)
      return null
    }

    try {
      const nextProfile = await requestProfile(nextSession.access_token)
      setProfile(nextProfile)
      setError('')
      return nextProfile
    } catch (profileError) {
      setProfile(null)
      setError(profileError.message)
      if (profileError.status === 401 || profileError.status === 403) {
        await supabase.auth.signOut()
        setSession(null)
      }
      return null
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError('Faltan las variables de conexión con Supabase.')
      setLoading(false)
      return undefined
    }

    let active = true
    async function initializeSession() {
      const requestedFlow = callbackPasswordFlow()
      const tokenCallback = tokenHashCallback()

      try {
        if (tokenCallback) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenCallback.tokenHash,
            type: tokenCallback.type,
          })
          if (verifyError) throw verifyError
        }

        const { data } = await supabase.auth.getSession()
        if (!active) return
        let nextSession = data.session

        if (nextSession && requestedFlow) {
          const { data: currentUser, error: userError } = await supabase.auth.getUser()
          if (userError) throw userError
          const metadata = currentUser.user?.app_metadata || {}
          const invitationAlreadyAccepted = requestedFlow === 'invite' && !metadata.force_password_change
          const passwordChangedAt = Date.parse(metadata.password_changed_at || '')
          const recoveryAlreadyUsed = requestedFlow === 'recovery'
            && Number.isFinite(passwordChangedAt)
            && passwordChangedAt >= sessionIssuedAt(nextSession)

          if (invitationAlreadyAccepted || recoveryAlreadyUsed) {
            await supabase.auth.signOut()
            nextSession = null
            setPasswordFlow(null)
            setError(invitationAlreadyAccepted
              ? 'Esta invitación ya fue aceptada y la cuenta está activa. Inicia sesión con tu contraseña.'
              : 'Este enlace de recuperación ya fue utilizado. Inicia sesión o solicita uno nuevo.')
          } else {
            setPasswordFlow(requestedFlow)
          }
          clearAuthCallbackUrl()
        } else if (nextSession?.user?.app_metadata?.force_password_change) {
          setPasswordFlow('forced')
        }

        setSession(nextSession)
        await loadProfile(nextSession)
      } catch (sessionError) {
        await supabase.auth.signOut().catch(() => {})
        if (active) {
          setSession(null)
          setProfile(null)
          setPasswordFlow(null)
          setError(/expired|invalid|otp/i.test(String(sessionError?.message || ''))
            ? 'El enlace ya fue utilizado o venció. Solicita uno nuevo.'
            : 'No fue posible validar el enlace. Solicita uno nuevo.')
          clearAuthCallbackUrl()
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    initializeSession()

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      if (event === 'PASSWORD_RECOVERY') setPasswordFlow('recovery')
      else if (nextSession?.user?.app_metadata?.force_password_change) setPasswordFlow('forced')
      window.setTimeout(async () => {
        if (!active) return
        await loadProfile(nextSession)
        if (active) setLoading(false)
      }, 0)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signIn = useCallback(async (email, password) => {
    setError('')
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) throw signInError
    setSession(data.session)
    if (data.user?.app_metadata?.force_password_change) setPasswordFlow('forced')
    const nextProfile = await loadProfile(data.session)
    if (!nextProfile) throw new Error('Tu cuenta no tiene acceso habilitado.')
    return nextProfile
  }, [loadProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
    setPasswordFlow(null)
    setError('')
  }, [])

  const requestPasswordReset = useCallback(async (email) => {
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (resetError) throw resetError
  }, [])

  const updatePassword = useCallback(async (password) => {
    const { data: sessionData } = await supabase.auth.getSession()
    const response = await fetch('/api/auth/update-password', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sessionData.session?.access_token || ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.message || 'No fue posible actualizar la contraseña.')
    await supabase.auth.refreshSession()
    setPasswordFlow(null)
    window.history.replaceState({}, document.title, window.location.pathname)
  }, [])

  const refreshProfile = useCallback(() => loadProfile(session), [loadProfile, session])

  const value = useMemo(() => ({
    session,
    profile,
    loading,
    error,
    requiresPasswordUpdate: Boolean(passwordFlow),
    passwordFlow,
    signIn,
    signOut,
    requestPasswordReset,
    updatePassword,
    refreshProfile,
  }), [
    session,
    profile,
    loading,
    error,
    passwordFlow,
    signIn,
    signOut,
    requestPasswordReset,
    updatePassword,
    refreshProfile,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe utilizarse dentro de AuthProvider.')
  return context
}
