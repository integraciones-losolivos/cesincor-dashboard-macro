import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, BadgeDollarSign, BriefcaseBusiness, ClipboardCheck, Search, UsersRound } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartCard from '../ChartCard.jsx'
import CustomTooltip from '../CustomTooltip.jsx'
import KpiCard from '../KpiCard.jsx'
import { money, number } from '../../utils/dashboard.js'
import { buildCommercialKpis, buildCommercialPortfolio, buildDimensionPortfolio, buildIncomeComposition } from '../../utils/previsionIncome.js'

const PAGE_SIZE = 10
const metricLabels = { contratos: 'Contratos activos', vidas: 'Personas protegidas', facturacion: 'Facturación vigente', vidasPorContrato: 'Personas por contrato', participacion: 'Participación de personas' }
const chartColors = ['#0f766e', '#2563eb', '#7c3aed', '#db2777', '#0891b2', '#65a30d', '#475569', '#ea580c']

export default function CommercialIncome({ rows, selectedAdvisor, onSelectAdvisor }) {
  const [metric, setMetric] = useState('contratos')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState({ key: 'contratos', direction: 'desc' })
  const kpis = useMemo(() => buildCommercialKpis(rows), [rows])
  const portfolio = useMemo(() => buildCommercialPortfolio(rows), [rows])
  const hasAdvisorFilter = selectedAdvisor !== 'TODOS'
  const selected = hasAdvisorFilter ? portfolio.find((item) => item.name === selectedAdvisor) || null : null
  const visible = selected || (hasAdvisorFilter ? emptySummary() : kpis)
  const filtered = useMemo(() => portfolio.filter((item) => item.name.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es'))), [portfolio, search])
  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const factor = sort.direction === 'asc' ? 1 : -1
    if (typeof a[sort.key] === 'string') return factor * a[sort.key].localeCompare(b[sort.key], 'es')
    return factor * (a[sort.key] - b[sort.key])
  }), [filtered, sort])
  const chartRows = useMemo(() => [...portfolio].sort((a, b) => b[metric] - a[metric]).slice(0, 20), [metric, portfolio])
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const topLives = portfolio[0]
  const topContracts = [...portfolio].sort((a, b) => b.contratos - a.contratos)[0]

  useEffect(() => { setPage(1) }, [search, sort])
  useEffect(() => { if (page > pages) setPage(pages) }, [page, pages])
  const handleSort = (key) => setSort((current) => ({ key, direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc' }))

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div><p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">Resumen por asesor</p><p className="mt-1 text-sm text-slate-500">Portafolio activo asignado al responsable del titular. No representa producción histórica.</p></div>
      <div className="flex flex-wrap items-center gap-2">{!hasAdvisorFilter && topLives && <span className="rounded-xl bg-teal-50 px-3 py-2 text-xs font-bold text-teal-900">Más personas: {topLives.name}</span>}{!hasAdvisorFilter && topContracts && <span className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-900">Más contratos: {topContracts.name}</span>}{hasAdvisorFilter && <button type="button" onClick={() => onSelectAdvisor('TODOS')} className="rounded-xl border border-teal-700 px-4 py-2 text-sm font-black text-teal-800 transition hover:bg-teal-50">Ver todos los asesores</button>}</div>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard title={selected ? 'Asesor seleccionado' : 'Asesores activos'} value={selected ? selected.name : number(kpis.responsables)} helper={selected ? `${number(selected.convenios)} convenios y ${number(selected.planes)} planes asociados.` : 'Responsables con al menos un contrato activo.'} icon={<BriefcaseBusiness className="size-6" />} accent="blue" />
      <KpiCard title="Contratos activos" value={number(visible.contratos)} helper="Contratos únicos con titular activo." icon={<ClipboardCheck className="size-6" />} accent="emerald" />
      <KpiCard title="Personas protegidas" value={number(visible.vidas)} helper={`${decimal(visible.vidasPorContrato)} protegidos en promedio por contrato.`} icon={<UsersRound className="size-6" />} accent="violet" />
      <KpiCard title="Facturación vigente" value={money(visible.facturacion)} helper="Valor contabilizado una sola vez desde el titular activo." icon={<BadgeDollarSign className="size-6" />} accent="orange" />
    </div>

    <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
      <ChartCard title="Ranking de asesores" subtitle="Compara hasta 20 responsables y selecciona uno para ver su portafolio." accent="emerald" right={<select value={metric} onChange={(event) => setMetric(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"><option value="contratos">Contratos activos</option><option value="vidas">Personas protegidas</option><option value="facturacion">Facturación vigente</option><option value="vidasPorContrato">Promedio por contrato</option><option value="participacion">Participación</option></select>}>
        <div className="h-[620px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartRows} layout="vertical" margin={{ left: 20, right: 24 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" tickFormatter={(value) => metric === 'facturacion' ? compactMoney(value) : metric === 'participacion' ? `${decimal(value)}%` : number(value)} /><YAxis dataKey="name" type="category" width={170} tick={{ fontSize: 10 }} /><Tooltip content={<CustomTooltip />} /><Bar dataKey={metric} name={metricLabels[metric]} radius={[0, 8, 8, 0]} onClick={(entry) => onSelectAdvisor(entry.name)} className="cursor-pointer">{chartRows.map((item, index) => <Cell key={item.name} fill={selected?.name === item.name ? '#0f766e' : chartColors[index % chartColors.length]} opacity={selected && selected.name !== item.name ? 0.35 : 1} />)}</Bar></BarChart></ResponsiveContainer></div>
      </ChartCard>
      <ChartCard title={selected ? `Composición de ${selected.name}` : 'Composición total'} subtitle="Titulares, adicionales, mascotas y beneficiarios." accent="violet"><Composition summary={visible} /></ChartCard>
    </div>

    {selected && <AdvisorDetail advisor={selected} />}

    <ChartCard title="Tabla de asesores" subtitle="Busca, ordena y selecciona un asesor para consultar su detalle." accent="slate">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="relative w-full max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar asesor..." className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm font-bold outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100" /></div><span className="text-sm font-bold text-slate-500">{number(filtered.length)} asesores</span></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1150px] text-left text-sm"><thead><tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-400"><SortableHeader label="Asesor" field="name" sort={sort} onSort={handleSort} />{[['convenios','Convenios'],['contratos','Contratos'],['vidas','Personas'],['titulares','Titulares'],['adicionales','Adicionales'],['beneficiarios','Beneficiarios'],['facturacion','Facturación'],['vidasPorContrato','Promedio'],['participacion','% personas']].map(([key, label]) => <SortableHeader key={key} label={label} field={key} sort={sort} onSort={handleSort} right />)}</tr></thead><tbody>{pageRows.map((item) => <tr key={item.name} onClick={() => onSelectAdvisor(item.name)} className={`cursor-pointer border-b border-slate-100 transition hover:bg-cyan-50 ${selected?.name === item.name ? 'bg-cyan-50' : ''}`}><td className="max-w-72 px-3 py-3 font-black text-slate-800">{item.name}</td><td className="px-3 py-3 text-right">{number(item.convenios)}</td><td className="px-3 py-3 text-right">{number(item.contratos)}</td><td className="px-3 py-3 text-right">{number(item.vidas)}</td><td className="px-3 py-3 text-right">{number(item.titulares)}</td><td className="px-3 py-3 text-right">{number(item.adicionales)}</td><td className="px-3 py-3 text-right">{number(item.beneficiarios)}</td><td className="px-3 py-3 text-right font-bold">{money(item.facturacion)}</td><td className="px-3 py-3 text-right">{decimal(item.vidasPorContrato)}</td><td className="px-3 py-3 text-right">{decimal(item.participacion)}%</td></tr>)}</tbody></table></div>
      <div className="mt-4 flex items-center justify-end gap-3"><button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold disabled:opacity-40">Anterior</button><span className="text-sm font-bold text-slate-500">Página {page} de {pages}</span><button type="button" disabled={page === pages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold disabled:opacity-40">Siguiente</button></div>
    </ChartCard>
  </div>
}

function AdvisorDetail({ advisor }) {
  const dimensions = [
    ['Principales convenios', buildDimensionPortfolio(advisor.rows, 'convenio', 7), 'contratos', 'Contratos', '#0f766e'],
    ['Principales planes', buildDimensionPortfolio(advisor.rows, 'plan', 7), 'vidas', 'Personas', '#2563eb'],
    ['Distribución por sede', buildDimensionPortfolio(advisor.rows, 'sede', 7), 'contratos', 'Contratos', '#7c3aed'],
    ['Principales parentescos', buildDimensionPortfolio(advisor.rows, 'parentesco', 7), 'vidas', 'Personas', '#db2777'],
  ]
  return <section className="rounded-[2rem] bg-cyan-950 p-4 text-white sm:p-6"><p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Detalle del asesor</p><h2 className="mt-1 text-2xl font-black">{advisor.name}</h2><p className="mt-2 text-sm text-cyan-100">{number(advisor.convenios)} convenios · {number(advisor.planes)} planes · {number(advisor.sedes)} sedes · {number(advisor.contratos)} contratos · {number(advisor.vidas)} personas · {number(advisor.titulares)} titulares · {number(advisor.adicionales)} adicionales · {number(advisor.beneficiarios)} beneficiarios · {money(advisor.facturacion)}</p><div className="mt-5 grid gap-5 xl:grid-cols-2">{dimensions.map(([title, data, dataKey, name, color]) => <DarkChart key={title} title={title}><HorizontalBars data={data} dataKey={dataKey} name={name} color={color} /></DarkChart>)}</div></section>
}

function Composition({ summary }) { const data = buildIncomeComposition(summary); return <div><div className="h-72"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={96} paddingAngle={2}>{data.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip content={<CustomTooltip />} /></PieChart></ResponsiveContainer></div><div className="space-y-2">{data.map((item) => <div key={item.name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"><span className="flex items-center gap-2 font-bold text-slate-600"><span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span><strong>{number(item.value)}</strong></div>)}</div></div> }
function DarkChart({ title, children }) { return <div className="rounded-2xl bg-white p-4 text-slate-900"><h3 className="font-black">{title}</h3>{children}</div> }
function HorizontalBars({ data, dataKey, name, color }) { return <div className="mt-3 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ left: 12, right: 16 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" tickFormatter={number} /><YAxis dataKey="name" type="category" width={145} tick={{ fontSize: 10 }} /><Tooltip content={<CustomTooltip />} /><Bar dataKey={dataKey} name={name} fill={color} radius={[0, 7, 7, 0]} /></BarChart></ResponsiveContainer></div> }
function SortableHeader({ label, field, sort, onSort, right = false }) { const Icon = sort.key !== field ? ArrowUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown; return <th className={`px-3 py-3 ${right ? 'text-right' : ''}`}><button type="button" onClick={() => onSort(field)} className="inline-flex items-center gap-1 font-black">{label}<Icon className="size-3" /></button></th> }
function emptySummary() { return { contratos: 0, vidas: 0, titulares: 0, adicionales: 0, adicionalesPersonas: 0, mascotas: 0, beneficiarios: 0, facturacion: 0, vidasPorContrato: 0 } }
function decimal(value) { return Number(value || 0).toLocaleString('es-CO', { maximumFractionDigits: 1 }) }
function compactMoney(value) { return new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0) }
