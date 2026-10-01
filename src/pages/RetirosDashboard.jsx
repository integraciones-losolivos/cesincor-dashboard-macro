import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ClipboardX, LogOut, PawPrint, RefreshCw, UserMinus } from 'lucide-react'
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
import { fetchRetiros } from '../services/retirosApi.js'
import { getUniqueOptions, monthLabel, number, percent } from '../utils/dashboard.js'
import { buildRetirosComposition, buildRetirosKpis, filterRetiros, groupRetiros, groupRetirosBySede, initialRetirosFilters } from '../utils/retiros.js'

const colors = ['#be123c', '#ea580c', '#2563eb', '#0f766e', '#7c3aed', '#ca8a04']
const DATA_YEAR = new Date().getFullYear()
const defaultFilters = { ...initialRetirosFilters }
const yearRange = (year) => ({ from: `${year}-01-01`, to: `${year}-12-31` })
function mergeRows(current, incoming) { const map = new Map(current.map((row) => [row.id, row])); incoming.forEach((row) => map.set(row.id, row)); return [...map.values()] }

export default function RetirosDashboard({ areaName = 'Retiros', embedded = false, active = true }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState(defaultFilters)
  const [activeView, setActiveView] = useState('resumen')
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyReady, setHistoryReady] = useState(false)
  const activeRequests = useRef(new Map())
  const currentYearReady = useRef(false)

  const loadCurrentYear = useCallback(async (refresh = false) => {
    const key = `current:${refresh}`
    if (activeRequests.current.has(key)) return activeRequests.current.get(key)
    const request = fetchRetiros({ ...yearRange(DATA_YEAR), refresh: refresh ? 'incremental' : '' })
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
    const request = fetchRetiros({ refresh: refresh ? 'incremental' : '' }).then((incoming) => {
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
  const refreshData = () => loadHistory(true).catch((e) => setError(e.message))

  return <main className={embedded ? 'space-y-6' : 'min-h-screen bg-[radial-gradient(circle_at_top_left,#ffe4e6_0,#f8fafc_36%,#f8fafc_100%)]'}>
    {!embedded && <section className="border-b border-rose-100 bg-gradient-to-br from-rose-950 via-rose-800 to-orange-600 px-4 py-10 text-white sm:px-6 lg:px-8"><div className="mx-auto flex max-w-7xl items-center gap-4"><div className="grid size-14 place-items-center rounded-[1.4rem] border border-white/15 bg-white/10"><LogOut className="size-7" /></div><div><p className="text-xs font-black uppercase tracking-[0.28em] text-rose-100">Previsión · Submódulo independiente</p><h1 className="mt-1 font-heading text-4xl font-bold sm:text-5xl">{areaName}</h1><p className="mt-2 text-sm text-rose-100">Resumen ejecutivo de contratos, adicionales y mascotas retirados.</p></div></div></section>}
    <section className={embedded ? 'space-y-6' : 'mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8'}>
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {[['resumen', 'Resumen general'], ['evolucion', 'Evolución de retiros'], ['causales', 'Causales de retiro'], ['canales', 'Retiros por canal'], ['asesores', 'Retiros por asesor'], ['planes', 'Retiros por plan'], ['territorios', 'Retiros por territorio'], ['valor', 'Valor asociado'], ['permanencia', 'Permanencia de adicionales']].map(([id, label]) => <button key={id} type="button" onClick={() => setActiveView(id)} className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${activeView === id ? 'bg-rose-700 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>{label}</button>)}
      </div>
      <RetirosFilters filters={filters} options={options} setFilter={setFilter} reset={() => setFilters(defaultFilters)} refreshData={refreshData} loadingHistory={loadingHistory} historyReady={historyReady} resultCount={filtered.length} />
      {error && rows.length ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">{error} Se conservan los datos disponibles en caché.</div> : null}
      {loading ? <div className="grid min-h-72 place-items-center rounded-3xl bg-white font-black text-slate-600">Consultando retiros…</div> : error && !rows.length ? <div className="rounded-3xl bg-white p-8 text-center text-rose-700">{error}</div> : !filtered.length ? <EmptyState /> : activeView === 'evolucion' ? <RetirosEvolution rows={filtered} from={filters.fechaInicial} to={filters.fechaFinal} /> : activeView === 'causales' ? <RetirosCauses rows={filtered} /> : activeView === 'canales' ? <RetirosChannels rows={filtered} from={filters.fechaInicial} to={filters.fechaFinal} /> : activeView === 'asesores' ? <RetirosAdvisors rows={filtered} from={filters.fechaInicial} to={filters.fechaFinal} /> : activeView === 'planes' ? <RetirosPlans rows={filtered} from={filters.fechaInicial} to={filters.fechaFinal} /> : activeView === 'territorios' ? <RetirosTerritories rows={filtered} from={filters.fechaInicial} to={filters.fechaFinal} /> : activeView === 'valor' ? <RetirosValue rows={filtered} /> : activeView === 'permanencia' ? <RetirosPermanence rows={filtered} /> : <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="Contratos retirados" value={number(kpis.contratos)} helper="Contratos únicos cancelados en el periodo." icon={<ClipboardX className="size-6" />} accent="rose" />
          <KpiCard title="Adicionales personas" value={number(kpis.adicionales)} helper="Personas adicionales A y M retiradas." icon={<UserMinus className="size-6" />} accent="orange" />
          <KpiCard title="Adicionales mascotas" value={number(kpis.mascotas)} helper={`${percent(kpis.participacionMascotas)} del total de retiros.`} icon={<PawPrint className="size-6" />} accent="violet" />
          <KpiCard title="Total de retiros" value={number(kpis.total)} helper="Contratos únicos + adicionales + mascotas." icon={<LogOut className="size-6" />} accent="blue" />
        </div>
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <ChartCard title="Composición de los retiros" subtitle="Cantidad y participación por canal." accent="rose"><div className="grid gap-4 md:grid-cols-[1fr_0.9fr]"><div className="h-72"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={composition} dataKey="cantidad" nameKey="name" innerRadius={62} outerRadius={98} paddingAngle={4}>{composition.map((item, i) => <Cell key={item.name} fill={colors[i % colors.length]} />)}</Pie><Tooltip content={<CustomTooltip />} /></PieChart></ResponsiveContainer></div><div className="flex flex-col justify-center gap-3">{composition.map((item, i) => <div key={item.name} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2"><span className="flex items-center gap-2 text-xs font-black text-slate-700"><i className="size-2.5 rounded-full" style={{ background: colors[i % colors.length] }} />{item.name}</span><span className="text-sm font-black text-slate-950">{number(item.cantidad)} · {percent(item.porcentaje)}</span></div>)}</div></div></ChartCard>
          <ChartCard title="Retiros por sede y SubUEN" subtitle="Top 10 concentraciones del periodo." accent="orange"><Bars data={bySede} label={(item) => `${item.name} · ${item.subuen}`} /></ChartCard>
        </div>
        <div className="grid gap-6 xl:grid-cols-2"><ChartCard title="Planes con más retiros" subtitle="Top 8 por plan exequial." accent="violet"><Bars data={byPlan} /></ChartCard><ChartCard title="Asesores con más retiros" subtitle="Resumen Top 8; el análisis detallado se desarrollará aparte." accent="blue"><Bars data={byAdvisor} color="#2563eb" /></ChartCard></div>
        <ChartCard title="Adicionales mascotas retiradas" subtitle={`Evolución mensual de ${number(kpis.mascotas)} registros P y D (${percent(kpis.participacionMascotas)} del total).`} accent="orange"><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={petTrend}><CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="cantidad" name="Adicionales mascotas" fill="#7c3aed" radius={[9, 9, 0, 0]} /></BarChart></ResponsiveContainer></div></ChartCard>
        <RetirosTable rows={filtered} />
      </>}
    </section>
  </main>
}

function RetirosFilters({ filters, options, setFilter, reset, refreshData, loadingHistory, historyReady, resultCount }) {
  const fields = [['canal', 'Canal', options.canales], ['sede', 'Sede', options.sedes], ['subuen', 'SubUEN', options.subuens], ['municipio', 'Municipio', options.municipios], ['entidad', 'Entidad / convenio', options.entidades], ['plan', 'Plan exequial', options.planes], ['asesor', 'Asesor', options.asesores], ['tipoRetiro', 'Tipo de retiro', options.tipos], ['causal', 'Causal de retiro', options.causas], ['estadoContrato', 'Estado del contrato', options.estados]]
  return <div className="card-shadow space-y-4 rounded-2xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.18em] text-rose-700">Filtros propios de Retiros</p><p className="mt-1 text-sm font-bold text-slate-500">{number(resultCount)} registros visibles</p></div><div className="flex gap-2"><button type="button" onClick={reset} className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-black text-slate-600">Limpiar</button><button type="button" onClick={refreshData} disabled={loadingHistory} className="inline-flex h-10 items-center gap-2 rounded-xl bg-rose-700 px-4 text-xs font-black text-white disabled:opacity-60"><RefreshCw className={`size-4 ${loadingHistory ? 'animate-spin' : ''}`} />Actualizar</button></div></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"><TextInput value={filters.search} onChange={(value) => setFilter('search', value)} /><DateInput label="Fecha inicial" value={filters.fechaInicial} onChange={(value) => setFilter('fechaInicial', value)} /><DateInput label="Fecha final" value={filters.fechaFinal} onChange={(value) => setFilter('fechaFinal', value)} />{fields.map(([key, label, fieldOptions]) => <Filter key={key} label={label} value={filters[key]} options={fieldOptions} onChange={(value) => setFilter(key, value)} />)}</div><p className="text-xs font-semibold text-slate-500">{loadingHistory ? 'Preparando historial en segundo plano…' : historyReady ? 'Historial completo disponible en caché.' : 'El historial se cargará automáticamente.'}</p></div>
}

function TextInput({ value, onChange }) { return <label className="grid gap-1 text-xs font-black uppercase tracking-wider text-slate-500">Buscar<input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Contrato, persona, documento…" className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold normal-case tracking-normal outline-none focus:border-rose-600" /></label> }
function DateInput({ label, value, onChange }) { return <label className="grid gap-1 text-xs font-black uppercase tracking-wider text-slate-500">{label}<input type="date" value={value} onChange={(e) => onChange(e.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold normal-case tracking-normal text-slate-700" /></label> }
function Filter({ label, value, options, onChange }) { return <label className="grid gap-1 text-xs font-black uppercase tracking-wider text-slate-500">{label}<select value={value} onChange={(e) => onChange(e.target.value)} className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold normal-case tracking-normal text-slate-700"><option value="TODOS">Todos</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label> }
function Bars({ data, color = '#e11d48', label = (item) => item.name }) { const chartData = data.map((item) => ({ ...item, label: label(item) })); return <div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} layout="vertical" margin={{ left: 18 }}><CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="label" width={145} tick={{ fontSize: 11 }} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="cantidad" name="Retiros" fill={color} radius={[0, 9, 9, 0]} /></BarChart></ResponsiveContainer></div> }
function RetirosTable({ rows }) { return <ChartCard title="Detalle de retiros" subtitle={`Se muestran ${Math.min(rows.length, 200)} de ${number(rows.length)} registros filtrados.`}><div className="overflow-x-auto"><table className="min-w-full whitespace-nowrap text-left text-sm"><thead><tr className="border-b text-[11px] uppercase tracking-[.12em] text-slate-400">{['Fecha retiro', 'Contrato', 'Identificación / nombre', 'Tipo', 'Canal', 'Entidad', 'Plan', 'Asesor', 'Sede / SubUEN', 'Ingreso', 'Vigencia', 'Estado'].map((head) => <th key={head} className="px-3 py-3">{head}</th>)}</tr></thead><tbody>{rows.slice(0, 200).map((row) => <tr key={row.id} className="border-b border-slate-100"><td className="px-3 py-3 font-bold">{row.fecha}</td><td className="px-3 py-3 font-black">{row.contrato}</td><td className="px-3 py-3"><p className="font-bold">{row.nombre}</p><p className="text-xs text-slate-500">{row.documento}</p></td><td className="px-3 py-3"><span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-black text-rose-700">{row.tipo_retiro}</span></td><td className="px-3 py-3 font-bold">{row.canal}</td><td className="px-3 py-3">{row.entidad}</td><td className="px-3 py-3">{row.plan}</td><td className="px-3 py-3">{row.asesor}</td><td className="px-3 py-3"><p>{row.sede}</p><p className="text-xs text-slate-500">{row.subuen}</p></td><td className="px-3 py-3">{row.fecha_ingreso || '—'}</td><td className="px-3 py-3 font-bold">{number(row.meses_vigencia)} meses</td><td className="px-3 py-3">{row.estado_contrato}</td></tr>)}</tbody></table></div></ChartCard> }
