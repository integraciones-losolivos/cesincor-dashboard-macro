import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ClipboardList, ClipboardX, PawPrint, Search, Sigma, UserMinus } from 'lucide-react'
import ChartCard from '../ChartCard.jsx'
import CustomTooltip from '../CustomTooltip.jsx'
import KpiCard from '../KpiCard.jsx'
import { monthLabel, normalizeText, number, percent } from '../../utils/dashboard.js'
import { buildCausalSummary, buildChannelDimension, buildPlanSummary, buildRetirosKpis, buildRetirosMonthly, groupRetirosCounted } from '../../utils/retiros.js'

const PAGE_SIZE = 10
const series = [
  ['empresariales', 'Empresariales', '#0f766e'], ['independientes', 'Independientes', '#2563eb'],
  ['adicionales_personas', 'Adicionales personas', '#ea580c'], ['adicionales_mascotas', 'Adicionales mascotas', '#7c3aed'],
]

export default function RetirosPlans({ rows, from, to }) {
  const [selectedPlan, setSelectedPlan] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('total')
  const [page, setPage] = useState(1)
  const summary = useMemo(() => buildPlanSummary(rows), [rows])
  const ranked = useMemo(() => [...summary].sort((a, b) => b[sort] - a[sort] || a.name.localeCompare(b.name)), [summary, sort])
  const leader = ranked[0]
  const activePlan = selectedPlan && summary.some((item) => item.name === selectedPlan) ? selectedPlan : leader?.name || ''
  const planRows = useMemo(() => rows.filter((row) => (row.plan || 'SIN PLAN') === activePlan), [rows, activePlan])
  const kpis = useMemo(() => buildRetirosKpis(rows), [rows])
  const monthly = useMemo(() => buildRetirosMonthly(planRows, { from, to }), [planRows, from, to])
  const channelRanking = useMemo(() => buildChannelDimension(rows, 'plan', { limit: 10 }), [rows])
  const causes = useMemo(() => buildCausalSummary(planRows).slice(0, 7), [planRows])
  const advisors = useMemo(() => groupRetirosCounted(planRows, 'asesor', { limit: 8 }), [planRows])
  const locations = useMemo(() => groupRetirosCounted(planRows.map((row) => ({ ...row, sede_subuen: `${row.sede} · ${row.subuen}` })), 'sede_subuen', { limit: 8 }), [planRows])
  const filteredTable = useMemo(() => ranked.filter((item) => normalizeText(`${item.codigo} ${item.name}`).includes(normalizeText(search))), [ranked, search])
  const pages = Math.max(1, Math.ceil(filteredTable.length / PAGE_SIZE))
  const tableRows = filteredTable.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const topContracts = [...summary].sort((a, b) => b.contratos - a.contratos)[0]
  const unnamed = summary.find((item) => item.name === 'SIN PLAN')?.total || 0
  useEffect(() => setPage(1), [search, sort])
  useEffect(() => { if (page > pages) setPage(pages) }, [page, pages])

  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <KpiCard title="Planes con retiros" value={number(summary.length)} helper={`${number(unnamed)} retiros sin plan identificado.`} icon={<ClipboardList className="size-6" />} accent="blue" />
      <KpiCard title="Total de retiros" value={number(kpis.total)} helper={leader ? `Mayor participación: ${leader.name}.` : 'Sin retiros.'} icon={<Sigma className="size-6" />} accent="rose" />
      <KpiCard title="Contratos retirados" value={number(kpis.contratos)} helper={topContracts ? `Mayor cantidad: ${topContracts.name}.` : 'Sin contratos.'} icon={<ClipboardX className="size-6" />} accent="emerald" />
      <KpiCard title="Adicionales personas" value={number(kpis.adicionales)} helper="Registros A y M." icon={<UserMinus className="size-6" />} accent="orange" />
      <KpiCard title="Adicionales mascotas" value={number(kpis.mascotas)} helper="Registros P y D." icon={<PawPrint className="size-6" />} accent="violet" />
    </div>

    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <ChartCard title="Ranking de planes" subtitle="Top 12 según el indicador seleccionado." accent="rose"><div className="mb-3 flex justify-end"><select value={sort} onChange={(event) => setSort(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black"><option value="total">Total retiros</option><option value="contratos">Contratos</option><option value="adicionales">Adicionales personas</option><option value="mascotas">Adicionales mascotas</option></select></div><SimpleBars data={ranked.slice(0, 12).map((item) => ({ name: item.name, cantidad: item[sort] }))} height="h-96" onSelect={setSelectedPlan} /></ChartCard>
      <ChartCard title="Canales por plan" subtitle="Top 10 planes con composición apilada." accent="blue"><div className="h-[27rem]"><ResponsiveContainer width="100%" height="100%"><BarChart data={channelRanking} layout="vertical"><CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 9 }} /><Tooltip content={<CustomTooltip />} />{series.map(([key, label, color]) => <Bar key={key} dataKey={key} name={label} stackId="plan" fill={color} />)}</BarChart></ResponsiveContainer></div></ChartCard>
    </div>

    <ChartCard title={`Evolución mensual · ${activePlan}`} subtitle="Total, contratos, adicionales personas y adicionales mascotas por fecha de retiro." accent="violet"><div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthly}><CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="key" tickFormatter={(key) => monthLabel(`${key}-01`)} /><YAxis allowDecimals={false} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="contratos" name="Contratos" fill="#0f766e" /><Bar dataKey="adicionales" name="Adicionales personas" fill="#ea580c" /><Bar dataKey="mascotas" name="Adicionales mascotas" fill="#7c3aed" /><Bar dataKey="total" name="Total" fill="#be123c" radius={[7, 7, 0, 0]} /></BarChart></ResponsiveContainer></div></ChartCard>

    <div className="grid gap-6 xl:grid-cols-3"><ChartCard title={`Causales · ${activePlan}`} subtitle="Principales motivos del plan." accent="rose"><SimpleBars data={causes} /></ChartCard><ChartCard title={`Sede y SubUEN · ${activePlan}`} subtitle="Top 8 ubicaciones." accent="emerald"><SimpleBars data={locations} color="#0f766e" /></ChartCard><ChartCard title={`Asesores · ${activePlan}`} subtitle="Top 8 responsables comerciales." accent="orange"><SimpleBars data={advisors} color="#ea580c" /></ChartCard></div>
    <PlanTable rows={tableRows} selected={activePlan} onSelect={setSelectedPlan} search={search} setSearch={setSearch} sort={sort} setSort={setSort} page={page} setPage={setPage} pages={pages} total={filteredTable.length} />
    <PlanDetail rows={planRows} plan={activePlan} />
  </div>
}

function SimpleBars({ data, color = '#be123c', height = 'h-72', onSelect }) { return <div className={height}><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical"><CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 9 }} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="cantidad" name="Retiros" fill={color} radius={[0, 8, 8, 0]} onClick={(entry) => onSelect?.(entry?.name || entry?.payload?.name || '')} /></BarChart></ResponsiveContainer></div> }
function PlanTable({ rows, selected, onSelect, search, setSearch, sort, setSort, page, setPage, pages, total }) { return <ChartCard title="Tabla consolidada de planes" subtitle={`${number(total)} planes bajo los filtros aplicados; valores exactos sin unificar nombres similares.`}><div className="mb-4 flex flex-wrap gap-3"><label className="relative min-w-64 flex-1"><Search className="absolute left-3 top-3 size-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nombre o código…" className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm font-bold" /></label><select value={sort} onChange={(event) => setSort(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold"><option value="total">Total retiros</option><option value="contratos">Contratos</option><option value="adicionales">Adicionales personas</option><option value="mascotas">Adicionales mascotas</option></select></div><div className="overflow-x-auto"><table className="min-w-full whitespace-nowrap text-left text-sm"><thead><tr className="border-b text-[11px] uppercase tracking-[.1em] text-slate-400">{['Plan', 'Código', 'Total', 'Contratos', 'Empresariales', 'Independientes', 'Adicionales personas', 'Adicionales mascotas', '% participación', 'Principal causal'].map((head) => <th key={head} className="px-3 py-3">{head}</th>)}</tr></thead><tbody>{rows.map((item) => <tr key={item.name} onClick={() => onSelect(item.name)} className={`cursor-pointer border-b border-slate-100 hover:bg-rose-50 ${selected === item.name ? 'bg-rose-50' : ''}`}><td className="px-3 py-3 font-black">{item.name}</td><td className="px-3 py-3">{item.codigo || '—'}</td><td className="px-3 py-3 font-black">{number(item.total)}</td><td className="px-3 py-3">{number(item.contratos)}</td><td className="px-3 py-3">{number(item.empresariales)}</td><td className="px-3 py-3">{number(item.independientes)}</td><td className="px-3 py-3">{number(item.adicionales)}</td><td className="px-3 py-3">{number(item.mascotas)}</td><td className="px-3 py-3">{percent(item.porcentaje)}</td><td className="px-3 py-3">{item.principalCausal}</td></tr>)}</tbody></table></div><div className="mt-4 flex items-center justify-end gap-3"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-lg border px-3 py-1.5 text-xs font-black disabled:opacity-40">Anterior</button><span className="text-xs font-bold text-slate-500">Página {page} de {pages}</span><button type="button" disabled={page >= pages} onClick={() => setPage((current) => current + 1)} className="rounded-lg border px-3 py-1.5 text-xs font-black disabled:opacity-40">Siguiente</button></div></ChartCard> }
function PlanDetail({ rows, plan }) { return <ChartCard title="Detalle del plan" subtitle={`${plan} · ${number(buildRetirosKpis(rows).total)} retiros; se muestran hasta 200 registros.`} accent="slate"><div className="overflow-x-auto"><table className="min-w-full whitespace-nowrap text-left text-sm"><thead><tr className="border-b text-[11px] uppercase tracking-[.1em] text-slate-400">{['Contrato', 'Identificación / nombre', 'Canal', 'Tipo', 'Convenio', 'Asesor', 'Sede / SubUEN', 'Ingreso', 'Retiro', 'Vigencia', 'Estado', 'Causal'].map((head) => <th key={head} className="px-3 py-3">{head}</th>)}</tr></thead><tbody>{rows.slice(0, 200).map((row) => <tr key={row.id} className="border-b border-slate-100"><td className="px-3 py-3 font-black">{row.contrato}</td><td className="px-3 py-3"><p className="font-bold">{row.nombre}</p><p className="text-xs text-slate-500">{row.documento}</p></td><td className="px-3 py-3">{row.canal}</td><td className="px-3 py-3">{row.tipo_retiro}</td><td className="px-3 py-3">{row.entidad}</td><td className="px-3 py-3">{row.asesor}</td><td className="px-3 py-3"><p>{row.sede}</p><p className="text-xs text-slate-500">{row.subuen}</p></td><td className="px-3 py-3">{String(row.fecha_ingreso || '').slice(0, 10) || '—'}</td><td className="px-3 py-3">{row.fecha}</td><td className="px-3 py-3">{number(row.meses_vigencia)} meses</td><td className="px-3 py-3">{row.estado_contrato}</td><td className="px-3 py-3">{row.causal_retiro}</td></tr>)}</tbody></table></div></ChartCard> }
