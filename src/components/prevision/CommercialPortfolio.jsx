import { useEffect, useMemo, useState } from 'react'
import { ArrowUpDown, BriefcaseBusiness, Building2, MapPin, Network, Search } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartCard from '../ChartCard.jsx'
import CustomTooltip from '../CustomTooltip.jsx'
import KpiCard from '../KpiCard.jsx'
import { DataIllustration, RankingList } from './ExecutiveViz.jsx'
import { money, number } from '../../utils/dashboard.js'
import { buildCommercialKpis, buildCommercialPortfolio, buildDimensionPortfolio, buildIncomeComposition, buildIncomeSummary } from '../../utils/previsionIncome.js'

const PAGE_SIZE = 10
const sortLabels = { contratos: 'Contratos activos', vidas: 'Personas protegidas', facturacion: 'Facturación vigente' }

export default function CommercialPortfolio({ rows }) {
  const [sortBy, setSortBy] = useState('contratos')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedName, setSelectedName] = useState('')
  const kpis = useMemo(() => buildCommercialKpis(rows), [rows])
  const portfolio = useMemo(() => buildCommercialPortfolio(rows), [rows])
  const sorted = useMemo(() => portfolio
    .filter((item) => item.name.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')))
    .sort((a, b) => b[sortBy] - a[sortBy] || a.name.localeCompare(b.name, 'es')), [portfolio, search, sortBy])
  const selected = portfolio.find((item) => item.name === selectedName) || sorted[0] || null
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => { setPage(1) }, [search, sortBy])
  useEffect(() => {
    if (selectedName && !portfolio.some((item) => item.name === selectedName)) setSelectedName('')
  }, [portfolio, selectedName])

  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard title="Responsables activos" value={number(kpis.responsables)} helper="Responsables con al menos un contrato activo." icon={<BriefcaseBusiness className="size-6" />} accent="blue" illustration={<DataIllustration type="advisor" />} />
      <KpiCard title="Convenios activos" value={number(kpis.convenios)} helper="Convenios presentes en el portafolio filtrado." icon={<Network className="size-6" />} accent="emerald" />
      <KpiCard title="Planes activos" value={number(kpis.planes)} helper="Planes asociados a contratos activos." icon={<Building2 className="size-6" />} accent="violet" />
      <KpiCard title="Sedes activas" value={number(kpis.sedes)} helper={`${number(kpis.contratos)} contratos y ${number(kpis.vidas)} personas protegidas.`} icon={<MapPin className="size-6" />} accent="orange" />
    </div>

    <ChartCard title="Ranking de responsables" subtitle="Portafolio activo actual; no representa ventas nuevas ni producción histórica." accent="emerald" right={<select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"><option value="contratos">Por contratos</option><option value="vidas">Por personas</option><option value="facturacion">Por facturación</option></select>}>
      <RankingList data={sorted.slice(0, 10)} valueKey={sortBy} formatter={sortBy === 'facturacion' ? compactMoney : number} selected={selected?.name} onSelect={(item) => setSelectedName(item.name)} color="#0f766e" />
    </ChartCard>

    <ChartCard title="Tabla de responsables" subtitle="Busca, ordena y selecciona un responsable para consultar su detalle." accent="slate">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="relative w-full max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar responsable..." className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm font-bold outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100" /></div><span className="text-sm font-bold text-slate-500">{number(sorted.length)} responsables</span></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1120px] text-left text-sm"><thead><tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-400"><th className="px-3 py-3">Responsable</th>{[['contratos','Contratos'],['vidas','Personas'],['titulares','Titulares'],['adicionalesPersonas','Adic. personas'],['mascotas','Mascotas'],['beneficiarios','Beneficiarios'],['facturacion','Facturación'],['vidasPorContrato','Promedio'],['participacion','% personas']].map(([key,label]) => <th key={key} className="px-3 py-3 text-right"><button type="button" onClick={() => ['contratos','vidas','facturacion'].includes(key) && setSortBy(key)} className="inline-flex items-center gap-1 font-black">{label}{['contratos','vidas','facturacion'].includes(key) && <ArrowUpDown className="size-3" />}</button></th>)}</tr></thead><tbody>{pageRows.map((item) => <tr key={item.name} onClick={() => setSelectedName(item.name)} className={`cursor-pointer border-b border-slate-100 transition hover:bg-cyan-50 ${selected?.name === item.name ? 'bg-cyan-50' : ''}`}><td className="px-3 py-3 font-black text-slate-800">{item.name}</td><td className="px-3 py-3 text-right">{number(item.contratos)}</td><td className="px-3 py-3 text-right">{number(item.vidas)}</td><td className="px-3 py-3 text-right">{number(item.titulares)}</td><td className="px-3 py-3 text-right">{number(item.adicionalesPersonas)}</td><td className="px-3 py-3 text-right">{number(item.mascotas)}</td><td className="px-3 py-3 text-right">{number(item.beneficiarios)}</td><td className="px-3 py-3 text-right font-bold">{money(item.facturacion)}</td><td className="px-3 py-3 text-right">{decimal(item.vidasPorContrato)}</td><td className="px-3 py-3 text-right">{decimal(item.participacion)}%</td></tr>)}</tbody></table></div>
      <div className="mt-4 flex items-center justify-end gap-3"><button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold disabled:opacity-40">Anterior</button><span className="text-sm font-bold text-slate-500">Página {page} de {pages}</span><button type="button" disabled={page === pages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold disabled:opacity-40">Siguiente</button></div>
    </ChartCard>

    {selected && <ResponsibleDetail responsible={selected} />}
  </div>
}

function ResponsibleDetail({ responsible }) {
  const summary = buildIncomeSummary(responsible.rows)
  const convenios = buildDimensionPortfolio(responsible.rows, 'convenio', 10)
  const planes = buildDimensionPortfolio(responsible.rows, 'plan', 8)
  const sedes = buildDimensionPortfolio(responsible.rows, 'sede', 8)
  const composition = buildIncomeComposition(summary)
  return <section className="space-y-6 rounded-[2rem] border border-cyan-900/15 bg-cyan-950 p-4 text-white sm:p-6"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Detalle del responsable</p><h2 className="mt-1 text-2xl font-black">{responsible.name}</h2><p className="mt-2 text-sm text-cyan-100">{number(summary.contratos)} contratos · {number(summary.vidas)} personas protegidas · {money(summary.facturacion)} vigentes</p></div><div className="grid gap-5 xl:grid-cols-2"><DarkChart title="Principales convenios"><HorizontalBars data={convenios.slice(0, 7)} dataKey="contratos" name="Contratos" /></DarkChart><DarkChart title="Distribución por plan"><HorizontalBars data={planes.slice(0, 7)} dataKey="vidas" name="Personas" color="#8b5cf6" /></DarkChart><DarkChart title="Distribución por sede"><HorizontalBars data={sedes} dataKey="contratos" name="Contratos" color="#f59e0b" /></DarkChart><DarkChart title="Composición del portafolio"><div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={composition} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>{composition.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip content={<CustomTooltip />} /></PieChart></ResponsiveContainer></div></DarkChart></div></section>
}

function DarkChart({ title, children }) { return <div className="rounded-2xl bg-white p-4 text-slate-900"><h3 className="font-black">{title}</h3>{children}</div> }
function HorizontalBars({ data, dataKey, color = '#0f766e' }) { return <RankingList data={data} valueKey={dataKey} color={color} /> }
function decimal(value) { return Number(value || 0).toLocaleString('es-CO', { maximumFractionDigits: 1 }) }
function compactMoney(value) { return new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0) }
