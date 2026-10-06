import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  BadgeDollarSign,
  CalendarDays,
  CircleAlert,
  ClipboardList,
  ClipboardX,
  Clock3,
  ContactRound,
  GitBranch,
  Layers,
  LayoutDashboard,
  LogOut,
  MapPinned,
  SlidersHorizontal,
  PawPrint,
  RefreshCw,
  Repeat2,
  TrendingDown,
  UserMinus,
  Users,
} from 'lucide-react'
import ChartCard from '../components/ChartCard.jsx'
import CustomTooltip from '../components/CustomTooltip.jsx'
import EmptyState from '../components/EmptyState.jsx'
import KpiCard from '../components/KpiCard.jsx'
import RetirosEvolution from '../components/prevision/RetirosEvolution.jsx'
import RetirosCauses from '../components/prevision/RetirosCauses.jsx'
import RetirosChannels from '../components/prevision/RetirosChannels.jsx'
import RetirosAdvisors from '../components/prevision/RetirosAdvisors.jsx'
import RetirosPlans from '../components/prevision/RetirosPlans.jsx'
import RetirosTerritories from '../components/prevision/RetirosTerritories.jsx'
import RetirosValue from '../components/prevision/RetirosValue.jsx'
import RetirosPermanence from '../components/prevision/RetirosPermanence.jsx'
import RetirosPets from '../components/prevision/RetirosPets.jsx'
import RetirosQuality from '../components/prevision/RetirosQuality.jsx'
import RetirosDetail from '../components/prevision/RetirosDetail.jsx'
import ReclasificacionDashboard from '../components/prevision/ReclasificacionDashboard.jsx'
import PrevisionSubnav from '../components/prevision/PrevisionSubnav.jsx'
import { RankingList, Sparkline } from '../components/prevision/ExecutiveViz.jsx'
import ExportRetirosButton from '../components/prevision/ExportRetirosButton.jsx'
import { fetchRetiros } from '../services/retirosApi.js'
import { getUniqueOptions, monthLabel, number, percent } from '../utils/dashboard.js'
import { buildRetirosComposition, buildRetirosKpis, buildRetirosTimeline, filterRetiros, formatVigencia, groupRetiros, groupRetirosBySede, initialRetirosFilters } from '../utils/retiros.js'

const colors = ['#be123c', '#ea580c', '#2563eb', '#0f766e', '#7c3aed', '#ca8a04']
const DATA_YEAR = new Date().getFullYear()
const defaultFilters = { ...initialRetirosFilters }
const retiroViews = [
  { id: 'resumen', label: 'Resumen general', icon: LayoutDashboard },
  { id: 'evolucion', label: 'Evolución de retiros', icon: TrendingDown },
  { id: 'causales', label: 'Causales de retiro', icon: CircleAlert },
  { id: 'canales', label: 'Retiros por canal', icon: GitBranch },
  { id: 'asesores', label: 'Retiros por asesor', icon: Users },
  { id: 'planes', label: 'Retiros por plan', icon: Layers },
  { id: 'territorios', label: 'Retiros por territorio', icon: MapPinned },
  { id: 'valor', label: 'Valor asociado', icon: BadgeDollarSign },
  { id: 'permanencia', label: 'Permanencia de adicionales', icon: Clock3 },
  { id: 'mascotas', label: 'Retiros de mascotas', icon: PawPrint },
  { id: 'calidad', label: 'Calidad y contactabilidad', icon: ContactRound },
  { id: 'detalle', label: 'Detalle de retiros', icon: ClipboardList },
  { id: 'reclasificacion', label: 'Reclasificación', icon: Repeat2 },
]
const contextualFilterKeys = ['search', 'canal', 'municipio', 'entidad', 'plan', 'asesor', 'tipoRetiro', 'causal', 'estadoContrato']
const viewFilterKeys = {
  resumen: ['search', 'entidad', 'tipoRetiro', 'causal', 'estadoContrato'], evolucion: ['tipoRetiro', 'causal'], causales: ['causal', 'tipoRetiro', 'entidad'],
  canales: ['canal', 'entidad', 'tipoRetiro'], asesores: ['asesor', 'entidad', 'canal'], planes: ['plan', 'entidad', 'tipoRetiro'],
  territorios: ['municipio', 'entidad'], valor: ['entidad', 'plan', 'tipoRetiro', 'causal'], permanencia: ['plan', 'entidad'],
  mascotas: ['plan', 'entidad', 'causal'], calidad: ['canal', 'asesor', 'entidad'], detalle: ['search', 'canal', 'municipio', 'entidad', 'plan', 'asesor', 'tipoRetiro', 'causal', 'estadoContrato'],
}
const yearRange = (year) => ({ from: `${year}-01-01`, to: `${year}-12-31` })
function mergeRows(current, incoming) { const map = new Map(current.map((row) => [row.id, row])); incoming.forEach((row) => map.set(row.id, row)); return [...map.values()] }
function trendGranularity(from, to) {
  if (!from || !to) return 'monthly'
  const days = Math.round((new Date(`${to}T12:00:00`) - new Date(`${from}T12:00:00`)) / 86400000)
  return days <= 45 ? 'daily' : days <= 180 ? 'weekly' : 'monthly'
}
function trendLabel(key, granularity) {
  if (granularity === 'monthly') return monthLabel(`${key}-01`)
  return new Date(`${key}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

export default function RetirosDashboard({ areaName = 'Retiros', embedded = false, active = true }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState(defaultFilters)
  const [activeView, setActiveView] = useState('resumen')
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyReady, setHistoryReady] = useState(false)
  const [navCollapsed, setNavCollapsed] = useState(false)
  const activeRequests = useRef(new Map())
  const currentYearReady = useRef(false)

  const loadCurrentYear = useCallback(async (refresh = false) => {
    const key = `current:${refresh}`
    if (activeRequests.current.has(key)) return activeRequests.current.get(key)
    const request = fetchRetiros({ ...yearRange(DATA_YEAR), refresh: refresh ? 'full' : '' })
      .then((incoming) => { setRows((current) => mergeRows(current, incoming)); currentYearReady.current = true; setError(''); return incoming })
      .finally(() => activeRequests.current.delete(key))
    activeRequests.current.set(key, request)
    return request
  }, [])

  const loadHistory = useCallback(async (refresh = false) => {
    if (historyReady && !refresh) return
    const key = `history:${refresh}`
    if (activeRequests.current.has(key)) return activeRequests.current.get(key)
    setLoadingHistory(true)
    const request = fetchRetiros({ refresh: refresh ? 'full' : '' }).then((incoming) => {
      setRows((current) => refresh ? incoming : mergeRows(incoming.filter((row) => !row.fecha?.startsWith(`${DATA_YEAR}-`)), current.filter((row) => row.fecha?.startsWith(`${DATA_YEAR}-`))))
      setHistoryReady(true); setError(''); return incoming
    }).finally(() => { activeRequests.current.delete(key); setLoadingHistory(false) })
    activeRequests.current.set(key, request)
    return request
  }, [historyReady])

  useEffect(() => {
    if (!active) return undefined
    let cancelled = false
    ;(async () => {
      try { if (!currentYearReady.current) await loadCurrentYear(); if (!cancelled) loadHistory().catch((e) => { if (!cancelled) setError(`No fue posible preparar todo el historial. ${e.message}`) }) }
      catch (e) { if (!cancelled) setError(e.message) }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [active, loadCurrentYear, loadHistory])

  const filtered = useMemo(() => filterRetiros(rows, filters), [rows, filters])
  const kpis = useMemo(() => buildRetirosKpis(filtered), [filtered])
  const composition = useMemo(() => buildRetirosComposition(filtered), [filtered])
  const bySede = useMemo(() => groupRetirosBySede(filtered), [filtered])
  const byPlan = useMemo(() => groupRetiros(filtered, 'plan', { limit: 8 }), [filtered])
  const byAdvisor = useMemo(() => groupRetiros(filtered, 'asesor', { limit: 8 }), [filtered])
  const mainTrendGranularity = trendGranularity(filters.fechaInicial, filters.fechaFinal)
  const mainTrend = useMemo(() => buildRetirosTimeline(filtered, mainTrendGranularity, { from: filters.fechaInicial, to: filters.fechaFinal }), [filtered, filters.fechaFinal, filters.fechaInicial, mainTrendGranularity])
  const petTrend = useMemo(() => {
    const grouped = new Map()
    filtered.filter((row) => row.tipo_registro === 'MASCOTA').forEach((row) => { const key = row.fecha?.slice(0, 7); if (!key) return; const item = grouped.get(key) || { key, name: monthLabel(row.fecha), cantidad: 0 }; item.cantidad += 1; grouped.set(key, item) })
    return [...grouped.values()].sort((a, b) => a.key.localeCompare(b.key))
  }, [filtered])
  const options = useMemo(() => ({
    canales: getUniqueOptions(rows, 'canal'), sedes: getUniqueOptions(rows, 'sede'), subuens: getUniqueOptions(rows, 'subuen'), entidades: getUniqueOptions(rows, 'entidad'),
    planes: getUniqueOptions(rows, 'plan'), asesores: getUniqueOptions(rows, 'asesor'), tipos: getUniqueOptions(rows, 'tipo_retiro'), estados: getUniqueOptions(rows, 'estado_contrato'), causas: getUniqueOptions(rows, 'causal_retiro'), municipios: getUniqueOptions(rows, 'municipio'),
  }), [rows])
  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }))
  const selectRetirosView = (id) => { setActiveView(id); setFilters((current) => ({ ...current, ...Object.fromEntries(contextualFilterKeys.map((key) => [key, key === 'search' ? '' : 'TODOS'])) })) }
  const openDetail = (overrides = {}) => { setFilters((current) => ({ ...current, ...Object.fromEntries(contextualFilterKeys.map((key) => [key, key === 'search' ? '' : 'TODOS'])), ...overrides })); setActiveView('detalle') }
  const refreshData = () => loadHistory(true).catch((e) => setError(e.message))

  return <main className={embedded ? 'space-y-6' : 'min-h-screen bg-[radial-gradient(circle_at_top_left,#ffe4e6_0,#f8fafc_36%,#f8fafc_100%)]'}>
    {!embedded && <section className="border-b border-rose-100 bg-gradient-to-br from-rose-950 via-rose-800 to-orange-600 px-4 py-10 text-white sm:px-6 lg:px-8"><div className="mx-auto flex max-w-7xl items-center gap-4"><div className="grid size-14 place-items-center rounded-[1.4rem] border border-white/15 bg-white/10"><LogOut className="size-7" /></div><div><p className="text-xs font-black uppercase tracking-[0.28em] text-rose-100">Previsión · Submódulo independiente</p><h1 className="mt-1 font-heading text-4xl font-bold sm:text-5xl">{areaName}</h1><p className="mt-2 text-sm text-rose-100">Resumen ejecutivo de contratos, adicionales y mascotas retirados.</p></div></div></section>}
    <section className={embedded ? '' : 'mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8'}>
      <div className="grid items-start gap-4 lg:grid-cols-[auto_minmax(0,1fr)]">
      <PrevisionSubnav title="Retiros" subtitle="Análisis de desvinculación" items={retiroViews} active={activeView} onSelect={selectRetirosView} collapsed={navCollapsed} onToggle={() => setNavCollapsed((value) => !value)} tone="rose" />
      <div className="min-w-0 space-y-4">
      {activeView === 'reclasificacion' ? <ReclasificacionDashboard active={active} /> : <>
      <div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-xs font-black uppercase tracking-[.18em] text-rose-700">Previsión · Retiros</p><h2 className="mt-1 text-2xl font-black text-slate-950">{retiroViews.find((view) => view.id === activeView)?.label}</h2></div><p className="rounded-full bg-rose-50 px-3 py-1.5 text-sm font-black text-rose-700">{number(kpis.total)} retiros</p></div>
      <RetirosFilters activeView={activeView} filters={filters} options={options} setFilter={setFilter} reset={() => setFilters(defaultFilters)} refreshData={refreshData} loadingHistory={loadingHistory} historyReady={historyReady} />
      {error && rows.length ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">{error} Se conservan los datos disponibles en caché.</div> : null}
      {loading ? <div className="grid min-h-72 place-items-center rounded-3xl bg-white font-black text-slate-600">Consultando retiros…</div> : error && !rows.length ? <div className="rounded-3xl bg-white p-8 text-center text-rose-700">{error}</div> : !filtered.length ? <EmptyState /> : activeView === 'evolucion' ? <RetirosEvolution rows={filtered} from={filters.fechaInicial} to={filters.fechaFinal} /> : activeView === 'causales' ? <RetirosCauses rows={filtered} onOpenDetail={openDetail} /> : activeView === 'canales' ? <RetirosChannels rows={filtered} from={filters.fechaInicial} to={filters.fechaFinal} onOpenDetail={openDetail} /> : activeView === 'asesores' ? <RetirosAdvisors rows={filtered} from={filters.fechaInicial} to={filters.fechaFinal} onOpenDetail={openDetail} /> : activeView === 'planes' ? <RetirosPlans rows={filtered} from={filters.fechaInicial} to={filters.fechaFinal} /> : activeView === 'territorios' ? <RetirosTerritories rows={filtered} from={filters.fechaInicial} to={filters.fechaFinal} /> : activeView === 'valor' ? <RetirosValue rows={filtered} /> : activeView === 'permanencia' ? <RetirosPermanence rows={filtered} /> : activeView === 'mascotas' ? <RetirosPets rows={filtered} /> : activeView === 'calidad' ? <RetirosQuality rows={filtered} /> : activeView === 'detalle' ? <RetirosDetail rows={filtered} /> : <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="Contratos retirados" value={number(kpis.contratos)} helper="Contratos únicos cancelados en el periodo." icon={<ClipboardX className="size-6" />} accent="rose" />
          <KpiCard title="Adicionales personas" value={number(kpis.adicionales)} helper="Personas adicionales A y M retiradas." icon={<UserMinus className="size-6" />} accent="orange" />
          <KpiCard title="Adicionales mascotas" value={number(kpis.mascotas)} helper={`${percent(kpis.participacionMascotas)} del total de retiros.`} icon={<PawPrint className="size-6" />} accent="violet"><Sparkline data={petTrend} dataKey="cantidad" color="#7c3aed" /></KpiCard>
          <KpiCard title="Total de retiros" value={number(kpis.total)} helper="Contratos únicos + adicionales + mascotas." icon={<LogOut className="size-6" />} accent="blue" />
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
          <ChartCard title="Tendencia de retiros" subtitle={`Evolución ${mainTrendGranularity === 'daily' ? 'diaria' : mainTrendGranularity === 'weekly' ? 'semanal' : 'mensual'} adaptada al rango seleccionado.`} accent="blue"><div className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={mainTrend}><defs><linearGradient id="retirosExecutiveArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e11d48" stopOpacity=".3" /><stop offset="100%" stopColor="#e11d48" stopOpacity=".02" /></linearGradient></defs><XAxis dataKey="key" tickFormatter={(key) => trendLabel(key, mainTrendGranularity)} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={24} /><YAxis allowDecimals={false} width={34} axisLine={false} tickLine={false} /><Tooltip content={<CustomTooltip />} labelFormatter={(key) => trendLabel(key, mainTrendGranularity)} /><Area type="monotone" dataKey="total" name="Retiros" stroke="#e11d48" strokeWidth={3} fill="url(#retirosExecutiveArea)" dot={mainTrend.length <= 31 ? { r: 2 } : false} activeDot={{ r: 6 }} /></AreaChart></ResponsiveContainer></div></ChartCard>
          <ChartCard title="Participación por canal" subtitle="Canal comercial según la UEN; el tipo de retiro se analiza por separado." accent="violet"><div className="relative h-48"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={composition} dataKey="cantidad" nameKey="name" innerRadius={54} outerRadius={78} paddingAngle={3}>{composition.map((item, i) => <Cell key={item.name} fill={colors[i % colors.length]} />)}</Pie><Tooltip content={<CustomTooltip />} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 grid place-content-center text-center"><strong className="text-2xl text-slate-950">{number(kpis.total)}</strong><span className="text-[10px] font-black uppercase text-slate-400">retiros</span></div></div><div className="space-y-2">{composition.map((item, i) => <div key={item.name} className="rounded-xl bg-slate-50 px-3 py-2"><div className="flex items-center justify-between gap-2 text-xs"><span className="flex min-w-0 items-center gap-2 font-black text-slate-700"><i className="size-2 rounded-full" style={{ background: colors[i % colors.length] }} /><span className="truncate">{item.name}</span></span><strong>{number(item.cantidad)} · {percent(item.porcentaje)}</strong></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full" style={{ width: `${Math.max(item.porcentaje * 100, item.cantidad ? 2 : 0)}%`, background: colors[i % colors.length] }} /></div></div>)}</div></ChartCard>
        </div>
        <div className="grid gap-4 xl:grid-cols-3"><ChartCard title="Sedes y SubUEN" subtitle="Concentración territorial." accent="orange"><RankingList data={bySede.map((item) => ({ ...item, name: `${item.name} · ${item.subuen}` }))} color="#f59e0b" /></ChartCard><ChartCard title="Planes principales" subtitle="Ranking por retiros contabilizados." accent="violet"><RankingList data={byPlan} color="#7c3aed" limit={8} /></ChartCard><ChartCard title="Asesores principales" subtitle="Concentración por responsable." accent="blue"><RankingList data={byAdvisor} color="#2563eb" limit={8} /></ChartCard></div>
        <PaginatedRetirosTable rows={filtered} />
      </>}
      </>}
      </div>
      </div>
    </section>
  </main>
}

function RetirosFilters({ activeView, filters, options, setFilter, reset, refreshData, loadingHistory, historyReady }) {
  const [expanded, setExpanded] = useState(false)
  const definitions = { canal: ['Canal', options.canales], municipio: ['Municipio', options.municipios], entidad: ['Entidad / convenio', options.entidades], plan: ['Plan exequial', options.planes], asesor: ['Asesor', options.asesores], tipoRetiro: ['Tipo de retiro', options.tipos], causal: ['Causal de retiro', options.causas], estadoContrato: ['Estado del contrato', options.estados] }
  const keys = viewFilterKeys[activeView] || []
  return <div className="card-shadow rounded-2xl border border-slate-200 bg-white p-3"><div className="flex flex-wrap items-end gap-2"><DateInput label="Desde" value={filters.fechaInicial} onChange={(value) => setFilter('fechaInicial', value)} /><DateInput label="Hasta" value={filters.fechaFinal} onChange={(value) => setFilter('fechaFinal', value)} /><Filter label="Sede" value={filters.sede} options={options.sedes} onChange={(value) => setFilter('sede', value)} /><Filter label="SubUEN" value={filters.subuen} options={options.subuens} onChange={(value) => setFilter('subuen', value)} /><button type="button" onClick={() => setExpanded((value) => !value)} className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-black ${expanded ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-slate-200 text-slate-600'}`}><SlidersHorizontal className="size-4" />Más filtros{keys.length ? ` (${keys.length})` : ''}</button><button type="button" onClick={reset} className="ml-auto h-10 rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-600">Limpiar</button><button type="button" onClick={refreshData} disabled={loadingHistory} className="inline-flex h-10 items-center gap-2 rounded-xl bg-rose-700 px-3 text-xs font-black text-white disabled:opacity-60"><RefreshCw className={`size-4 ${loadingHistory ? 'animate-spin' : ''}`} />Actualizar</button></div>{expanded && keys.length > 0 && <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 md:grid-cols-2 xl:grid-cols-4">{keys.includes('search') && <TextInput value={filters.search} onChange={(value) => setFilter('search', value)} />}{keys.filter((key) => key !== 'search').map((key) => <Filter key={key} label={definitions[key][0]} value={filters[key]} options={definitions[key][1]} onChange={(value) => setFilter(key, value)} />)}</div>}<p className="mt-2 text-[11px] font-semibold text-slate-400">{loadingHistory ? 'Actualizando desde SAP…' : historyReady ? 'Fecha, sede y SubUEN se conservan entre vistas.' : 'Preparando historial.'}</p></div>
}

function TextInput({ value, onChange }) { return <label className="grid gap-1 text-xs font-black uppercase tracking-wider text-slate-500">Buscar<input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Contrato, persona, documento…" className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold normal-case tracking-normal outline-none focus:border-rose-600" /></label> }
function DateInput({ label, value, onChange }) {
  const inputRef = useRef(null)
  const formatted = value ? value.split('-').reverse().join('/') : 'dd/mm/aaaa'
  const openPicker = () => {
    if (typeof inputRef.current?.showPicker === 'function') inputRef.current.showPicker()
    else inputRef.current?.click()
  }
  return <div className="grid min-w-36 flex-1 gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500 xl:max-w-44"><span>{label}</span><button type="button" onClick={openPicker} className="flex h-10 w-full cursor-pointer items-center rounded-xl border border-slate-200 bg-white px-3 text-left text-xs font-bold normal-case tracking-normal text-slate-700 transition hover:border-rose-300 focus:border-rose-600 focus:outline-none focus:ring-4 focus:ring-rose-100"><span>{formatted}</span><CalendarDays className="ml-auto size-4 text-slate-500" /></button><input ref={inputRef} aria-label={label} type="date" value={value} onChange={(e) => onChange(e.target.value)} className="pointer-events-none absolute size-px opacity-0" tabIndex={-1} /></div>
}
function Filter({ label, value, options, onChange }) { return <label className="grid min-w-36 flex-1 gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500 xl:max-w-52">{label}<select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold normal-case tracking-normal text-slate-700"><option value="TODOS">Todos</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label> }

function PaginatedRetirosTable({ rows }) {
  const pageSize = 25
  const [page, setPage] = useState(1)
  const pages = Math.max(1, Math.ceil(rows.length / pageSize))
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize)
  useEffect(() => setPage(1), [rows])
  useEffect(() => { if (page > pages) setPage(pages) }, [page, pages])
  return <ChartCard title="Detalle de retiros" subtitle={`${number(rows.length)} registros filtrados · página ${page} de ${pages}.`} right={<ExportRetirosButton rows={rows} filename="detalle-retiros" />}>
    <div className="overflow-x-auto"><table className="min-w-full whitespace-nowrap text-left text-sm"><thead><tr className="border-b text-[11px] uppercase tracking-[.12em] text-slate-400">{['Fecha retiro', 'Contrato', 'Identificación / nombre', 'Tipo', 'Canal', 'Entidad', 'Plan', 'Asesor', 'Sede / SubUEN', 'Ingreso', 'Vigencia', 'Estado'].map((head) => <th key={head} className="px-3 py-3">{head}</th>)}</tr></thead><tbody>{pageRows.map((row) => <tr key={row.id} className="border-b border-slate-100"><td className="px-3 py-3 font-bold">{row.fecha}</td><td className="px-3 py-3 font-black">{row.contrato}</td><td className="px-3 py-3"><p className="font-bold">{row.nombre}</p><p className="text-xs text-slate-500">{row.documento}</p></td><td className="px-3 py-3"><span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-black text-rose-700">{row.tipo_retiro}</span></td><td className="px-3 py-3 font-bold">{row.canal}</td><td className="px-3 py-3">{row.entidad}</td><td className="px-3 py-3">{row.plan}</td><td className="px-3 py-3">{row.asesor}</td><td className="px-3 py-3"><p>{row.sede}</p><p className="text-xs text-slate-500">{row.subuen}</p></td><td className="px-3 py-3">{String(row.fecha_ingreso || '').slice(0, 10) || '—'}</td><td className="px-3 py-3 font-bold">{formatVigencia(row)}</td><td className="px-3 py-3">{row.estado_contrato}</td></tr>)}</tbody></table></div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span className="text-xs font-bold text-slate-500">Mostrando {rows.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, rows.length)} de {number(rows.length)}</span><div className="flex items-center gap-3"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border px-3 py-1.5 text-xs font-black disabled:opacity-40">Anterior</button><span className="text-xs font-bold text-slate-500">Página {page} de {pages}</span><button type="button" disabled={page >= pages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border px-3 py-1.5 text-xs font-black disabled:opacity-40">Siguiente</button></div></div>
  </ChartCard>
}

function RetirosTable({ rows }) { return <ChartCard title="Detalle de retiros" subtitle={`Se muestran ${Math.min(rows.length, 200)} de ${number(rows.length)} registros filtrados.`}><div className="overflow-x-auto"><table className="min-w-full whitespace-nowrap text-left text-sm"><thead><tr className="border-b text-[11px] uppercase tracking-[.12em] text-slate-400">{['Fecha retiro', 'Contrato', 'Identificación / nombre', 'Tipo', 'Canal', 'Entidad', 'Plan', 'Asesor', 'Sede / SubUEN', 'Ingreso', 'Vigencia', 'Estado'].map((head) => <th key={head} className="px-3 py-3">{head}</th>)}</tr></thead><tbody>{rows.slice(0, 200).map((row) => <tr key={row.id} className="border-b border-slate-100"><td className="px-3 py-3 font-bold">{row.fecha}</td><td className="px-3 py-3 font-black">{row.contrato}</td><td className="px-3 py-3"><p className="font-bold">{row.nombre}</p><p className="text-xs text-slate-500">{row.documento}</p></td><td className="px-3 py-3"><span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-black text-rose-700">{row.tipo_retiro}</span></td><td className="px-3 py-3 font-bold">{row.canal}</td><td className="px-3 py-3">{row.entidad}</td><td className="px-3 py-3">{row.plan}</td><td className="px-3 py-3">{row.asesor}</td><td className="px-3 py-3"><p>{row.sede}</p><p className="text-xs text-slate-500">{row.subuen}</p></td><td className="px-3 py-3">{row.fecha_ingreso || '—'}</td><td className="px-3 py-3 font-bold">{number(row.meses_vigencia)} meses</td><td className="px-3 py-3">{row.estado_contrato}</td></tr>)}</tbody></table></div></ChartCard> }
