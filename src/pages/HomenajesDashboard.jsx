import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, BarChart3, CircleDollarSign, HandHeart, Layers3, ListTree, LoaderCircle, PlusCircle, Rows3, TrendingUp } from 'lucide-react'
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartCard from '../components/ChartCard.jsx'
import CustomTooltip from '../components/CustomTooltip.jsx'
import DataTable from '../components/DataTable.jsx'
import ElementsTable from '../components/ElementsTable.jsx'
import EmptyState from '../components/EmptyState.jsx'
import FilterPanel from '../components/FilterPanel.jsx'
import KpiCard from '../components/KpiCard.jsx'
import { fetchHomenajes } from '../services/homenajesApi.js'
import { checkApiHealth } from '../services/http.js'
import { buildKpis, filterRows, getUniqueOptions, groupBy, groupByMonth, money, number, percent, shortMoney, withShare } from '../utils/dashboard.js'

const today = new Date()
const initialFilters = { search: '', fechaInicial: `${today.getFullYear()}-01-01`, fechaFinal: today.toISOString().slice(0, 10), sede: 'TODOS', gestor: 'TODOS', tipoHomenaje: 'TODOS', tipoExcedente: 'TODOS', lugarFallecimiento: 'TODOS', tipoServicio: 'TODOS', municipio: 'TODOS' }
const colors = ['#059669', '#2563eb', '#7c3aed', '#f97316', '#db2777', '#0891b2', '#ca8a04', '#dc2626']
const tipoColors = { PLAN: '#2563eb', RED: '#10b981', PARTICULAR: '#f97316', REEMBOLSO: '#7c3aed' }
const tabs = [{ id: 'resumen', label: 'Resumen ejecutivo', icon: BarChart3 }, { id: 'composicion', label: 'Composición del servicio', icon: ListTree }, { id: 'ordenes', label: 'Órdenes funerarias', icon: Rows3 }]
const CONNECTION_CHECK_MS = 2 * 60 * 1000
const RESUME_REFRESH_MS = 4 * 60 * 1000

function TabNav({ active, onChange }) {
  return <div className="card-shadow flex flex-wrap gap-2 rounded-2xl border border-slate-200/70 bg-white p-2">{tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => onChange(id)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${active === id ? 'bg-emerald-900 text-white shadow-lg shadow-emerald-900/15' : 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-800'}`}><Icon className="size-4" />{label}</button>)}</div>
}

function LoadingState() {
  return <div className="card-shadow grid min-h-72 place-items-center rounded-[2rem] border border-emerald-100 bg-white"><div className="text-center"><LoaderCircle className="mx-auto size-9 animate-spin text-emerald-600" /><p className="mt-4 font-black text-slate-950">Consultando órdenes de servicio funerario</p><p className="mt-1 text-sm text-slate-500">Leyendo cabeceras y elementos desde SAP HANA…</p></div></div>
}

function ErrorState({ message, retry }) {
  return <div className="card-shadow rounded-[2rem] border border-rose-200 bg-white p-8 text-center"><AlertTriangle className="mx-auto size-9 text-rose-500" /><p className="mt-4 font-black text-slate-950">No fue posible cargar Homenajes</p><p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">{message}</p><button type="button" onClick={retry} className="mt-5 rounded-xl bg-emerald-900 px-4 py-2 text-sm font-black text-white">Reintentar</button></div>
}

function ProgressList({ rows }) {
  return <div className="space-y-3">{rows.map((item, index) => <div key={item.name} className="rounded-2xl bg-slate-50 p-4"><div className="flex justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-black text-slate-950">{item.name}</p><p className="text-xs text-slate-500">{number(item.cantidad)} OSF · {percent(item.share)}</p></div><p className="shrink-0 text-sm font-black">{money(item.valor)}</p></div><div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full" style={{ width: `${Math.max(4, item.share * 100)}%`, backgroundColor: colors[index % colors.length] }} /></div></div>)}</div>
}

export default function HomenajesDashboard({ areaName = 'Homenajes' }) {
  const [filters, setFilters] = useState(initialFilters)
  const [activeTab, setActiveTab] = useState('resumen')
  const [data, setData] = useState({ rows: [], elements: [] })
  const [status, setStatus] = useState({ loading: true, error: '' })
  const [reloadKey, setReloadKey] = useState(0)
  const hasLoadedData = useRef(false)
  const lastLoadedAt = useRef(0)

  useEffect(() => {
    let active = true
    let requestInProgress = false

    async function loadData({ background = false } = {}) {
      if (requestInProgress || !navigator.onLine) return
      requestInProgress = true
      if (!background && !hasLoadedData.current) setStatus({ loading: true, error: '' })

      try {
        const payload = await fetchHomenajes({ from: initialFilters.fechaInicial, to: initialFilters.fechaFinal })
        if (active) {
          setData(payload)
          hasLoadedData.current = true
          lastLoadedAt.current = Date.now()
          setStatus({ loading: false, error: '' })
        }
      } catch (error) {
        if (active && !hasLoadedData.current) setStatus({ loading: false, error: error.message })
      } finally {
        requestInProgress = false
      }
    }

    function refreshAfterResume() {
      const dataIsOld = Date.now() - lastLoadedAt.current >= RESUME_REFRESH_MS
      if (document.visibilityState === 'visible' && navigator.onLine && dataIsOld) loadData({ background: true })
    }

    function refreshAfterReconnect() {
      if (navigator.onLine) loadData({ background: true })
    }

    loadData()
    const connectionTimer = window.setInterval(() => checkApiHealth().catch(() => {}), CONNECTION_CHECK_MS)
    window.addEventListener('online', refreshAfterReconnect)
    document.addEventListener('visibilitychange', refreshAfterResume)

    return () => {
      active = false
      window.clearInterval(connectionTimer)
      window.removeEventListener('online', refreshAfterReconnect)
      document.removeEventListener('visibilitychange', refreshAfterResume)
    }
  }, [reloadKey])

  const options = useMemo(() => ({ sedes: getUniqueOptions(data.rows, 'sede'), gestores: getUniqueOptions(data.rows, 'gestor'), tiposHomenaje: getUniqueOptions(data.rows, 'tipo_homenaje'), tiposExcedente: getUniqueOptions(data.rows, 'tipo_excedente'), lugaresFallecimiento: getUniqueOptions(data.rows, 'lugar_de_fallecimiento'), tiposServicio: getUniqueOptions(data.rows, 'tipo_servicio'), municipios: getUniqueOptions(data.rows, 'municipio') }), [data.rows])
  const filteredRows = useMemo(() => filterRows(data.rows, filters), [data.rows, filters])
  const visibleIds = useMemo(() => new Set(filteredRows.map((row) => row.id)), [filteredRows])
  const filteredElements = useMemo(() => data.elements.filter((item) => visibleIds.has(item.osf_id)), [data.elements, visibleIds])
  const kpis = useMemo(() => buildKpis(filteredRows), [filteredRows])
  const bySede = useMemo(() => withShare(groupBy(filteredRows, 'sede')).slice(0, 8), [filteredRows])
  const byTipo = useMemo(() => withShare(groupBy(filteredRows, 'tipo_homenaje')), [filteredRows])
  const byServicio = useMemo(() => withShare(groupBy(filteredRows, 'tipo_servicio')).slice(0, 8), [filteredRows])
  const byLugar = useMemo(() => withShare(groupBy(filteredRows, 'lugar_de_fallecimiento')).slice(0, 8), [filteredRows])
  const byMonth = useMemo(() => groupByMonth(filteredRows), [filteredRows])
  const byGestor = useMemo(() => groupBy(filteredRows, 'gestor').slice(0, 6), [filteredRows])
  const byElement = useMemo(() => {
    const map = new Map()
    filteredElements.filter((item) => item.clasificacion === 'ADICIONAL' && item.se_usa === 'SI').forEach((item) => { const current = map.get(item.elemento) || { name: item.elemento, cantidad: 0, valor: 0 }; current.cantidad += item.cantidad || 1; current.valor += item.valor_total; map.set(item.elemento, current) })
    return [...map.values()].sort((a, b) => b.valor - a.valor).slice(0, 8)
  }, [filteredElements])

  return <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dcfce7_0,#f8fafc_34%,#f8fafc_100%)]">
    <section className="relative overflow-hidden border-b border-emerald-100 bg-gradient-to-br from-emerald-950 via-emerald-800 to-green-600 px-4 py-10 text-white sm:px-6 lg:px-8"><div className="absolute right-[-5rem] top-[-6rem] h-72 w-72 rounded-full bg-lime-300/20 blur-3xl" /><div className="relative mx-auto flex max-w-7xl items-center gap-4"><div className="grid size-14 shrink-0 place-items-center rounded-[1.4rem] border border-white/15 bg-white/10 shadow-lg"><Layers3 className="size-7" /></div><div><p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-100">Área · Datos en vivo desde SAP HANA</p><h1 className="mt-1 font-heading text-4xl font-bold tracking-[-0.04em] sm:text-5xl">{areaName}</h1></div></div></section>
    <section className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <FilterPanel filters={filters} setFilters={setFilters} options={options} resetFilters={() => setFilters(initialFilters)} resultCount={filteredRows.length} />
      <TabNav active={activeTab} onChange={setActiveTab} />
      {status.loading ? <LoadingState /> : status.error ? <ErrorState message={status.error} retry={() => setReloadKey((key) => key + 1)} /> : !filteredRows.length ? <EmptyState /> : <div className="space-y-6">
        {activeTab === 'resumen' && <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><KpiCard title="Valor ejecutado" value={money(kpis.totalValor)} helper="Cubierto, adicionales y auxilios de OSF." icon={<CircleDollarSign className="size-6" />} accent="emerald" /><KpiCard title="Órdenes OSF" value={number(kpis.totalServicios)} helper="Solo órdenes del proceso funerario final." icon={<HandHeart className="size-6" />} accent="emerald" /><KpiCard title="Adicionales" value={money(kpis.totalExcedente)} helper={`${percent(kpis.participacionExcedente)} del valor ejecutado.`} icon={<PlusCircle className="size-6" />} accent="orange" /><KpiCard title="Ticket promedio" value={money(kpis.ticketPromedio)} helper="Valor promedio por orden funeraria." icon={<TrendingUp className="size-6" />} accent="violet" /></div>
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]"><ChartCard title="Ejecución por sede" subtitle="Valor total de las OSF por sede." accent="emerald"><div className="h-[22rem]"><ResponsiveContainer width="100%" height="100%"><BarChart data={bySede} layout="vertical" margin={{ right: 24, left: 18 }}><CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" horizontal={false} /><XAxis type="number" tickFormatter={shortMoney} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="name" width={95} axisLine={false} tickLine={false} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="valor" name="Valor ejecutado" radius={[0, 14, 14, 0]} barSize={24}>{bySede.map((item, index) => <Cell key={item.name} fill={colors[index % colors.length]} />)}</Bar></BarChart></ResponsiveContainer></div></ChartCard><ChartCard title="Composición del homenaje" subtitle="Clasificación según el tipo de servicio." accent="orange"><div className="relative h-80"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={byTipo} dataKey="valor" nameKey="name" innerRadius={70} outerRadius={106} paddingAngle={5}>{byTipo.map((item) => <Cell key={item.name} fill={tipoColors[item.name] || '#64748b'} />)}</Pie><Tooltip content={<CustomTooltip />} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><p className="text-[11px] font-black uppercase text-slate-400">Total</p><p className="text-xl font-black">{shortMoney(kpis.totalValor)}</p></div></div></div></ChartCard></div>
          <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]"><ChartCard title="Tendencia mensual" subtitle="Evolución de valores, adicionales y órdenes." accent="violet"><div className="h-80"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={byMonth}><CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="name" /><YAxis yAxisId="money" tickFormatter={shortMoney} /><YAxis yAxisId="services" orientation="right" /><Tooltip content={<CustomTooltip />} /><Area yAxisId="money" dataKey="valor" name="Valor" stroke="#2563eb" fill="#dbeafe" /><Bar yAxisId="money" dataKey="excedentes" name="Adicionales" fill="#f97316" /><Line yAxisId="services" dataKey="servicios" name="OSF" stroke="#7c3aed" strokeWidth={3} /></ComposedChart></ResponsiveContainer></div></ChartCard><ChartCard title="Encargados del servicio" subtitle="Ranking por valor ejecutado." accent="emerald"><div className="space-y-3">{byGestor.map((item, index) => <div key={item.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-black">{index + 1}. {item.name}</p><p className="text-xs text-slate-500">{number(item.cantidad)} órdenes</p></div><p className="shrink-0 text-sm font-black">{shortMoney(item.valor)}</p></div></div>)}</div></ChartCard></div>
        </>}
        {activeTab === 'composicion' && <><div className="grid gap-6 xl:grid-cols-2"><ChartCard title="Tipo de servicio" subtitle="Catálogo oficial asociado a U_TipoSrv." accent="emerald"><ProgressList rows={byServicio} /></ChartCard><ChartCard title="Lugar de fallecimiento" subtitle="Origen del cuerpo registrado en la orden." accent="rose"><ProgressList rows={byLugar} /></ChartCard></div><ChartCard title="Adicionales y excedentes" subtitle="Elementos A/M utilizados, agrupados por nombre y valor." accent="orange"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{byElement.length ? byElement.map((item, index) => <div key={item.name} className="rounded-3xl border border-slate-200 bg-slate-50 p-4"><p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{item.name}</p><p className="mt-2 text-xl font-black">{money(item.valor)}</p><p className="text-xs text-slate-500">{number(item.cantidad)} unidades</p><div className="mt-3 h-2 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} /></div>) : <p className="text-sm text-slate-500">No hay adicionales con los filtros seleccionados.</p>}</div></ChartCard><ElementsTable elements={filteredElements} rows={filteredRows} /></>}
        {activeTab === 'ordenes' && <DataTable rows={filteredRows} />}
      </div>}
    </section>
  </main>
}
