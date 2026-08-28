import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BadgeDollarSign,
  Building2,
  ClipboardList,
  HeartHandshake,
  Medal,
  PawPrint,
  LogOut,
  RefreshCw,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import ChartCard from '../components/ChartCard.jsx'
import ContractImpactList from '../components/prevision/ContractImpactList.jsx'
import CustomTooltip from '../components/CustomTooltip.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ExecutiveBalance from '../components/prevision/ExecutiveBalance.jsx'
import KpiCard from '../components/KpiCard.jsx'
import PrevisionFilters from '../components/prevision/PrevisionFilters.jsx'
import RetirosDashboard from './RetirosDashboard.jsx'
import { fetchPrevisionRows } from '../services/previsionApi.js'
import { checkApiHealth } from '../services/http.js'
import { getUniqueOptions, money, number, percent, shortMoney } from '../utils/dashboard.js'
import {
  buildPrevisionKpis,
  buildPetSummary,
  buildPlanPortfolio,
  buildTypeMix,
  buildValueComponents,
  filterPrevisionRows,
  groupPrevisionBy,
  groupPrevisionByMonth,
  summarizeContracts,
} from '../utils/prevision.js'

const initialFilters = {
  search: '',
  fechaInicial: '',
  fechaFinal: '',
  uen: 'TODOS',
  localidad: 'TODOS',
  asesor: 'TODOS',
  convenio: 'TODOS',
  plan: 'TODOS',
  periodicidad: 'TODOS',
  cobrador: 'TODOS',
  tipoAfiliado: 'TODOS',
  movimiento: 'TODOS',
  estadoContrato: 'TODOS',
}

function getAvailableDateRange(rows) {
  const currentYear = new Date().getFullYear()
  const dates = rows
    .map((row) => row.fecha)
    .filter((value) => {
      const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (!match) return false
      const year = Number(match[1])
      const month = Number(match[2])
      const day = Number(match[3])
      const candidate = new Date(year, month - 1, day)
      return (
        year >= 1900 &&
        year <= currentYear + 1 &&
        candidate.getFullYear() === year &&
        candidate.getMonth() === month - 1 &&
        candidate.getDate() === day
      )
    })
    .sort()
  if (!dates.length) return null

  const latest = dates.at(-1)
  const [year, month] = latest.split('-').map(Number)
  const monthEnd = new Date(year, month, 0)

  return {
    latestMonthStart: `${year}-${String(month).padStart(2, '0')}-01`,
    latestMonthEnd: [
      monthEnd.getFullYear(),
      String(monthEnd.getMonth() + 1).padStart(2, '0'),
      String(monthEnd.getDate()).padStart(2, '0'),
    ].join('-'),
  }
}

const reportViews = [
  { id: 'activos', label: 'Activos', icon: UsersRound },
  { id: 'contratos', label: 'Contratos y planes', icon: ClipboardList },
  { id: 'valores', label: 'Valores', icon: BadgeDollarSign },
  { id: 'mascotas', label: 'Mascotas', icon: PawPrint },
  { id: 'retiros', label: 'Retiros', icon: LogOut },
]

const CONNECTION_CHECK_MS = 2 * 60 * 1000
const RESUME_REFRESH_MS = 4 * 60 * 1000
const DATA_YEAR = new Date().getFullYear()
const INITIAL_DATA_RANGE = { from: `${DATA_YEAR}-01-01`, to: `${DATA_YEAR}-12-31` }

export default function PrevisionDashboard({ areaName = 'Prevision' }) {
  const [filters, setFilters] = useState(initialFilters)
  const [activeView, setActiveView] = useState('activos')
  const [previsionRows, setPrevisionRows] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const hasLoadedData = useRef(false)
  const lastLoadedAt = useRef(0)

  useEffect(() => {
    let isMounted = true
    let requestInProgress = false

    async function loadRows({ background = false } = {}) {
      if (requestInProgress || !navigator.onLine) return
      requestInProgress = true
      try {
        if (!background && !hasLoadedData.current) setIsLoading(true)
        if (!background) setLoadError('')
        const rows = await fetchPrevisionRows(INITIAL_DATA_RANGE)
        if (isMounted) {
          setPrevisionRows(rows)
          if (!hasLoadedData.current) {
            const dateRange = getAvailableDateRange(rows)
            if (dateRange) {
              setFilters((current) => ({
                ...current,
                fechaInicial: dateRange.latestMonthStart,
                fechaFinal: dateRange.latestMonthEnd,
              }))
            }
          }
          hasLoadedData.current = true
          lastLoadedAt.current = Date.now()
          setLoadError('')
        }
      } catch (error) {
        if (isMounted && !hasLoadedData.current) setLoadError(error.message)
      } finally {
        requestInProgress = false
        if (isMounted) setIsLoading(false)
      }
    }

    function refreshAfterResume() {
      const dataIsOld = Date.now() - lastLoadedAt.current >= RESUME_REFRESH_MS
      if (document.visibilityState === 'visible' && navigator.onLine && dataIsOld) loadRows({ background: true })
    }

    function refreshAfterReconnect() {
      if (navigator.onLine) loadRows({ background: true })
    }

    loadRows()
    const connectionTimer = window.setInterval(() => checkApiHealth().catch(() => {}), CONNECTION_CHECK_MS)
    window.addEventListener('online', refreshAfterReconnect)
    document.addEventListener('visibilitychange', refreshAfterResume)

    return () => {
      isMounted = false
      window.clearInterval(connectionTimer)
      window.removeEventListener('online', refreshAfterReconnect)
      document.removeEventListener('visibilitychange', refreshAfterResume)
    }
  }, [loadAttempt])

  const options = useMemo(
    () => ({
      uens: getUniqueOptions(previsionRows, 'uen'),
      localidades: getUniqueOptions(previsionRows, 'localidad'),
      asesores: getUniqueOptions(previsionRows, 'asesor'),
      convenios: getUniqueOptions(previsionRows, 'nombre_convenio'),
      planes: getUniqueOptions(previsionRows, 'plan'),
      periodicidades: getUniqueOptions(previsionRows, 'periodicidad_pago'),
      cobradores: getUniqueOptions(previsionRows, 'cobrador'),
      tiposAfiliado: getUniqueOptions(previsionRows, 'tipo_afiliado'),
      movimientos: getUniqueOptions(previsionRows, 'tipo_movimiento'),
      estadosContrato: getUniqueOptions(previsionRows, 'estado_crystal'),
    }),
    [previsionRows],
  )
  const availableDateRange = useMemo(() => getAvailableDateRange(previsionRows), [previsionRows])

  const filteredRows = useMemo(() => filterPrevisionRows(previsionRows, filters), [previsionRows, filters])
  const kpis = useMemo(() => buildPrevisionKpis(filteredRows), [filteredRows])
  const monthly = useMemo(() => groupPrevisionByMonth(filteredRows), [filteredRows])
  const typeMix = useMemo(() => buildTypeMix(filteredRows), [filteredRows])
  const byLocalidad = useMemo(() => groupPrevisionBy(filteredRows, 'localidad'), [filteredRows])
  const byAdvisor = useMemo(() => groupPrevisionBy(filteredRows, 'asesor').slice(0, 6), [filteredRows])
  const contracts = useMemo(() => summarizeContracts(filteredRows), [filteredRows])
  const affiliationMix = useMemo(() => groupPrevisionBy(filteredRows, 'nombre_convenio').slice(0, 5), [filteredRows])
  const planPortfolio = useMemo(() => buildPlanPortfolio(filteredRows), [filteredRows])
  const valueComponents = useMemo(() => buildValueComponents(filteredRows), [filteredRows])
  const byUen = useMemo(() => groupPrevisionBy(filteredRows, 'uen'), [filteredRows])
  const byPeriodicidad = useMemo(() => groupPrevisionBy(filteredRows, 'periodicidad_pago'), [filteredRows])
  const byCobrador = useMemo(() => groupPrevisionBy(filteredRows, 'cobrador'), [filteredRows])
  const petSummary = useMemo(() => buildPetSummary(filteredRows), [filteredRows])

  return (
    <main className="min-h-screen bg-slate-100">
      <section className="border-b border-slate-200 bg-white px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-900/20">
              <ShieldCheck className="size-7" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-teal-700">Informe corporativo</p>
              <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">{areaName}</h1>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
            Datos en vivo desde SAP HANA
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {isLoading ? (
          <PrevisionLoadingState />
        ) : loadError ? (
          <section className="card-shadow rounded-[2rem] border border-amber-200 bg-white px-6 py-10 text-center sm:px-10">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-amber-200">
              <RefreshCw className="size-6" strokeWidth={2.5} />
            </div>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-amber-700">Servicio temporalmente no disponible</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">No fue posible consultar la información</h2>
            <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-600">{loadError}</p>
            <button
              type="button"
              onClick={() => setLoadAttempt((current) => current + 1)}
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-black text-white transition hover:bg-teal-700"
            >
              <RefreshCw className="size-4" strokeWidth={2.5} />
              Intentar nuevamente
            </button>
          </section>
        ) : (
          <>
            <PrevisionFilters
              filters={filters}
              setFilters={setFilters}
              options={options}
              resultCount={filteredRows.length}
              initialFilters={initialFilters}
              availableDateRange={availableDateRange}
            />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard title="Contratos activos" value={number(kpis.contratosActivos)} helper={`Promedio por contrato: ${money(kpis.valorPromedioContrato)}.`} icon={<ClipboardList className="size-6" strokeWidth={2.4} />} accent="blue" />
              <KpiCard title="Personas activas" value={number(kpis.personasActivas)} helper={`${number(kpis.totalTitulares)} titulares y ${number(kpis.totalBeneficiarios)} beneficiarios.`} icon={<UsersRound className="size-6" strokeWidth={2.4} />} accent="emerald" />
              <KpiCard title="Valor mensual activo" value={money(kpis.ingresoMensual)} helper={`Proyeccion anual: ${money(kpis.ingresoAnualizado)}.`} icon={<BadgeDollarSign className="size-6" strokeWidth={2.4} />} accent="violet" />
              <KpiCard title="Mascotas activas" value={number(kpis.totalMascotas)} helper={`${number(kpis.personasRetiradas)} personas retiradas dentro de contratos activos.`} icon={<PawPrint className="size-6" strokeWidth={2.4} />} accent="orange" />
            </div>

            {!filteredRows.length ? (
            <EmptyState />
          ) : (
            <>
              <ExecutiveBalance kpis={kpis} />
              <ReportTabs activeView={activeView} setActiveView={setActiveView} />
              {activeView === 'activos' && (
                <ActivePortfolioCharts
                  monthly={monthly}
                  typeMix={typeMix}
                  byLocalidad={byLocalidad}
                  byUen={byUen}
                />
              )}
              {activeView === 'contratos' && (
                <ContractsAndAdvisors
                  contracts={contracts}
                  planPortfolio={planPortfolio}
                  affiliationMix={affiliationMix}
                  advisors={byAdvisor}
                />
              )}
              {activeView === 'valores' && (
                <ValueAndOperationsCharts
                  valueComponents={valueComponents}
                  byPeriodicidad={byPeriodicidad}
                  byCobrador={byCobrador}
                  byUen={byUen}
                />
              )}
              {activeView === 'mascotas' && <PetsDashboard petSummary={petSummary} />}
              {activeView === 'retiros' && <RetirosDashboard embedded />}
            </>
            )}
          </>
        )}
      </section>
    </main>
  )
}

function PrevisionLoadingState() {
  const messages = [
    'Conectando con SAP HANA…',
    'Cargando información…',
    'Cargando contratos…',
    'Organizando indicadores…',
    'Preparando los gráficos…',
  ]
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % messages.length)
    }, 1600)

    return () => window.clearInterval(timer)
  }, [])

  return (
    <section
      className="card-shadow relative isolate overflow-hidden rounded-[2rem] border border-slate-200 bg-white px-6 py-12 sm:py-14"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-100/70 blur-3xl" />

      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <div className="relative grid size-28 place-items-center">
          <div className="absolute inset-0 rounded-full border-[7px] border-slate-100" />
          <div className="absolute inset-0 animate-spin rounded-full border-[7px] border-transparent border-r-sky-400 border-t-teal-600" />
          <div className="absolute inset-3 animate-pulse rounded-full bg-slate-950 shadow-xl shadow-teal-900/20" />
          <ShieldCheck className="relative size-10 text-teal-300" strokeWidth={2.4} />
          <span className="absolute -right-1 top-3 size-4 animate-ping rounded-full bg-teal-400/50" />
          <span className="absolute -right-1 top-3 size-4 rounded-full border-4 border-white bg-teal-500" />
        </div>

        <p className="mt-7 text-xs font-black uppercase tracking-[0.24em] text-teal-700">Previsión Exequial</p>
        <h2 key={messageIndex} className="mt-2 animate-pulse text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
          {messages[messageIndex]}
        </h2>
        <p className="mt-3 max-w-md text-base font-semibold leading-7 text-slate-600">
          Estamos consultando y organizando los datos. Esto puede tardar unos segundos.
        </p>

        <div className="mt-6 flex items-center gap-2" aria-hidden="true">
          {messages.map((message, index) => (
            <span
              key={message}
              className={`h-2.5 rounded-full transition-all duration-500 ${
                index === messageIndex ? 'w-8 bg-teal-600' : 'w-2.5 bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function ReportTabs({ activeView, setActiveView }) {
  return (
    <nav className="card-shadow grid gap-2 rounded-2xl border border-slate-200 bg-white p-2 sm:grid-cols-2 xl:grid-cols-5">
      {reportViews.map((view) => {
        const Icon = view.icon
        const isActive = activeView === view.id
        return (
          <button
            key={view.id}
            type="button"
            onClick={() => setActiveView(view.id)}
            className={`flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-black transition ${
              isActive ? 'bg-slate-950 text-white shadow-lg shadow-slate-900/15' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
            }`}
          >
            <Icon className="size-4" strokeWidth={2.5} />
            {view.label}
          </button>
        )
      })}
    </nav>
  )
}

function ActivePortfolioCharts({ monthly, typeMix, byLocalidad, byUen }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <ChartCard title="Ingreso por fecha de vinculacion" subtitle="Evolucion del valor mensual asociado a personas activas segun fecha de ingreso." accent="emerald">
        <div className="h-[21rem]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthly} margin={{ top: 10, right: 14, left: 4, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={shortMoney} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="ingreso_mensual" name="Valor mensual" radius={[10, 10, 0, 0]} barSize={24} fill="#0f766e" />
              <Line type="monotone" dataKey="contratos" name="Contratos" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Composicion de afiliados" subtitle="Titulares, adicionales, beneficiarios y mascotas consolidados." accent="orange">
        <div className="h-[18rem]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={typeMix} layout="vertical" margin={{ top: 6, right: 16, left: 10, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 11, fill: '#334155', fontWeight: 800 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total_personas" name="Personas" radius={[0, 10, 10, 0]} barSize={18} fill="#2563eb" />
              <Bar dataKey="ingreso_mensual" name="Valor mensual" radius={[0, 10, 10, 0]} barSize={18} fill="#0f766e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 grid gap-2">
          {typeMix.map((item) => (
            <div key={item.name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
              <span className="text-sm font-black text-slate-700">{item.name}</span>
              <span className="text-sm font-black text-slate-950">{number(item.total_personas)} personas</span>
            </div>
          ))}
        </div>
      </ChartCard>

      <ChartCard title="Cartera por localidad" subtitle="Contratos, personas y valor mensual para comparar sedes sin listado operativo." accent="violet">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byLocalidad.slice(0, 6)} layout="vertical" margin={{ top: 10, right: 24, left: 28, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 13, fill: '#475569', fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 13, fill: '#1e293b', fontWeight: 800 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="contratos" name="Contratos" radius={[0, 10, 10, 0]} barSize={18} fill="#2563eb" />
              <Bar dataKey="total_personas" name="Personas" radius={[0, 10, 10, 0]} barSize={18} fill="#0f766e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Empresas vs independientes" subtitle="Participacion de la cartera activa por UEN." accent="slate">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={byUen} margin={{ top: 8, right: 14, left: 4, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 800 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="money" tickFormatter={shortMoney} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="count" orientation="right" tick={{ fontSize: 11, fill: '#2563eb' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar yAxisId="money" dataKey="ingreso_mensual" name="Valor mensual" radius={[10, 10, 0, 0]} fill="#0f766e" />
              <Line yAxisId="count" type="monotone" dataKey="contratos" name="Contratos" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  )
}

function ContractsAndAdvisors({ contracts, planPortfolio, affiliationMix, advisors }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <ChartCard title="Contratos por plan" subtitle="Top de planes por volumen de contratos activos y personas asociadas." accent="blue">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={planPortfolio.slice(0, 6)} layout="vertical" margin={{ top: 10, right: 20, left: 34, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 13, fill: '#475569', fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={125} tick={{ fontSize: 13, fill: '#1e293b', fontWeight: 800 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total_titulares" name="Titulares" radius={[0, 8, 8, 0]} fill="#0f766e" />
              <Bar dataKey="total_beneficiarios" name="Beneficiarios" radius={[0, 8, 8, 0]} fill="#2563eb" />
              <Bar dataKey="total_mascotas" name="Mascotas" radius={[0, 8, 8, 0]} fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <TopAdvisors advisors={advisors} />

      <ChartCard title="Convenios con mayor cartera" subtitle="Contratos activos e ingreso mensual consolidado por convenio." accent="emerald">
        <div className="space-y-3">
          {affiliationMix.map((item, index) => {
            const maxIncome = Math.max(...affiliationMix.map((row) => row.ingreso_mensual), 1)
            const width = Math.max(6, (item.ingreso_mensual / maxIncome) * 100)
            return (
              <article key={item.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                      {index % 2 === 0 ? <HeartHandshake className="size-5" /> : <Building2 className="size-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-950">{item.name}</p>
                      <p className="text-xs font-semibold text-slate-500">{number(item.contratos)} contratos - {number(item.total_personas)} personas</p>
                    </div>
                  </div>
                  <p className="shrink-0 text-sm font-black text-teal-700">{money(item.ingreso_mensual)}</p>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
                  <div className="h-full rounded-full bg-teal-600" style={{ width: `${width}%` }} />
                </div>
              </article>
            )
          })}
        </div>
      </ChartCard>

      <ChartCard title="Contratos con mayor valor" subtitle="Ranking ejecutivo por valor mensual activo; no lista personas." accent="slate">
        <ContractImpactList contracts={contracts.sort((a, b) => b.ingreso_mensual - a.ingreso_mensual).slice(0, 8)} />
      </ChartCard>
    </div>
  )
}

function ValueAndOperationsCharts({ valueComponents, byPeriodicidad, byCobrador, byUen }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <ChartCard title="Composicion del valor mensual" subtitle="Plan base, adicionales, seguros, mascotas y otros componentes activos." accent="orange">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={valueComponents} layout="vertical" margin={{ top: 8, right: 16, left: 26, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" horizontal={false} />
              <XAxis type="number" tickFormatter={shortMoney} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={112} tick={{ fontSize: 11, fill: '#334155', fontWeight: 800 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="valor" name="Valor" radius={[0, 12, 12, 0]} barSize={24} fill="#6d28d9" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Valor por UEN" subtitle="Peso financiero de empresas e independientes dentro de la cartera activa." accent="emerald">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byUen} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 800 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={shortMoney} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="ingreso_mensual" name="Valor mensual" radius={[12, 12, 0, 0]} fill="#0f766e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Periodicidad y cobrador" subtitle="Cruce operacional de forma de pago y medio de recaudo." accent="slate" className="xl:col-span-2">
        <div className="grid gap-4 md:grid-cols-2">
          <MiniRanking title="Periodicidad" rows={byPeriodicidad} valueKey="contratos" />
          <MiniRanking title="Cobrador" rows={byCobrador} valueKey="contratos" />
        </div>
      </ChartCard>
    </div>
  )
}

function PetsDashboard({ petSummary }) {
  return (
    <ChartCard title="Informe de mascotas" subtitle="Mascotas por tipo, valor mensual y estado dentro de contratos activos." accent="orange">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={petSummary} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 800 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total_mascotas" name="Total mascotas" radius={[12, 12, 0, 0]} fill="#f59e0b" />
              <Bar dataKey="ingreso_mensual" name="Valor mensual" radius={[12, 12, 0, 0]} fill="#0f766e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid content-center gap-3">
          {petSummary.map((item) => (
            <div key={item.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-950">{item.name}</p>
                  <p className="text-xs font-semibold text-slate-500">{number(item.total_mascotas)} mascotas reportadas</p>
                </div>
                <p className="text-sm font-black text-amber-700">{money(item.valor_mascota)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  )
}

function CrystalReportCharts({ planPortfolio, valueComponents, byUen, byPeriodicidad, byCobrador, petSummary }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <ChartCard title="Relación de planes" subtitle="Titulares, beneficiarios y mascotas por plan, según la lógica de los reportes de planes." accent="blue">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={planPortfolio} margin={{ top: 10, right: 16, left: 4, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 800 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total_titulares" name="Titulares" radius={[10, 10, 0, 0]} fill="#0f766e" />
              <Bar dataKey="total_beneficiarios" name="Beneficiarios" radius={[10, 10, 0, 0]} fill="#2563eb" />
              <Bar dataKey="total_mascotas" name="Mascotas" radius={[10, 10, 0, 0]} fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Composición del valor mensual" subtitle="Plan base, adicionales, asistencias, seguros, mascotas y club de beneficios." accent="orange">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={valueComponents} layout="vertical" margin={{ top: 8, right: 16, left: 26, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" horizontal={false} />
              <XAxis type="number" tickFormatter={shortMoney} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={112} tick={{ fontSize: 11, fill: '#334155', fontWeight: 800 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="valor" name="Valor" radius={[0, 12, 12, 0]} barSize={24} fill="#6d28d9" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Empresas vs independientes" subtitle="Lectura por UEN y tipo de persona de los reportes de relación." accent="slate">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={byUen} margin={{ top: 8, right: 14, left: 4, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 800 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="money" tickFormatter={shortMoney} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="count" orientation="right" tick={{ fontSize: 11, fill: '#2563eb' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar yAxisId="money" dataKey="ingreso_mensual" name="Ingreso mensual" radius={[10, 10, 0, 0]} fill="#0f766e" />
              <Bar yAxisId="money" dataKey="perdida_mensual" name="Perdida mensual" radius={[10, 10, 0, 0]} fill="#be123c" />
              <Line yAxisId="count" type="monotone" dataKey="contratos" name="Contratos" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Periodicidad y cobrador" subtitle="Cruce operacional de periodicidad de pago y medio de recaudo/cobrador." accent="emerald">
        <div className="grid gap-4 md:grid-cols-2">
          <MiniRanking title="Periodicidad" rows={byPeriodicidad} valueKey="contratos" />
          <MiniRanking title="Cobrador" rows={byCobrador} valueKey="contratos" />
        </div>
      </ChartCard>

      <ChartCard title="Informe de mascotas" subtitle="Mascotas reportadas por tipo, valor mensual y movimientos asociados." accent="orange" className="xl:col-span-2">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={petSummary} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 800 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total_mascotas" name="Total mascotas" radius={[12, 12, 0, 0]} fill="#f59e0b" />
                <Bar dataKey="afiliaciones" name="Afiliaciones" radius={[12, 12, 0, 0]} fill="#0f766e" />
                <Bar dataKey="retiros" name="Retiros" radius={[12, 12, 0, 0]} fill="#be123c" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid content-center gap-3">
            {petSummary.map((item) => (
              <div key={item.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-950">{item.name}</p>
                    <p className="text-xs font-semibold text-slate-500">{number(item.total_mascotas)} mascotas reportadas</p>
                  </div>
                  <p className="text-sm font-black text-amber-700">{money(item.valor_mascota)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ChartCard>
    </div>
  )
}

function MiniRanking({ title, rows, valueKey }) {
  const maxValue = Math.max(...rows.map((row) => Number(row[valueKey] || 0)), 1)

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <div className="mt-4 space-y-3">
        {rows.map((row) => {
          const value = Number(row[valueKey] || 0)
          const width = Math.max(6, (value / maxValue) * 100)
          return (
            <div key={row.name}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-slate-700">{row.name}</p>
                <p className="text-sm font-black text-slate-950">{number(value)}</p>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
                <div className="h-full rounded-full bg-teal-600" style={{ width: `${width}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MovementCharts({ monthly, typeMix }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <ChartCard title="Pulso financiero mensual" subtitle="Ingreso nuevo, perdida por retiros y balance neto del periodo." accent="emerald">
        <div className="h-[21rem]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthly} margin={{ top: 10, right: 14, left: 4, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={shortMoney} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="ingreso_mensual" name="Ingreso mensual" radius={[10, 10, 0, 0]} barSize={24} fill="#0f766e" />
              <Bar dataKey="perdida_mensual" name="Perdida mensual" radius={[10, 10, 0, 0]} barSize={24} fill="#be123c" />
              <Line type="monotone" dataKey="balance" name="Balance" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Retiros por tipo de afiliado" subtitle="Comparativo directo entre retiros, afiliaciones y perdida mensual." accent="orange">
        <div className="h-[18rem]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={typeMix} layout="vertical" margin={{ top: 6, right: 16, left: 10, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 11, fill: '#334155', fontWeight: 800 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="retiros" name="Retiros" radius={[0, 10, 10, 0]} barSize={18} fill="#be123c" />
              <Bar dataKey="afiliaciones" name="Afiliaciones" radius={[0, 10, 10, 0]} barSize={18} fill="#0f766e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 grid gap-2">
          {typeMix.map((item) => (
            <div key={item.name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
              <span className="text-sm font-black text-slate-700">{item.name}</span>
              <span className="text-sm font-black text-slate-950">{money(item.perdida_mensual)} - {percent(item.share)}</span>
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  )
}

function ImpactCharts({ byLocalidad, contracts, advisors }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <ChartCard title="Impacto por localidad" subtitle="Barras horizontales para comparar ingreso nuevo y fuga mensual." accent="violet">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byLocalidad} layout="vertical" margin={{ top: 10, right: 16, left: 18, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" horizontal={false} />
              <XAxis type="number" tickFormatter={shortMoney} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 11, fill: '#334155', fontWeight: 800 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="ingreso_mensual" name="Ingreso mensual" radius={[0, 10, 10, 0]} barSize={18} fill="#0f766e" />
              <Bar dataKey="perdida_mensual" name="Perdida mensual" radius={[0, 10, 10, 0]} barSize={18} fill="#be123c" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <div className="grid gap-6">
        <TopAdvisors advisors={advisors} />

        <ChartCard title="Contratos con mayor fuga" subtitle="Ranking por perdida mensual generada por retiros." accent="rose">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={contracts.filter((item) => item.perdida_mensual > 0).slice(0, 6)} layout="vertical" margin={{ top: 8, right: 18, left: 8, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" horizontal={false} />
                <XAxis type="number" tickFormatter={shortMoney} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="contrato" width={76} tick={{ fontSize: 11, fill: '#334155', fontWeight: 800 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="perdida_mensual" name="Perdida mensual" radius={[0, 12, 12, 0]} barSize={22} fill="#be123c" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  )
}

function TopAdvisors({ advisors }) {
  const maxIncome = Math.max(...advisors.map((item) => item.ingreso_mensual), 1)

  return (
    <ChartCard title="Top asesoras" subtitle="Cartera activa asignada por contratos, personas y valor mensual." accent="emerald">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={advisors} layout="vertical" margin={{ top: 8, right: 16, left: 38, bottom: 0 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={132} tick={{ fontSize: 10, fill: '#334155', fontWeight: 800 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="contratos" name="Contratos" radius={[0, 10, 10, 0]} barSize={16} fill="#2563eb" />
            <Bar dataKey="total_personas" name="Personas" radius={[0, 10, 10, 0]} barSize={16} fill="#0f766e" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 grid gap-2">
        {advisors.map((item, index) => {
          const width = Math.max(7, (item.ingreso_mensual / maxIncome) * 100)
          return (
            <article key={item.name} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                    <Medal className="size-5" strokeWidth={2.4} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">{index + 1}. {item.name}</p>
                    <p className="text-xs font-semibold text-slate-500">
                      {number(item.contratos)} contratos - {number(item.total_personas)} personas
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-black text-teal-700">{money(item.ingreso_mensual)}</p>
                  <p className="text-xs font-semibold text-slate-500">mensual</p>
                </div>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
                <div className="h-full rounded-full bg-teal-600" style={{ width: `${width}%` }} />
              </div>
            </article>
          )
        })}
      </div>
    </ChartCard>
  )
}

function ExecutiveDetails({ contracts, affiliationMix }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
      <ChartCard title="Contratos retirados y retiros asociados" subtitle="Resumen ejecutivo por contrato, sin listar usuarios ni beneficiarios." accent="slate">
        <ContractImpactList contracts={contracts} />
      </ChartCard>

      <ChartCard title="Afiliaciones realizadas" subtitle="Ingreso mensual nuevo por convenio y volumen de afiliaciones." accent="emerald">
        <div className="space-y-3">
          {affiliationMix.map((item, index) => {
            const maxIncome = Math.max(...affiliationMix.map((row) => row.ingreso_mensual), 1)
            const width = Math.max(6, (item.ingreso_mensual / maxIncome) * 100)
            return (
              <article key={item.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                      {index % 2 === 0 ? <HeartHandshake className="size-5" /> : <BadgeDollarSign className="size-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-950">{item.name}</p>
                      <p className="text-xs font-semibold text-slate-500">{number(item.afiliaciones)} afiliaciones - {number(item.contratos)} contratos</p>
                    </div>
                  </div>
                  <p className="text-sm font-black text-teal-700">{money(item.ingreso_mensual)}</p>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
                  <div className="h-full rounded-full bg-teal-600" style={{ width: `${width}%` }} />
                </div>
              </article>
            )
          })}
        </div>
      </ChartCard>
    </div>
  )
}
