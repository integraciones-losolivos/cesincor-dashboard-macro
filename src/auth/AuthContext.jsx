import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)

function callbackRequiresPassword() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const type = params.get('type')
  return type === 'invite' || type === 'recovery'
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
  const [error, setError] = useState('')
  const [requiresPasswordUpdate, setRequiresPasswordUpdate] = useState(callbackRequiresPassword)

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
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      await loadProfile(data.session)
      if (active) setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      if (event === 'PASSWORD_RECOVERY') setRequiresPasswordUpdate(true)
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
    const nextProfile = await loadProfile(data.session)
    if (!nextProfile) throw new Error('Tu cuenta no tiene acceso habilitado.')
    return nextProfile
  }, [loadProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
    setRequiresPasswordUpdate(false)
    setError('')
  }, [])

  const requestPasswordReset = useCallback(async (email) => {
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    })
    if (resetError) throw resetError
  }, [])

  const updatePassword = useCallback(async (password) => {
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) throw updateError
    setRequiresPasswordUpdate(false)
    window.history.replaceState({}, document.title, window.location.pathname)
  }, [])

  const refreshProfile = useCallback(() => loadProfile(session), [loadProfile, session])

  const value = useMemo(() => ({
    session,
    profile,
    loading,
    error,
    requiresPasswordUpdate,
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
    requiresPasswordUpdate,
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
