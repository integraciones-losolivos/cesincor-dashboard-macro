import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, Pie, PieChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { LogOut, UsersRound, FileWarning, CalendarClock, Database, RefreshCw } from 'lucide-react'
import ChartCard from '../components/ChartCard.jsx'
import KpiCard from '../components/KpiCard.jsx'
import CustomTooltip from '../components/CustomTooltip.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { fetchRetiros } from '../services/retirosApi.js'
import { getUniqueOptions, monthLabel, normalizeText, number } from '../utils/dashboard.js'

const colors = ['#e11d48', '#f97316', '#2563eb', '#7c3aed', '#0f766e', '#ca8a04']
const DATA_YEAR = new Date().getFullYear()

function yearRange(year) { return { from: `${year}-01-01`, to: `${year}-12-31` } }
function mergeRows(current, incoming) { const map = new Map(current.map((row) => [row.id, row])); incoming.forEach((row) => map.set(row.id, row)); return [...map.values()] }

function group(rows, key) {
  const map = new Map()
  rows.forEach((row) => { const name = row[key] || 'SIN DEFINIR'; const item = map.get(name) || { name, cantidad: 0, contratos: new Set() }; item.cantidad += 1; item.contratos.add(row.contrato); map.set(name, item) })
  return [...map.values()].map((item) => ({ ...item, contratos: item.contratos.size })).sort((a, b) => b.cantidad - a.cantidad)
}

export default function RetirosDashboard({ areaName = 'Retiros', embedded = false, active = true }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ search: '', fechaInicial: `${DATA_YEAR}-01-01`, fechaFinal: `${DATA_YEAR}-12-31`, sede: 'TODOS', tipo: 'TODOS', entidad: 'TODOS' })
  const [loadedYears, setLoadedYears] = useState(() => new Set())
  const [loadingHistory, setLoadingHistory] = useState(false)
  const activeRequests = useRef(new Map())

  const loadYear = useCallback(async (year, refresh = false) => {
    const key = `${year}:${refresh}`
    if (activeRequests.current.has(key)) return activeRequests.current.get(key)
    const request = (async () => {
      setLoadingHistory(true)
      try {
        const incoming = await fetchRetiros({ ...yearRange(year), refresh: refresh ? 'incremental' : '' })
        setRows((current) => mergeRows(current, incoming))
        setLoadedYears((current) => new Set(current).add(year))
        setError('')
      } finally {
        activeRequests.current.delete(key)
        setLoadingHistory(false)
      }
    })()
    activeRequests.current.set(key, request)
    return request
  }, [])

  useEffect(() => {
    if (!active || loadedYears.has(DATA_YEAR)) return
    loadYear(DATA_YEAR).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }, [active, loadYear, loadedYears])

  useEffect(() => {
    if (!active || !filters.fechaInicial || !filters.fechaFinal) return
    const fromYear = Number(filters.fechaInicial.slice(0, 4))
    const toYear = Number(filters.fechaFinal.slice(0, 4))
    if (!Number.isInteger(fromYear) || !Number.isInteger(toYear) || fromYear > toYear) return
    const missing = Array.from({ length: toYear - fromYear + 1 }, (_, index) => fromYear + index).filter((year) => !loadedYears.has(year))
    if (!missing.length) return
    let cancelled = false
    ;(async () => {
      try {
        for (const year of missing) {
          if (cancelled) return
          await loadYear(year)
        }
      } catch (e) { if (!cancelled) setError(e.message) }
    })()
    return () => { cancelled = true }
  }, [active, filters.fechaInicial, filters.fechaFinal, loadYear, loadedYears])

  const oldestLoadedYear = loadedYears.size ? Math.min(...loadedYears) : DATA_YEAR
  const loadPreviousYear = async () => {
    const year = oldestLoadedYear - 1
    try {
      await loadYear(year)
      setFilters((current) => ({ ...current, fechaInicial: `${year}-01-01` }))
    } catch (e) { setError(e.message) }
  }
  const refreshData = async () => {
    const fromYear = Number(filters.fechaInicial?.slice(0, 4))
    const toYear = Number(filters.fechaFinal?.slice(0, 4))
    const targets = Number.isInteger(fromYear) && Number.isInteger(toYear) && fromYear <= toYear
      ? Array.from({ length: toYear - fromYear + 1 }, (_, index) => fromYear + index)
      : [DATA_YEAR]
    try {
      for (const year of targets) await loadYear(year, true)
    } catch (e) { setError(e.message) }
  }
  const filtered = useMemo(() => rows.filter((row) => {
    const search = normalizeText(filters.search)
    return (!filters.fechaInicial || row.fecha >= filters.fechaInicial) && (!filters.fechaFinal || row.fecha <= filters.fechaFinal) &&
      (!search || [row.contrato, row.nombre, row.documento, row.plan, row.asesor, row.entidad].map(normalizeText).some((v) => v.includes(search))) &&
      (filters.sede === 'TODOS' || row.sede === filters.sede) && (filters.tipo === 'TODOS' || row.tipo_retiro === filters.tipo) && (filters.entidad === 'TODOS' || row.entidad === filters.entidad)
  }), [rows, filters])
  const byType = useMemo(() => group(filtered, 'tipo_retiro'), [filtered])
  const bySede = useMemo(() => group(filtered, 'sede').slice(0, 8), [filtered])
  const byPlan = useMemo(() => group(filtered, 'plan').slice(0, 8), [filtered])
  const byMonth = useMemo(() => {
    const map = new Map(); filtered.forEach((row) => { const key = row.fecha?.slice(0, 7); if (!key) return; const item = map.get(key) || { key, name: monthLabel(row.fecha), cantidad: 0 }; item.cantidad += 1; map.set(key, item) }); return [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
  }, [filtered])
  const contracts = new Set(filtered.map((row) => row.contrato)).size
  const titular = filtered.filter((row) => row.tipo_retiro === 'TITULAR').length
  const avgMonths = filtered.length ? Math.round(filtered.reduce((sum, row) => sum + row.meses_vigencia, 0) / filtered.length) : 0
  const options = { sedes: getUniqueOptions(rows, 'sede'), tipos: getUniqueOptions(rows, 'tipo_retiro'), entidades: getUniqueOptions(rows, 'entidad') }

  return <main className={embedded ? 'space-y-6' : 'min-h-screen bg-[radial-gradient(circle_at_top_left,#ffe4e6_0,#f8fafc_36%,#f8fafc_100%)]'}>
    {!embedded && <section className="border-b border-rose-100 bg-gradient-to-br from-rose-950 via-rose-800 to-orange-600 px-4 py-10 text-white sm:px-6 lg:px-8"><div className="mx-auto flex max-w-7xl items-center gap-4"><div className="grid size-14 place-items-center rounded-[1.4rem] border border-white/15 bg-white/10"><LogOut className="size-7" /></div><div><p className="text-xs font-black uppercase tracking-[0.28em] text-rose-100">Área · Datos en vivo desde SAP HANA</p><h1 className="mt-1 font-heading text-4xl font-bold tracking-[-0.04em] sm:text-5xl">{areaName}</h1><p className="mt-2 text-sm text-rose-100">Seguimiento de cancelaciones y retiros individuales por contrato.</p></div></div></section>}
    <section className={embedded ? 'space-y-6' : 'mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8'}>
      <div className="card-shadow space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-4"><input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Contrato, persona, documento…" className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-rose-600" /><Filter value={filters.sede} onChange={(sede) => setFilters({ ...filters, sede })} options={options.sedes} label="Todas las sedes" /><Filter value={filters.tipo} onChange={(tipo) => setFilters({ ...filters, tipo })} options={options.tipos} label="Todos los tipos" /><Filter value={filters.entidad} onChange={(entidad) => setFilters({ ...filters, entidad })} options={options.entidades} label="Todas las entidades" /></div>
        <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-3">
          <DateInput label="Desde" value={filters.fechaInicial} onChange={(fechaInicial) => setFilters({ ...filters, fechaInicial })} />
          <DateInput label="Hasta" value={filters.fechaFinal} onChange={(fechaFinal) => setFilters({ ...filters, fechaFinal })} />
          <button type="button" onClick={loadPreviousYear} disabled={loadingHistory} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-black text-slate-700 disabled:opacity-60"><Database className="size-4" />{loadingHistory ? 'Cargando…' : `Cargar ${oldestLoadedYear - 1}`}</button>
          <button type="button" onClick={refreshData} disabled={loadingHistory} className="inline-flex h-11 items-center gap-2 rounded-xl bg-rose-700 px-4 text-sm font-black text-white disabled:opacity-60"><RefreshCw className={`size-4 ${loadingHistory ? 'animate-spin' : ''}`} />Actualizar</button>
          <span className="pb-3 text-xs font-bold text-slate-500">Historial cargado desde {oldestLoadedYear}</span>
        </div>
      </div>
      {loading ? <div className="grid min-h-72 place-items-center rounded-3xl bg-white font-black text-slate-600">Consultando retiros…</div> : error ? <div className="rounded-3xl bg-white p-8 text-center text-rose-700">{error}</div> : !filtered.length ? <EmptyState /> : <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><KpiCard title="Retiros registrados" value={number(filtered.length)} helper="Personas retiradas en el periodo consultado." icon={<LogOut className="size-6" />} accent="rose" /><KpiCard title="Contratos impactados" value={number(contracts)} helper="Contratos con al menos un retiro." icon={<FileWarning className="size-6" />} accent="orange" /><KpiCard title="Retiros de titular" value={number(titular)} helper="Cancelaciones del asegurado principal." icon={<UsersRound className="size-6" />} accent="violet" /><KpiCard title="Vigencia promedio" value={`${number(avgMonths)} meses`} helper="Tiempo entre ingreso y retiro." icon={<CalendarClock className="size-6" />} accent="blue" /></div>
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]"><ChartCard title="Tendencia de retiros" subtitle="Retiros registrados por mes." accent="rose"><div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={byMonth}><CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="cantidad" name="Retiros" fill="#e11d48" radius={[10, 10, 0, 0]} /></BarChart></ResponsiveContainer></div></ChartCard><ChartCard title="Composición del retiro" subtitle="Titulares, adicionales y mascotas." accent="orange"><div className="h-80"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={byType} dataKey="cantidad" nameKey="name" innerRadius={68} outerRadius={106} paddingAngle={4}>{byType.map((item, i) => <Cell key={item.name} fill={colors[i % colors.length]} />)}</Pie><Tooltip content={<CustomTooltip />} /></PieChart></ResponsiveContainer></div></ChartCard></div>
        <div className="grid gap-6 xl:grid-cols-2"><ChartCard title="Retiros por sede" subtitle="Volumen de personas y contratos afectados." accent="rose"><Bars data={bySede} /></ChartCard><ChartCard title="Planes con más retiros" subtitle="Concentración de retiros por plan exequial." accent="violet"><Bars data={byPlan} /></ChartCard></div>
        <ChartCard title="Detalle operativo de retiros" subtitle="Incluye titulares cancelados y retiros individuales; se muestran hasta 150 filas."><div className="overflow-x-auto"><table className="min-w-full border-separate border-spacing-y-2 text-left text-sm"><thead><tr className="text-[11px] uppercase tracking-[.14em] text-slate-400"><th className="px-3">Fecha</th><th className="px-3">Contrato</th><th className="px-3">Persona</th><th className="px-3">Tipo</th><th className="px-3">Plan</th><th className="px-3">Sede</th><th className="px-3">Vigencia</th></tr></thead><tbody>{filtered.slice(0, 150).map((row) => <tr key={row.id} className="bg-white shadow-sm"><td className="rounded-l-xl px-3 py-3 font-bold">{row.fecha}</td><td className="px-3 py-3 font-black">{row.contrato}</td><td className="px-3 py-3"><p className="font-bold">{row.nombre}</p><p className="text-xs text-slate-500">{row.documento}</p></td><td className="px-3 py-3"><span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-black text-rose-700">{row.tipo_retiro}</span></td><td className="px-3 py-3">{row.plan}</td><td className="px-3 py-3">{row.sede}</td><td className="rounded-r-xl px-3 py-3 font-black">{number(row.meses_vigencia)} meses</td></tr>)}</tbody></table></div></ChartCard>
      </>}
    </section></main>
}

function Filter({ value, onChange, options, label }) { return <select value={value} onChange={(e) => onChange(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-rose-600"><option value="TODOS">{label}</option>{options.map((option) => <option key={option}>{option}</option>)}</select> }
function DateInput({ label, value, onChange }) { return <label className="grid gap-1 text-xs font-black uppercase tracking-wider text-slate-500">{label}<input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold normal-case tracking-normal text-slate-700" /></label> }
function Bars({ data }) { return <div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ left: 16 }}><CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={120} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="cantidad" name="Retiros" fill="#e11d48" radius={[0, 10, 10, 0]} /></BarChart></ResponsiveContainer></div> }
