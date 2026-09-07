import { useState } from 'react'
import { ArrowLeft, Eye, EyeOff, LayoutDashboard, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'

function PasswordField({ value, onChange, placeholder = 'Contraseña', autoComplete = 'current-password' }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        minLength={8}
        className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-12 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

export default function LoginPage() {
  const {
    session,
    error: authError,
    requiresPasswordUpdate,
    signIn,
    requestPasswordReset,
    updatePassword,
  } = useAuth()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const passwordMode = requiresPasswordUpdate && session

  const handleLogin = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      await signIn(email.trim(), password)
    } catch (submitError) {
      setError(submitError.message === 'Invalid login credentials'
        ? 'El correo o la contraseña no son correctos.'
        : submitError.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await requestPasswordReset(email.trim())
      setMessage('Revisa tu correo. Enviamos un enlace para crear una nueva contraseña.')
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleNewPassword = async (event) => {
    event.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setSubmitting(true)
    try {
      await updatePassword(password)
      setMessage('Contraseña guardada correctamente.')
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="relative grid min-h-screen overflow-hidden bg-slate-950 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_15%_20%,#22c55e_0,transparent_28%),radial-gradient(circle_at_85%_80%,#84cc16_0,transparent_25%)]" />

      <section className="relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex xl:p-16">
        <div className="inline-flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
            <LayoutDashboard className="size-6" />
          </div>
          <div>
            <p className="font-heading text-lg font-bold">Dashboard Gerencial</p>
            <p className="text-sm font-semibold text-emerald-200">Los Olivos Córdoba y Sucre</p>
          </div>
        </div>

        <div className="max-w-xl">
          <div className="mb-7 grid size-16 place-items-center rounded-3xl bg-emerald-400/15 ring-1 ring-emerald-300/20">
            <ShieldCheck className="size-8 text-emerald-300" />
          </div>
          <h1 className="font-heading text-4xl font-bold leading-tight xl:text-5xl">
            Información estratégica, disponible de forma segura.
          </h1>
          <p className="mt-6 max-w-lg text-lg font-medium leading-8 text-slate-300">
            Accede a los indicadores autorizados para tu área con una cuenta administrada por la organización.
          </p>
        </div>

        <p className="text-sm font-semibold text-slate-400">Conexión protegida · Acceso por roles y módulos</p>
      </section>

      <section className="relative grid place-items-center bg-slate-50/95 px-5 py-10 sm:px-10 lg:rounded-l-[3rem]">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="grid size-11 place-items-center rounded-2xl bg-emerald-800 text-white">
              <LayoutDashboard className="size-5" />
            </div>
            <div>
              <p className="font-heading text-sm font-bold text-slate-950">Dashboard Gerencial</p>
              <p className="text-xs font-semibold text-slate-500">Los Olivos Córdoba y Sucre</p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white bg-white p-7 shadow-2xl shadow-slate-950/10 sm:p-9">
            {passwordMode ? (
              <>
                <div className="mb-7">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Cuenta protegida</p>
                  <h2 className="mt-2 font-heading text-2xl font-bold text-slate-950">Crea tu contraseña</h2>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-500">Define una contraseña personal para terminar de activar tu acceso.</p>
                </div>
                <form onSubmit={handleNewPassword} className="space-y-4">
                  <PasswordField value={password} onChange={setPassword} placeholder="Nueva contraseña" autoComplete="new-password" />
                  <PasswordField value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirmar contraseña" autoComplete="new-password" />
                  <button type="submit" disabled={submitting} className="w-full rounded-2xl bg-emerald-800 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60">
                    {submitting ? 'Guardando…' : 'Guardar contraseña'}
                  </button>
                </form>
              </>
            ) : mode === 'reset' ? (
              <>
                <button type="button" onClick={() => { setMode('login'); setError(''); setMessage('') }} className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-800">
                  <ArrowLeft className="size-4" /> Volver al ingreso
                </button>
                <div className="mb-7">
                  <h2 className="font-heading text-2xl font-bold text-slate-950">Recuperar contraseña</h2>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-500">Te enviaremos un enlace seguro al correo registrado.</p>
                </div>
                <form onSubmit={handleReset} className="space-y-4">
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="correo@empresa.com" autoComplete="email" required className="w-full rounded-2xl border border-slate-200 py-3.5 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" />
                  </div>
                  <button type="submit" disabled={submitting} className="w-full rounded-2xl bg-emerald-800 px-5 py-3.5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-60">
                    {submitting ? 'Enviando…' : 'Enviar enlace'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="mb-7">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Bienvenido</p>
                  <h2 className="mt-2 font-heading text-2xl font-bold text-slate-950">Inicia sesión</h2>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-500">Utiliza el correo y la contraseña asignados por el administrador.</p>
                </div>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="correo@empresa.com" autoComplete="email" required className="w-full rounded-2xl border border-slate-200 py-3.5 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" />
                  </div>
                  <PasswordField value={password} onChange={setPassword} />
                  <div className="flex justify-end">
                    <button type="button" onClick={() => { setMode('reset'); setError(''); setMessage('') }} className="text-xs font-bold text-emerald-800 hover:text-emerald-600">¿Olvidaste tu contraseña?</button>
                  </div>
                  <button type="submit" disabled={submitting} className="w-full rounded-2xl bg-gradient-to-r from-emerald-900 to-emerald-700 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-900/20 transition hover:from-emerald-800 hover:to-emerald-600 disabled:cursor-wait disabled:opacity-60">
                    {submitting ? 'Validando…' : 'Ingresar al dashboard'}
                  </button>
                </form>
              </>
            )}

            {(error || authError) && <p role="alert" className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error || authError}</p>}
            {message && <p role="status" className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{message}</p>}
          </div>
        </div>
      </section>
    </main>
  )
}
