import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, BadgeDollarSign, Building2, ClipboardCheck, UsersRound } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartCard from '../ChartCard.jsx'
import CustomTooltip from '../CustomTooltip.jsx'
import KpiCard from '../KpiCard.jsx'
import { money, number } from '../../utils/dashboard.js'
import { buildIncomeComposition, buildIncomeSummary, buildSitePortfolio } from '../../utils/previsionIncome.js'

const metricLabels = {
  vidas: 'Personas protegidas',
  contratos: 'Contratos activos',
  facturacion: 'Facturación vigente',
  vidasPorContrato: 'Personas por contrato',
  participacion: 'Participación de personas',
}

const chartColors = ['#0f766e', '#2563eb', '#7c3aed', '#db2777', '#0891b2', '#65a30d', '#475569']

export default function SiteSummary({ rows, selectedSite, onSelectSite }) {
  const [metric, setMetric] = useState('vidas')
  const [sort, setSort] = useState({ key: 'vidas', direction: 'desc' })
  const portfolio = useMemo(() => buildSitePortfolio(rows), [rows])
  const hasSiteFilter = selectedSite !== 'TODOS'
  const selected = hasSiteFilter ? portfolio.find((item) => item.name === selectedSite) || null : null
  const visibleRows = hasSiteFilter ? selected?.rows || [] : rows
  const summary = useMemo(() => buildIncomeSummary(visibleRows), [visibleRows])
  const sorted = useMemo(() => [...portfolio].sort((a, b) => {
    const factor = sort.direction === 'asc' ? 1 : -1
    if (typeof a[sort.key] === 'string') return factor * a[sort.key].localeCompare(b[sort.key], 'es')
    return factor * (a[sort.key] - b[sort.key])
  }), [portfolio, sort])

  const handleSort = (key) => setSort((current) => ({
    key,
    direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
  }))

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">Resumen por sede</p>
        <p className="mt-1 text-sm text-slate-500">La sede se toma del titular activo de cada contrato.</p>
      </div>
      {hasSiteFilter && <button type="button" onClick={() => onSelectSite('TODOS')} className="rounded-xl border border-teal-700 px-4 py-2 text-sm font-black text-teal-800 transition hover:bg-teal-50">Ver todas las sedes</button>}
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard title={selected ? `Sede ${selected.name}` : 'Sedes activas'} value={hasSiteFilter ? number(selected ? 1 : 0) : number(portfolio.length)} helper={selected ? 'Sede seleccionada para el análisis.' : 'Sedes con contratos activos en el universo filtrado.'} icon={<Building2 className="size-6" />} accent="blue" />
      <KpiCard title="Contratos activos" value={number(summary.contratos)} helper="Contratos únicos con titular activo." icon={<ClipboardCheck className="size-6" />} accent="emerald" />
      <KpiCard title="Personas protegidas" value={number(summary.vidas)} helper={`${decimal(summary.vidasPorContrato)} protegidos en promedio por contrato.`} icon={<UsersRound className="size-6" />} accent="violet" />
      <KpiCard title="Facturación vigente" value={money(summary.facturacion)} helper="Valor contabilizado una sola vez desde el titular activo." icon={<BadgeDollarSign className="size-6" />} accent="orange" />
    </div>

    <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
      <ChartCard title="Comparativo entre sedes" subtitle="Selecciona una barra para filtrar los indicadores y el detalle de composición." accent="emerald" right={<select value={metric} onChange={(event) => setMetric(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"><option value="vidas">Personas protegidas</option><option value="contratos">Contratos activos</option><option value="facturacion">Facturación vigente</option><option value="vidasPorContrato">Promedio por contrato</option><option value="participacion">Participación</option></select>}>
        <div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={portfolio} layout="vertical" margin={{ left: 12, right: 28 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" tickFormatter={(value) => metric === 'facturacion' ? compact(value) : metric === 'participacion' ? `${decimal(value)}%` : number(value)} /><YAxis dataKey="name" type="category" width={105} tick={{ fontSize: 11 }} /><Tooltip content={<CustomTooltip />} /><Bar dataKey={metric} name={metricLabels[metric]} radius={[0, 8, 8, 0]} onClick={(entry) => onSelectSite(entry.name)} className="cursor-pointer">{portfolio.map((item, index) => <Cell key={item.name} fill={selected?.name === item.name ? '#0f766e' : chartColors[index % chartColors.length]} opacity={selected && selected.name !== item.name ? 0.35 : 1} />)}</Bar></BarChart></ResponsiveContainer></div>
      </ChartCard>

      <ChartCard title={selected ? `Composición de ${selected.name}` : 'Composición total'} subtitle="Titulares, adicionales y beneficiarios del filtro actual." accent="violet">
        <Composition summary={summary} />
      </ChartCard>
    </div>

    <ChartCard title="Participación por sede" subtitle="Porcentaje de personas protegidas que concentra cada sede dentro del universo comparado." accent="blue">
      <div className="space-y-3">{portfolio.map((item, index) => <button type="button" key={item.name} onClick={() => onSelectSite(item.name)} className={`grid w-full grid-cols-[100px_1fr_70px] items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-slate-50 ${selected?.name === item.name ? 'bg-cyan-50 ring-1 ring-teal-200' : ''}`}><span className="truncate text-sm font-black text-slate-700">{item.name}</span><span className="h-3 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full" style={{ width: `${Math.min(item.participacion, 100)}%`, backgroundColor: chartColors[index % chartColors.length] }} /></span><span className="text-right text-sm font-black text-slate-700">{decimal(item.participacion)}%</span></button>)}</div>
    </ChartCard>

    <ChartCard title="Detalle por sede" subtitle="Ordena por cualquier indicador y selecciona una fila para aplicar la sede como filtro." accent="slate">
      <div className="overflow-x-auto"><table className="w-full min-w-[1080px] text-left text-sm"><thead><tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-400"><SortableHeader label="Sede" field="name" sort={sort} onSort={handleSort} />{[['contratos','Contratos'],['vidas','Personas'],['titulares','Titulares'],['adicionales','Adicionales'],['beneficiarios','Beneficiarios'],['facturacion','Facturación'],['vidasPorContrato','Promedio'],['participacion','% personas']].map(([key, label]) => <SortableHeader key={key} label={label} field={key} sort={sort} onSort={handleSort} right />)}</tr></thead><tbody>{sorted.map((item) => <tr key={item.name} onClick={() => onSelectSite(item.name)} className={`cursor-pointer border-b border-slate-100 transition hover:bg-cyan-50 ${selected?.name === item.name ? 'bg-cyan-50' : ''}`}><td className="px-3 py-3 font-black text-slate-800">{item.name}</td><td className="px-3 py-3 text-right">{number(item.contratos)}</td><td className="px-3 py-3 text-right">{number(item.vidas)}</td><td className="px-3 py-3 text-right">{number(item.titulares)}</td><td className="px-3 py-3 text-right">{number(item.adicionales)}</td><td className="px-3 py-3 text-right">{number(item.beneficiarios)}</td><td className="px-3 py-3 text-right font-bold">{money(item.facturacion)}</td><td className="px-3 py-3 text-right">{decimal(item.vidasPorContrato)}</td><td className="px-3 py-3 text-right">{decimal(item.participacion)}%</td></tr>)}</tbody></table></div>
    </ChartCard>
  </div>
}

function Composition({ summary }) {
  const data = buildIncomeComposition(summary)
  return <div><div className="h-60"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={88} paddingAngle={2}>{data.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip content={<CustomTooltip />} /></PieChart></ResponsiveContainer></div><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">{data.map((item) => <div key={item.name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"><span className="flex items-center gap-2 font-bold text-slate-600"><span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span><strong>{number(item.value)}</strong></div>)}</div></div>
}

function SortableHeader({ label, field, sort, onSort, right = false }) {
  const Icon = sort.key !== field ? ArrowUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown
  return <th className={`px-3 py-3 ${right ? 'text-right' : ''}`}><button type="button" onClick={() => onSort(field)} className="inline-flex items-center gap-1 font-black">{label}<Icon className="size-3" /></button></th>
}

function decimal(value) { return Number(value || 0).toLocaleString('es-CO', { maximumFractionDigits: 1 }) }
function compact(value) { return new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0) }
