import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, CalendarClock, Network, Search, UsersRound } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartCard from '../ChartCard.jsx'
import CustomTooltip from '../CustomTooltip.jsx'
import KpiCard from '../KpiCard.jsx'
import { number } from '../../utils/dashboard.js'
import { buildAgeRangeDistribution, buildDimensionPortfolio, buildRelationshipPortfolio } from '../../utils/previsionIncome.js'

const metricLabels = { vidas: 'Personas protegidas', participacion: 'Participación', edadPromedio: 'Edad promedio', contratos: 'Contratos' }
const chartColors = ['#0f766e', '#2563eb', '#7c3aed', '#db2777', '#0891b2', '#65a30d', '#475569', '#ea580c']

export default function RelationshipSummary({ rows, selectedRelationship, onSelectRelationship }) {
  const [metric, setMetric] = useState('vidas')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState({ key: 'vidas', direction: 'desc' })
  const portfolio = useMemo(() => buildRelationshipPortfolio(rows), [rows])
  const hasFilter = selectedRelationship !== 'TODOS'
  const selectedName = selectedRelationship === 'N/A' ? 'SIN DEFINIR' : selectedRelationship
  const selected = hasFilter ? portfolio.find((item) => item.name === selectedName) || null : null
  const visibleRows = hasFilter ? selected?.rows || [] : rows
  const visiblePortfolio = useMemo(() => buildRelationshipPortfolio(visibleRows), [visibleRows])
  const totalLives = new Set(visibleRows.map((row) => row.id)).size
  const validAges = visibleRows.map((row) => row.edad).filter((value) => Number.isFinite(value) && value >= 0 && value <= 120)
  const averageAge = validAges.length ? validAges.reduce((sum, age) => sum + age, 0) / validAges.length : null
  const chartRows = useMemo(() => [...portfolio].sort((a, b) => numeric(b[metric]) - numeric(a[metric])).slice(0, 15), [metric, portfolio])
  const filtered = useMemo(() => portfolio.filter((item) => item.name.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es'))), [portfolio, search])
  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const factor = sort.direction === 'asc' ? 1 : -1
    if (sort.key === 'name') return factor * a.name.localeCompare(b.name, 'es')
    return factor * (numeric(a[sort.key]) - numeric(b[sort.key]))
  }), [filtered, sort])
  const top = portfolio[0]
  const highestAverage = [...portfolio].filter((item) => Number.isFinite(item.edadPromedio)).sort((a, b) => b.edadPromedio - a.edadPromedio)[0]
  const handleSort = (key) => setSort((current) => ({ key, direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc' }))

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">Resumen por parentescos</p><p className="mt-1 text-sm text-slate-500">Se conservan las categorías originales. Los valores vacíos o N/A se muestran como SIN DEFINIR.</p></div><div className="flex flex-wrap items-center gap-2">{!hasFilter && highestAverage && <span className="rounded-xl bg-violet-50 px-3 py-2 text-xs font-bold text-violet-900">Mayor edad promedio: {highestAverage.name}</span>}{hasFilter && <button type="button" onClick={() => onSelectRelationship('TODOS')} className="rounded-xl border border-teal-700 px-4 py-2 text-sm font-black text-teal-800 hover:bg-teal-50">Ver todos los parentescos</button>}</div></div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard title="Parentescos identificados" value={number(hasFilter ? visiblePortfolio.length : portfolio.length)} helper="Categorías presentes en el universo filtrado." icon={<Network className="size-6" />} accent="blue" />
      <KpiCard title="Personas protegidas" value={number(totalLives)} helper="Personas activas sin duplicar registros." icon={<UsersRound className="size-6" />} accent="emerald" />
      <KpiCard title={selected ? 'Parentesco seleccionado' : 'Mayor participación'} value={selected?.name || top?.name || 'Sin datos'} helper={`${decimal((selected || top)?.participacion)}% de las personas del universo comparado.`} icon={<UsersRound className="size-6" />} accent="violet" />
      <KpiCard title="Edad promedio" value={formatAge(averageAge)} helper="Calculada solo con edades válidas entre 0 y 120 años." icon={<CalendarClock className="size-6" />} accent="orange" />
    </div>

    <ChartCard title="Top 15 de parentescos" subtitle="Compara personas, participación, edad promedio o contratos y selecciona una categoría." accent="emerald" right={<select value={metric} onChange={(event) => setMetric(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"><option value="vidas">Personas protegidas</option><option value="participacion">Participación</option><option value="edadPromedio">Edad promedio</option><option value="contratos">Contratos</option></select>}>
      <div className="h-[520px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartRows} layout="vertical" margin={{ left: 20, right: 28 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" tickFormatter={(value) => metric === 'participacion' ? `${decimal(value)}%` : metric === 'edadPromedio' ? decimal(value) : number(value)} /><YAxis dataKey="name" type="category" width={190} tick={{ fontSize: 10 }} /><Tooltip content={<CustomTooltip />} /><Bar dataKey={metric} name={metricLabels[metric]} radius={[0, 8, 8, 0]} onClick={(entry) => onSelectRelationship(entry.name === 'SIN DEFINIR' ? 'N/A' : entry.name)} className="cursor-pointer">{chartRows.map((item, index) => <Cell key={item.name} fill={selected?.name === item.name ? '#0f766e' : chartColors[index % chartColors.length]} opacity={selected && selected.name !== item.name ? 0.35 : 1} />)}</Bar></BarChart></ResponsiveContainer></div>
    </ChartCard>

    {selected && <RelationshipDetail relationship={selected} />}

    <ChartCard title="Tabla de parentescos" subtitle="Listado completo con búsqueda, ordenamiento y selección." accent="slate">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="relative w-full max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar parentesco..." className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm font-bold outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100" /></div><span className="text-sm font-bold text-slate-500">{number(filtered.length)} parentescos</span></div>
      <div className="max-h-[38rem] overflow-auto"><table className="w-full min-w-[800px] text-sm"><thead className="sticky top-0 bg-white"><tr className="border-b text-[11px] uppercase tracking-wider text-slate-400"><SortableHeader label="Parentesco" field="name" sort={sort} onSort={handleSort} />{[['vidas','Personas'],['participacion','Participación'],['edadPromedio','Edad promedio'],['edadMediana','Edad mediana'],['contratos','Contratos']].map(([key, label]) => <SortableHeader key={key} label={label} field={key} sort={sort} onSort={handleSort} right />)}</tr></thead><tbody>{sorted.map((item) => <tr key={item.name} onClick={() => onSelectRelationship(item.name === 'SIN DEFINIR' ? 'N/A' : item.name)} className={`cursor-pointer border-b border-slate-100 hover:bg-cyan-50 ${selected?.name === item.name ? 'bg-cyan-50' : ''}`}><td className="px-3 py-3 font-black text-slate-800">{item.name}</td><td className="px-3 py-3 text-right">{number(item.vidas)}</td><td className="px-3 py-3 text-right">{decimal(item.participacion)}%</td><td className="px-3 py-3 text-right">{formatAge(item.edadPromedio)}</td><td className="px-3 py-3 text-right">{formatAge(item.edadMediana)}</td><td className="px-3 py-3 text-right">{number(item.contratos)}</td></tr>)}</tbody></table></div>
    </ChartCard>
  </div>
}

function RelationshipDetail({ relationship }) {
  const ranges = buildAgeRangeDistribution(relationship.rows)
  const dimensions = [
    ['Distribución por sede', buildDimensionPortfolio(relationship.rows, 'sede', 7), 'vidas', 'Personas', '#0f766e'],
    ['Principales planes', buildDimensionPortfolio(relationship.rows, 'plan', 7), 'vidas', 'Personas', '#2563eb'],
    ['Principales convenios', buildDimensionPortfolio(relationship.rows, 'convenio', 7), 'vidas', 'Personas', '#7c3aed'],
    ['Responsables relacionados', buildDimensionPortfolio(relationship.rows, 'asesor', 7), 'vidas', 'Personas', '#db2777'],
  ]
  return <section className="rounded-[2rem] bg-cyan-950 p-4 text-white sm:p-6"><p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Detalle del parentesco</p><h2 className="mt-1 text-2xl font-black">{relationship.name}</h2><p className="mt-2 text-sm text-cyan-100">{number(relationship.vidas)} personas · {decimal(relationship.participacion)}% de participación · {formatAge(relationship.edadPromedio)} promedio · {number(relationship.contratos)} contratos</p><div className="mt-5 grid gap-5 xl:grid-cols-2"><DetailChart title="Distribución por rango de edad"><div className="mt-3 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={ranges}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis tickFormatter={number} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="personas" name="Personas" fill="#0f766e" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div></DetailChart>{dimensions.map(([title, data, dataKey, name, color]) => <DetailChart key={title} title={title}><HorizontalBars data={data} dataKey={dataKey} name={name} color={color} /></DetailChart>)}</div></section>
}

function DetailChart({ title, children }) { return <div className="rounded-2xl bg-white p-4 text-slate-900"><h3 className="font-black">{title}</h3>{children}</div> }
function HorizontalBars({ data, dataKey, name, color }) { return <div className="mt-3 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ left: 12, right: 16 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" tickFormatter={number} /><YAxis dataKey="name" type="category" width={145} tick={{ fontSize: 10 }} /><Tooltip content={<CustomTooltip />} /><Bar dataKey={dataKey} name={name} fill={color} radius={[0, 7, 7, 0]} /></BarChart></ResponsiveContainer></div> }
function SortableHeader({ label, field, sort, onSort, right = false }) { const Icon = sort.key !== field ? ArrowUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown; return <th className={`px-3 py-3 ${right ? 'text-right' : ''}`}><button type="button" onClick={() => onSort(field)} className="inline-flex items-center gap-1 font-black">{label}<Icon className="size-3" /></button></th> }
function numeric(value) { return Number.isFinite(value) ? value : -1 }
function decimal(value) { return Number(value || 0).toLocaleString('es-CO', { maximumFractionDigits: 1 }) }
function formatAge(value) { return Number.isFinite(value) ? `${decimal(value)} años` : 'Sin datos' }
