import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Check,
  KeyRound,
  LoaderCircle,
  MailPlus,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  UserRound,
  UserX,
  X,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'
import { ACCESS_MODULES } from '../config/accessModules.js'
import { fetchWithRetry } from '../services/http.js'

const EMPTY_FORM = {
  fullName: '',
  email: '',
  role: 'user',
  isActive: true,
  modules: ['prevision'],
}

async function readPayload(response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.message || 'No fue posible completar la operación.')
  return payload
}

function UserForm({ user, submitting, onCancel, onSubmit }) {
  const [form, setForm] = useState(user ? {
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    modules: user.modules,
  } : EMPTY_FORM)

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  const toggleModule = (moduleId) => {
    setForm((current) => ({
      ...current,
      modules: current.modules.includes(moduleId)
        ? current.modules.filter((item) => item !== moduleId)
        : [...current.modules, moduleId],
    }))
  }

  const handleRole = (role) => {
    setForm((current) => ({
      ...current,
      role,
      modules: role === 'admin' ? ACCESS_MODULES.map((module) => module.id) : current.modules,
    }))
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(form)
      }}
      className="space-y-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-bold text-slate-700">
          Nombre de la persona
          <input
            value={form.fullName}
            onChange={(event) => setField('fullName', event.target.value)}
            placeholder="Nombre completo"
            required
            className="w-full rounded-xl border border-slate-200 px-3.5 py-3 font-semibold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />
        </label>
        <label className="space-y-2 text-sm font-bold text-slate-700">
          Correo
          <input
            type="email"
            value={form.email}
            onChange={(event) => setField('email', event.target.value)}
            placeholder="persona@empresa.com"
            required
            disabled={Boolean(user)}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-3 font-semibold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-100 disabled:text-slate-500"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-bold text-slate-700">
          Rol
          <select value={form.role} onChange={(event) => handleRole(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 font-semibold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100">
            <option value="user">Usuario</option>
            <option value="admin">Administrador</option>
          </select>
        </label>
        <label className="flex items-end">
          <span className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
            <span>
              <span className="block text-sm font-bold text-slate-700">Usuario habilitado</span>
              <span className="block text-xs font-semibold text-slate-400">Puede iniciar sesión y consultar módulos</span>
            </span>
            <input type="checkbox" checked={form.isActive} onChange={(event) => setField('isActive', event.target.checked)} className="size-5 accent-emerald-700" />
          </span>
        </label>
      </div>

      <fieldset>
        <legend className="mb-3 text-sm font-bold text-slate-700">Módulos permitidos</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {ACCESS_MODULES.map((module) => {
            const checked = form.role === 'admin' || form.modules.includes(module.id)
            return (
              <label key={module.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${checked ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-500'}`}>
                <input type="checkbox" checked={checked} disabled={form.role === 'admin'} onChange={() => toggleModule(module.id)} className="size-4 accent-emerald-700" />
                <span className="text-sm font-bold">{module.name}</span>
              </label>
            )
          })}
        </div>
        {form.role === 'admin' && <p className="mt-2 text-xs font-semibold text-slate-400">Los administradores tienen acceso a todos los módulos.</p>}
      </fieldset>

      {!user && (
        <div className="flex gap-3 rounded-xl bg-blue-50 p-4 text-sm font-semibold leading-6 text-blue-800">
          <MailPlus className="mt-0.5 size-5 shrink-0" />
          La persona recibirá un enlace único en este correo. Desde allí creará su contraseña personal y entrará al dashboard.
        </div>
      )}

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
        <button type="button" onClick={onCancel} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100">Cancelar</button>
        <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-2.5 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-60">
          {submitting ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
          {user ? 'Guardar cambios' : 'Crear e invitar'}
        </button>
      </div>
    </form>
  )
}

export default function AdminUsersPage() {
  const { profile: currentProfile } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const payload = await readPayload(await fetchWithRetry('/api/admin/users', { attempts: 1 }))
      setUsers(payload.users || [])
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const counts = useMemo(() => ({
    total: users.length,
    active: users.filter((user) => user.isActive).length,
    admins: users.filter((user) => user.role === 'admin').length,
  }), [users])

  const saveUser = async (form) => {
    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      const editing = Boolean(editingUser)
      const url = editing ? `/api/admin/users/${editingUser.id}` : '/api/admin/users'
      await readPayload(await fetchWithRetry(url, {
        attempts: 1,
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      }))
      setMessage(editing ? 'Usuario actualizado correctamente.' : `Usuario creado. Enviamos a ${form.email} el enlace para activar su cuenta.`)
      setEditingUser(null)
      setShowCreate(false)
      await loadUsers()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSubmitting(false)
    }
  }

  const sendPasswordReset = async (user) => {
    if (!window.confirm(`¿Enviar un correo para restablecer la contraseña de ${user.email}?`)) return
    setError('')
    setMessage('')
    try {
      const payload = await readPayload(await fetchWithRetry(`/api/admin/users/${user.id}/reset-password`, {
        attempts: 1,
        method: 'POST',
      }))
      setMessage(payload.message)
    } catch (resetError) {
      setError(resetError.message)
    }
  }

  return (
    <main className="min-h-[calc(100vh-4.5rem)] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Administración</p>
            <h1 className="mt-2 font-heading text-3xl font-bold text-slate-950">Usuarios y permisos</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">Crea cuentas, controla su estado y define qué módulos puede consultar cada persona.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadUsers} className="grid size-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:border-emerald-200 hover:text-emerald-800" aria-label="Actualizar usuarios">
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => { setEditingUser(null); setShowCreate(true); setError(''); setMessage('') }} className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-900/15 hover:bg-emerald-700">
              <Plus className="size-4" /> Nuevo usuario
            </button>
          </div>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Usuarios', value: counts.total, icon: UserRound },
            { label: 'Habilitados', value: counts.active, icon: UserCheck },
            { label: 'Administradores', value: counts.admins, icon: ShieldCheck },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><Icon className="size-5" /></div>
              <div><p className="text-2xl font-black text-slate-950">{value}</p><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p></div>
            </div>
          ))}
        </div>

        {(showCreate || editingUser) && (
          <section className="mt-7 rounded-3xl border border-emerald-100 bg-white p-6 shadow-xl shadow-slate-950/5 sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-heading text-xl font-bold text-slate-950">{editingUser ? 'Editar usuario' : 'Crear usuario'}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">{editingUser ? 'Actualiza el rol, estado o acceso a módulos.' : 'Registra los datos y envía una invitación segura.'}</p>
              </div>
              <button onClick={() => { setShowCreate(false); setEditingUser(null) }} className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="size-4" /></button>
            </div>
            <UserForm key={editingUser?.id || 'new'} user={editingUser} submitting={submitting} onCancel={() => { setShowCreate(false); setEditingUser(null) }} onSubmit={saveUser} />
          </section>
        )}

        {error && <p role="alert" className="mt-6 rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700">{error}</p>}
        {message && <p role="status" className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-800">{message}</p>}

        <section className="mt-7 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          {loading ? (
            <div className="grid min-h-72 place-items-center"><div className="text-center"><LoaderCircle className="mx-auto size-7 animate-spin text-emerald-700" /><p className="mt-3 text-sm font-bold text-slate-500">Cargando usuarios…</p></div></div>
          ) : users.length === 0 ? (
            <div className="grid min-h-72 place-items-center p-8 text-center"><UserX className="size-10 text-slate-300" /><p className="mt-3 font-bold text-slate-600">No hay usuarios registrados.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-400">
                  <tr><th className="px-6 py-4">Persona</th><th className="px-6 py-4">Rol</th><th className="px-6 py-4">Estado</th><th className="px-6 py-4">Módulos</th><th className="px-6 py-4 text-right">Acciones</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr key={user.id} className="transition hover:bg-slate-50/70">
                      <td className="px-6 py-5"><p className="font-bold text-slate-900">{user.fullName || 'Sin nombre'}</p><p className="mt-1 text-xs font-semibold text-slate-400">{user.email}</p></td>
                      <td className="px-6 py-5"><span className={`rounded-full px-3 py-1 text-xs font-black ${user.role === 'admin' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>{user.role === 'admin' ? 'Administrador' : 'Usuario'}</span></td>
                      <td className="px-6 py-5"><span className={`inline-flex items-center gap-2 text-xs font-black ${user.isActive ? 'text-emerald-700' : 'text-rose-600'}`}><span className={`size-2 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />{user.isActive ? 'Habilitado' : 'Deshabilitado'}</span></td>
                      <td className="px-6 py-5"><div className="flex max-w-sm flex-wrap gap-1.5">{(user.role === 'admin' ? ACCESS_MODULES.map((module) => module.id) : user.modules).map((moduleId) => <span key={moduleId} className="rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-800">{ACCESS_MODULES.find((module) => module.id === moduleId)?.name || moduleId}</span>)}</div></td>
                      <td className="px-6 py-5"><div className="flex justify-end gap-2"><button onClick={() => sendPasswordReset(user)} className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700" aria-label={`Restablecer contraseña de ${user.fullName}`}><KeyRound className="size-4" /></button><button onClick={() => { setShowCreate(false); setEditingUser(user); setError(''); setMessage(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"><Pencil className="size-3.5" /> Editar</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="mt-4 text-xs font-semibold text-slate-400">Tu cuenta actual: {currentProfile.email}</p>
      </div>
    </main>
  )
}
