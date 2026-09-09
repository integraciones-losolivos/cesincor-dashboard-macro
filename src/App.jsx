import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import {
  Banknote,
  ChevronDown,
  HandHeart,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  ShieldCheck,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { useAuth } from './auth/AuthContext.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ModulePlaceholder from './pages/ModulePlaceholder.jsx'

const HomenajesDashboard = lazy(() => import('./pages/HomenajesDashboard.jsx'))
const PrevisionDashboard = lazy(() => import('./pages/PrevisionDashboard.jsx'))
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage.jsx'))

function FullPageLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6">
      <div className="text-center" role="status" aria-live="polite">
        <div className="mx-auto size-11 animate-spin rounded-full border-4 border-emerald-900 border-t-emerald-300" />
        <p className="mt-4 text-sm font-bold text-emerald-100">Validando acceso…</p>
      </div>
    </main>
  )
}

function ModuleLoadingState() {
  return (
    <main className="grid min-h-[calc(100vh-4.5rem)] place-items-center bg-slate-50 px-6">
      <div className="text-center" role="status" aria-live="polite">
        <div className="mx-auto size-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-700" />
        <p className="mt-4 text-sm font-bold text-slate-600">Cargando módulo…</p>
      </div>
    </main>
  )
}

const modules = [
  {
    id: 'prevision',
    name: 'Previsión',
    areaName: 'Previsión Exequial',
    status: 'Activo',
    icon: ShieldCheck,
    description: 'Retiros, contratos retirados, titulares, adicionales, mascotas y afiliaciones exequiales.',
  },
  {
    id: 'homenajes',
    name: 'Homenajes',
    areaName: 'Homenajes',
    status: 'Activo',
    icon: HandHeart,
    description: 'Servicios funerarios, excedentes, sedes, gestores, cementerios y lugares de fallecimiento.',
  },
  {
    id: 'cartera',
    name: 'Cartera',
    areaName: 'Cartera',
    status: 'Preparado',
    icon: Banknote,
    description: 'Recaudo, saldos, vencimientos, cuotas, pagos y seguimiento por cliente o convenio.',
  },
  {
    id: 'facturacion',
    name: 'Facturación',
    areaName: 'Facturación',
    status: 'Preparado',
    icon: ReceiptText,
    description: 'Facturas, notas crédito, anexos, DocKey, TransId, series y validaciones de formatos Crystal.',
  },
]

const adminModule = {
  id: 'usuarios',
  name: 'Usuarios',
  areaName: 'Administración',
  status: 'Activo',
  icon: UsersRound,
  description: 'Administración de cuentas, roles, estados y permisos por módulo.',
}

function AuthenticatedDashboard() {
  const { profile, signOut } = useAuth()
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef(null)
  const availableModules = useMemo(() => {
    return profile.role === 'admin'
      ? modules
      : modules.filter((module) => profile.modules.includes(module.id))
  }, [profile])
  const accessibleModules = useMemo(
    () => profile.role === 'admin' ? [...availableModules, adminModule] : availableModules,
    [availableModules, profile.role],
  )
  const [activeModule, setActiveModule] = useState(() => availableModules[0]?.id || '')
  const [visitedModules, setVisitedModules] = useState(() => new Set(activeModule ? [activeModule] : []))

  useEffect(() => {
    if (!accessibleModules.some((module) => module.id === activeModule)) {
      const firstModule = availableModules[0]?.id || ''
      setActiveModule(firstModule)
      setVisitedModules((current) => firstModule ? new Set(current).add(firstModule) : current)
    }
  }, [accessibleModules, activeModule, availableModules])

  const selectedModule = useMemo(
    () => accessibleModules.find((module) => module.id === activeModule) || availableModules[0],
    [accessibleModules, activeModule, availableModules],
  )
  const isAdmin = profile.role === 'admin'

  useEffect(() => {
    const closeProfileMenu = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) setProfileMenuOpen(false)
    }
    document.addEventListener('pointerdown', closeProfileMenu)
    return () => document.removeEventListener('pointerdown', closeProfileMenu)
  }, [])

  const activateModule = (moduleId) => {
    setActiveModule(moduleId)
    if (moduleId === 'prevision' || moduleId === 'homenajes') {
      setVisitedModules((current) => new Set(current).add(moduleId))
    }
  }

  return (
    <div>
      <nav className="sticky top-0 z-20 border-b border-emerald-100/80 bg-white/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-emerald-950 via-emerald-800 to-lime-600 text-white shadow-lg shadow-emerald-950/20">
                <LayoutDashboard className="size-5" strokeWidth={2.6} />
              </div>
              <div>
                <p className="font-heading text-sm font-bold leading-none tracking-tight text-slate-950">Dashboard Gerencial</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">Macro de reportes web por área</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-1">
            {availableModules.map((module) => {
              const Icon = module.icon
              const isActive = module.id === activeModule

              return (
                <button
                  key={module.id}
                  type="button"
                  onClick={() => activateModule(module.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-black transition ${
                    isActive
                      ? module.id === 'prevision'
                        ? 'bg-gradient-to-r from-orange-700 to-amber-500 text-white shadow-lg shadow-orange-700/20'
                        : module.id === 'homenajes'
                          ? 'bg-gradient-to-r from-emerald-800 to-green-600 text-white shadow-lg shadow-emerald-700/20'
                          : module.id === 'cartera'
                            ? 'bg-gradient-to-r from-blue-700 to-cyan-600 text-white shadow-lg shadow-blue-700/20'
                            : 'bg-gradient-to-r from-violet-700 to-fuchsia-600 text-white shadow-lg shadow-violet-700/20'
                      : 'bg-white text-slate-600 hover:bg-emerald-100 hover:text-emerald-900'
                  }`}
                  aria-pressed={isActive}
                >
                  <Icon className="size-3.5" strokeWidth={2.5} />
                  {module.name}
                </button>
              )
            })}
          </div>

          <div ref={profileMenuRef} className="relative">
            <button type="button" onClick={() => setProfileMenuOpen((current) => !current)} aria-expanded={profileMenuOpen} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition hover:border-emerald-200 hover:shadow-md xl:w-auto">
              <div className={`grid size-9 shrink-0 place-items-center rounded-xl ${isAdmin ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-800'}`}>
                {isAdmin ? <ShieldCheck className="size-4.5" strokeWidth={2.6} /> : <UserRound className="size-4.5" strokeWidth={2.6} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="max-w-44 truncate text-xs font-black text-slate-800">{profile.fullName || 'Usuario'}</p>
                <p className={`max-w-44 truncate text-[11px] font-bold ${isAdmin ? 'text-violet-600' : 'text-slate-400'}`}>{isAdmin ? 'Administrador' : 'Usuario'} · {profile.email}</p>
              </div>
              <ChevronDown className={`size-4 shrink-0 text-slate-400 transition ${profileMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {profileMenuOpen && (
              <div className="absolute right-0 top-[calc(100%+0.6rem)] z-30 w-full min-w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-950/15 xl:w-72">
                {profile.role === 'admin' && <button type="button" onClick={() => { activateModule('usuarios'); setProfileMenuOpen(false) }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-black transition ${activeModule === 'usuarios' ? 'bg-violet-50 text-violet-800' : 'text-slate-700 hover:bg-slate-50'}`}><span className="grid size-9 place-items-center rounded-xl bg-violet-100 text-violet-700"><UsersRound className="size-4" /></span><span>Administrar usuarios</span></button>}
                <div className="my-1 border-t border-slate-100" />
                <button type="button" onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-black text-rose-600 transition hover:bg-rose-50"><span className="grid size-9 place-items-center rounded-xl bg-rose-100 text-rose-600"><LogOut className="size-4" /></span><span>Cerrar sesión</span></button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {availableModules.length === 0 ? (
        <main className="grid min-h-[calc(100vh-4.5rem)] place-items-center bg-slate-50 px-6 text-center">
          <div><ShieldCheck className="mx-auto size-12 text-slate-300" /><h1 className="mt-4 font-heading text-2xl font-bold text-slate-800">Sin módulos asignados</h1><p className="mt-2 text-sm font-semibold text-slate-500">Solicita al administrador que habilite el acceso a un módulo.</p></div>
        </main>
      ) : (
        <Suspense fallback={<ModuleLoadingState />}>
          {visitedModules.has('prevision') && availableModules.some((module) => module.id === 'prevision') && (
            <div hidden={activeModule !== 'prevision'}><PrevisionDashboard areaName="Previsión Exequial" /></div>
          )}
          {visitedModules.has('homenajes') && availableModules.some((module) => module.id === 'homenajes') && (
            <div hidden={activeModule !== 'homenajes'}><HomenajesDashboard areaName="Homenajes" /></div>
          )}
          {activeModule === 'usuarios' && <AdminUsersPage />}
          {activeModule !== 'prevision' && activeModule !== 'homenajes' && activeModule !== 'usuarios' && selectedModule && (
            <ModulePlaceholder module={selectedModule} modules={availableModules} setActiveModule={activateModule} />
          )}
        </Suspense>
      )}
    </div>
  )
}

export default function App() {
  const { session, profile, loading, requiresPasswordUpdate } = useAuth()

  if (loading) return <FullPageLoading />
  if (!session || !profile || requiresPasswordUpdate) return <LoginPage />
  return <AuthenticatedDashboard />
}
