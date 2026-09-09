import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Check,
  Circle,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'
import { authErrorMessage } from '../auth/authMessages.js'
import { isStrongPassword, PASSWORD_MIN_LENGTH, passwordRuleResults } from '../auth/passwordPolicy.js'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function emailValidationMessage(email) {
  if (!email.trim()) return 'Escribe tu correo electrónico.'
  if (!emailPattern.test(email.trim())) return 'Escribe una dirección de correo válida.'
  return ''
}

function PasswordField({ value, onChange, placeholder = 'Contraseña', autoComplete = 'current-password', label }) {
  const [visible, setVisible] = useState(false)

  return (
    <label className="block">
      {label && <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>}
      <span className="relative block">
        <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-label={label || placeholder}
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
      </span>
    </label>
  )
}

function EmailField({ value, onChange }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">Correo electrónico</span>
      <span className="relative block">
        <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="email"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="correo@losolivos.co"
          autoComplete="email"
          aria-label="Correo electrónico"
          className="w-full rounded-2xl border border-slate-200 py-3.5 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
        />
      </span>
    </label>
  )
}

function PasswordChecklist({ password }) {
  const results = useMemo(() => passwordRuleResults(password), [password])

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4" aria-label="Requisitos de contraseña">
      <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">Tu contraseña debe incluir</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {results.map((rule) => (
          <div key={rule.id} className={`flex items-center gap-2 text-xs font-bold ${rule.valid ? 'text-emerald-700' : 'text-slate-500'}`}>
            {rule.valid ? <Check className="size-4" /> : <Circle className="size-3.5" />}
            <span>{rule.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const flowPresentation = {
  login: {
    eyebrow: 'Acceso privado',
    title: 'Inicia sesión',
    description: 'Ingresa con el correo y la contraseña asignados por el administrador.',
    heroTitle: 'Información estratégica, disponible de forma segura.',
    heroDescription: 'Consulta únicamente los indicadores autorizados para tu área.',
    icon: ShieldCheck,
    iconClass: 'bg-emerald-100 text-emerald-800',
    accentClass: 'bg-emerald-500',
  },
  reset: {
    eyebrow: 'Recuperación de acceso',
    title: 'Solicita un enlace seguro',
    description: 'Escribe tu correo y recibirás las instrucciones para restablecer tu contraseña.',
    heroTitle: 'Recupera tu acceso de forma segura.',
    heroDescription: 'El enlace será personal, tendrá vigencia limitada y solo podrá utilizarse una vez.',
    icon: Mail,
    iconClass: 'bg-amber-100 text-amber-800',
    accentClass: 'bg-amber-400',
  },
  invite: {
    eyebrow: 'Invitación aceptada',
    title: 'Activa tu cuenta',
    description: 'Crea una contraseña personal para terminar de activar tu acceso al dashboard.',
    heroTitle: 'Tu acceso a Los Olivos está casi listo.',
    heroDescription: 'Define una contraseña segura y entra a los módulos asignados por tu administrador.',
    icon: Sparkles,
    iconClass: 'bg-emerald-100 text-emerald-800',
    accentClass: 'bg-lime-400',
  },
  recovery: {
    eyebrow: 'Identidad verificada',
    title: 'Restablece tu contraseña',
    description: 'El enlace es válido. Ahora define una contraseña nueva para recuperar tu acceso.',
    heroTitle: 'Crea una nueva clave de acceso.',
    heroDescription: 'Esta contraseña reemplazará la anterior y se aplicará inmediatamente.',
    icon: KeyRound,
    iconClass: 'bg-sky-100 text-sky-800',
    accentClass: 'bg-sky-400',
  },
  forced: {
    eyebrow: 'Primer ingreso',
    title: 'Crea tu contraseña personal',
    description: 'Por seguridad, debes reemplazar la contraseña temporal antes de continuar.',
    heroTitle: 'Protege tu cuenta antes de entrar.',
    heroDescription: 'Define una contraseña que solo tú conozcas para acceder a los módulos asignados.',
    icon: KeyRound,
    iconClass: 'bg-violet-100 text-violet-800',
    accentClass: 'bg-violet-400',
  },
}

export default function LoginPage() {
  const {
    session,
    error: authError,
    requiresPasswordUpdate,
    passwordFlow,
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

  const passwordMode = Boolean(requiresPasswordUpdate && session)
  const activeMode = passwordMode ? (passwordFlow || 'recovery') : mode
  const presentation = flowPresentation[activeMode]
  const FlowIcon = presentation.icon
  const strongPassword = isStrongPassword(password)

  useEffect(() => {
    const previousTitle = document.title
    document.title = `${presentation.title} | Dashboard Los Olivos`
    return () => { document.title = previousTitle }
  }, [presentation.title])

  const changeMode = (nextMode) => {
    setMode(nextMode)
    setError('')
    setMessage('')
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    const emailError = emailValidationMessage(email)
    if (emailError) {
      setError(emailError)
      return
    }
    if (!password) {
      setError('Escribe tu contraseña.')
      return
    }

    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      await signIn(email.trim(), password)
    } catch (submitError) {
      setError(authErrorMessage(submitError, 'No fue posible iniciar sesión. Verifica tus datos e inténtalo de nuevo.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = async (event) => {
    event.preventDefault()
    const emailError = emailValidationMessage(email)
    if (emailError) {
      setError(emailError)
      return
    }

    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      await requestPasswordReset(email.trim())
      setMessage('Correo enviado. Revisa tu bandeja de entrada y también la carpeta de correo no deseado.')
    } catch (submitError) {
      setError(authErrorMessage(submitError, 'No fue posible enviar el enlace. Inténtalo nuevamente en unos minutos.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleNewPassword = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!strongPassword) {
      setError(`La contraseña debe tener mínimo ${PASSWORD_MIN_LENGTH} caracteres e incluir mayúscula, minúscula, número y símbolo.`)
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setSubmitting(true)
    try {
      await updatePassword(password)
      setMessage('Contraseña guardada correctamente.')
    } catch (submitError) {
      setError(authErrorMessage(submitError, 'No fue posible guardar la contraseña. Solicita un enlace nuevo e inténtalo de nuevo.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (passwordMode && passwordFlow === 'invite') {
    return (
      <main className="relative min-h-screen overflow-hidden bg-slate-50 px-5 py-8 sm:px-8 sm:py-12">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-emerald-100/70 to-transparent" />
        <div className="pointer-events-none absolute -right-32 -top-32 size-96 rounded-full bg-lime-200/30 blur-3xl" />
        <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-2xl flex-col sm:min-h-[calc(100vh-6rem)]">
          <header className="flex items-center justify-center gap-4 pb-8 sm:pb-10">
            <img src="/logo-los-olivos.webp" alt="Los Olivos" className="h-14 w-auto sm:h-16" />
            <div className="hidden h-10 w-px bg-slate-200 sm:block" />
            <p className="hidden text-xs font-black uppercase tracking-[0.16em] text-slate-500 sm:block">Dashboard Gerencial<br />Córdoba y Sucre</p>
          </header>

          <section className="my-auto overflow-hidden rounded-[2rem] border border-white bg-white shadow-2xl shadow-emerald-950/10">
            <div className="border-b border-slate-100 px-6 py-5 sm:px-10">
              <ol className="grid grid-cols-3 gap-2" aria-label="Progreso de activación">
                <li className="flex items-center gap-2 text-xs font-extrabold text-emerald-700">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-700 text-white"><Check className="size-4" /></span>
                  <span className="hidden sm:inline">Invitación</span>
                </li>
                <li className="flex items-center justify-center gap-2 text-xs font-extrabold text-emerald-800">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-100 ring-2 ring-emerald-600">2</span>
                  <span className="hidden sm:inline">Contraseña</span>
                </li>
                <li className="flex items-center justify-end gap-2 text-xs font-extrabold text-slate-400">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-100">3</span>
                  <span className="hidden sm:inline">Acceso</span>
                </li>
              </ol>
            </div>

            <div className="px-6 py-8 sm:px-10 sm:py-10">
              <div className="mx-auto max-w-lg text-center">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-800">
                  <Sparkles className="size-6" />
                </div>
                <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Invitación verificada</p>
                <h1 className="mt-2 font-heading text-3xl font-bold text-slate-950">Crea tu contraseña</h1>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-500">Este será el último paso para activar tu cuenta y entrar a los módulos que te asignaron.</p>
              </div>

              <div className="my-7 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3.5">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-emerald-700 shadow-sm"><Mail className="size-5" /></div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-wide text-emerald-700">Tu correo de ingreso</p>
                  <p className="truncate text-sm font-extrabold text-slate-900">{session?.user?.email}</p>
                </div>
                <Check className="ml-auto size-5 shrink-0 text-emerald-600" />
              </div>

              <form onSubmit={handleNewPassword} noValidate className="space-y-4">
                <PasswordField value={password} onChange={setPassword} placeholder="Nueva contraseña" autoComplete="new-password" label="Nueva contraseña" />
                <PasswordChecklist password={password} />
                <PasswordField value={confirmPassword} onChange={setConfirmPassword} placeholder="Repite la contraseña" autoComplete="new-password" label="Confirmar contraseña" />
                <button type="submit" disabled={submitting || !strongPassword} className="w-full rounded-2xl bg-gradient-to-r from-emerald-900 to-emerald-700 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-900/20 transition hover:from-emerald-800 hover:to-emerald-600 disabled:cursor-not-allowed disabled:opacity-50">
                  {submitting ? 'Activando tu cuenta…' : 'Crear contraseña y continuar'}
                </button>
              </form>

              {(error || authError) && <p role="alert" className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold leading-5 text-rose-700">{error || authError}</p>}
              {message && <p role="status" className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold leading-5 text-emerald-800">{message}</p>}
              <p className="mt-6 text-center text-xs font-semibold leading-5 text-slate-400">El enlace de invitación es personal. Nunca compartiremos tu contraseña con el administrador.</p>
            </div>
          </section>

          <p className="pt-7 text-center text-xs font-semibold text-slate-400">Conexión protegida · Acceso administrado por Los Olivos</p>
        </div>
      </main>
    )
  }

  return (
    <main className="relative grid min-h-screen overflow-hidden bg-slate-950 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_15%_20%,#22c55e_0,transparent_28%),radial-gradient(circle_at_85%_80%,#84cc16_0,transparent_25%)]" />

      <section className="relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex xl:p-16">
        <div>
          <img src="/logo-los-olivos-blanco.png" alt="Los Olivos" className="h-16 w-auto object-contain object-left" />
          <p className="mt-4 text-sm font-semibold text-emerald-200">Dashboard Gerencial · Córdoba y Sucre</p>
        </div>

        <div className="max-w-xl">
          <div className={`mb-7 grid size-16 place-items-center rounded-3xl ${presentation.iconClass} ring-1 ring-white/20`}>
            <FlowIcon className="size-8" />
          </div>
          <h1 className="font-heading text-4xl font-bold leading-tight xl:text-5xl">{presentation.heroTitle}</h1>
          <p className="mt-6 max-w-lg text-lg font-medium leading-8 text-slate-300">{presentation.heroDescription}</p>
        </div>

        <p className="text-sm font-semibold text-slate-400">Conexión protegida · Acceso por roles y módulos</p>
      </section>

      <section className="relative grid place-items-center bg-slate-50/95 px-5 py-10 sm:px-10 lg:rounded-l-[3rem]">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <img src="/logo-los-olivos.webp" alt="Los Olivos" className="h-14 w-auto" />
            <p className="mt-2 text-xs font-bold text-slate-500">Dashboard Gerencial · Córdoba y Sucre</p>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-white bg-white shadow-2xl shadow-slate-950/10">
            <div className={`h-1.5 w-full ${presentation.accentClass}`} />
            <div className="p-7 sm:p-9">
              <div className="mb-7 flex items-start gap-4">
                <div className={`grid size-12 shrink-0 place-items-center rounded-2xl ${presentation.iconClass}`}>
                  <FlowIcon className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{presentation.eyebrow}</p>
                  <h2 className="mt-1 font-heading text-2xl font-bold text-slate-950">{presentation.title}</h2>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{presentation.description}</p>
                </div>
              </div>

              {passwordMode ? (
                <form onSubmit={handleNewPassword} noValidate className="space-y-4">
                  <PasswordField value={password} onChange={setPassword} placeholder="Nueva contraseña" autoComplete="new-password" label="Nueva contraseña" />
                  <PasswordChecklist password={password} />
                  <PasswordField value={confirmPassword} onChange={setConfirmPassword} placeholder="Repite la contraseña" autoComplete="new-password" label="Confirmar contraseña" />
                  <button type="submit" disabled={submitting || !strongPassword} className="w-full rounded-2xl bg-emerald-800 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
                    {submitting ? 'Guardando contraseña…' : passwordFlow === 'invite' ? 'Activar mi cuenta' : passwordFlow === 'forced' ? 'Cambiar contraseña y continuar' : 'Guardar nueva contraseña'}
                  </button>
                </form>
              ) : mode === 'reset' ? (
                <>
                  <form onSubmit={handleReset} noValidate className="space-y-4">
                    <EmailField value={email} onChange={setEmail} />
                    <button type="submit" disabled={submitting} className="w-full rounded-2xl bg-amber-500 px-5 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 disabled:cursor-wait disabled:opacity-60">
                      {submitting ? 'Enviando enlace…' : 'Enviar enlace de recuperación'}
                    </button>
                  </form>
                  <button type="button" onClick={() => changeMode('login')} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-emerald-800">
                    <ArrowLeft className="size-4" /> Volver a iniciar sesión
                  </button>
                </>
              ) : (
                <form onSubmit={handleLogin} noValidate className="space-y-4">
                  <EmailField value={email} onChange={setEmail} />
                  <PasswordField value={password} onChange={setPassword} label="Contraseña" />
                  <div className="flex justify-end">
                    <button type="button" onClick={() => changeMode('reset')} className="text-xs font-bold text-emerald-800 transition hover:text-emerald-600">¿Olvidaste tu contraseña?</button>
                  </div>
                  <button type="submit" disabled={submitting} className="w-full rounded-2xl bg-gradient-to-r from-emerald-900 to-emerald-700 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-900/20 transition hover:from-emerald-800 hover:to-emerald-600 disabled:cursor-wait disabled:opacity-60">
                    {submitting ? 'Validando acceso…' : 'Ingresar al dashboard'}
                  </button>
                </form>
              )}

              {(error || authError) && <p role="alert" className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold leading-5 text-rose-700">{error || authError}</p>}
              {message && <p role="status" className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold leading-5 text-emerald-800">{message}</p>}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
