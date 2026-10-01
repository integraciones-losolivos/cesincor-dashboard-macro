import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ClipboardX, PawPrint, Search, Sigma, UserMinus, UsersRound } from 'lucide-react'
import ChartCard from '../ChartCard.jsx'
import CustomTooltip from '../CustomTooltip.jsx'
import KpiCard from '../KpiCard.jsx'
import { monthLabel, normalizeText, number, percent } from '../../utils/dashboard.js'
import { buildAdvisorSummary, buildCausalSummary, buildChannelDimension, buildRetirosKpis, buildRetirosMonthly, groupRetirosCounted } from '../../utils/retiros.js'

const series = [
  ['empresariales', 'Empresariales', '#0f766e'], ['independientes', 'Independientes', '#2563eb'],
  ['adicionales_personas', 'Adicionales personas', '#ea580c'], ['adicionales_mascotas', 'Adicionales mascotas', '#7c3aed'],
]

export default function RetirosAdvisors({ rows, from, to }) {
  const [selectedAdvisor, setSelectedAdvisor] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('total')
  const summary = useMemo(() => buildAdvisorSummary(rows), [rows])
  const ranked = useMemo(() => [...summary].sort((a, b) => b[sort] - a[sort] || a.name.localeCompare(b.name)), [summary, sort])
  const leader = ranked[0]
  const activeAdvisor = selectedAdvisor && summary.some((item) => item.name === selectedAdvisor) ? selectedAdvisor : leader?.name || ''
  const advisorRows = useMemo(() => rows.filter((row) => (row.asesor || 'SIN ASESOR') === activeAdvisor), [rows, activeAdvisor])
  const kpis = useMemo(() => buildRetirosKpis(rows), [rows])
  const advisorMonthly = useMemo(() => buildRetirosMonthly(advisorRows, { from, to }), [advisorRows, from, to])
  const channelRanking = useMemo(() => buildChannelDimension(rows, 'asesor', { limit: 10 }), [rows])
  const causes = useMemo(() => buildCausalSummary(advisorRows).slice(0, 7), [advisorRows])
  const plans = useMemo(() => groupRetirosCounted(advisorRows, 'plan', { limit: 7 }), [advisorRows])
  const entities = useMemo(() => groupRetirosCounted(advisorRows, 'entidad', { limit: 7 }), [advisorRows])
  const locations = useMemo(() => groupRetirosCounted(advisorRows.map((row) => ({ ...row, sede_subuen: `${row.sede} · ${row.subuen}` })), 'sede_subuen', { limit: 8 }), [advisorRows])
  const tableRows = useMemo(() => ranked.filter((item) => normalizeText(item.name).includes(normalizeText(search))), [ranked, search])
  const topContracts = [...summary].sort((a, b) => b.contratos - a.contratos)[0]
  const unnamed = summary.find((item) => item.name === 'SIN ASESOR')?.total || 0

  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <KpiCard title="Asesores con retiros" value={number(summary.length)} helper={`${number(unnamed)} retiros sin asesor identificado.`} icon={<UsersRound className="size-6" />} accent="blue" />
      <KpiCard title="Total de retiros" value={number(kpis.total)} helper={leader ? `Mayor volumen: ${leader.name}.` : 'Sin retiros.'} icon={<Sigma className="size-6" />} accent="rose" />
      <KpiCard title="Contratos retirados" value={number(kpis.contratos)} helper={topContracts ? `Mayor cantidad: ${topContracts.name}.` : 'Sin contratos.'} icon={<ClipboardX className="size-6" />} accent="emerald" />
      <KpiCard title="Adicionales personas" value={number(kpis.adicionales)} helper="Registros A y M." icon={<UserMinus className="size-6" />} accent="orange" />
      <KpiCard title="Adicionales mascotas" value={number(kpis.mascotas)} helper="Registros P y D." icon={<PawPrint className="size-6" />} accent="violet" />
    </div>

    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <ChartCard title="Ranking de asesores" subtitle="Ordena por el indicador que deseas comparar y selecciona una barra." accent="rose"><div className="mb-3 flex justify-end"><select value={sort} onChange={(event) => setSort(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black"><option value="total">Total retiros</option><option value="contratos">Contratos</option><option value="adicionales">Adicionales personas</option><option value="mascotas">Adicionales mascotas</option></select></div><SimpleBars data={ranked.slice(0, 12).map((item) => ({ name: item.name, cantidad: item[sort] }))} height="h-96" onSelect={setSelectedAdvisor} /></ChartCard>
      <ChartCard title="Canales por asesor" subtitle="Top 10 asesores con composición apilada por canal." accent="blue"><div className="h-[27rem]"><ResponsiveContainer width="100%" height="100%"><BarChart data={channelRanking} layout="vertical"><CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={145} tick={{ fontSize: 10 }} /><Tooltip content={<CustomTooltip />} />{series.map(([key, label, color]) => <Bar key={key} dataKey={key} name={label} stackId="advisor" fill={color} />)}</BarChart></ResponsiveContainer></div></ChartCard>
    </div>

    <ChartCard title={`Evolución mensual · ${activeAdvisor}`} subtitle="Total, contratos, adicionales personas y adicionales mascotas por fecha de retiro." accent="violet"><div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={advisorMonthly}><CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="key" tickFormatter={(key) => monthLabel(`${key}-01`)} /><YAxis allowDecimals={false} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="contratos" name="Contratos" fill="#0f766e" /><Bar dataKey="adicionales" name="Adicionales personas" fill="#ea580c" /><Bar dataKey="mascotas" name="Adicionales mascotas" fill="#7c3aed" /><Bar dataKey="total" name="Total" fill="#be123c" radius={[7, 7, 0, 0]} /></BarChart></ResponsiveContainer></div></ChartCard>

    <div className="grid gap-6 xl:grid-cols-3"><ChartCard title={`Causales · ${activeAdvisor}`} subtitle="Principales motivos y participación." accent="rose"><SimpleBars data={causes} /></ChartCard><ChartCard title={`Planes · ${activeAdvisor}`} subtitle="Top 7 planes con retiros." accent="blue"><SimpleBars data={plans} color="#2563eb" /></ChartCard><ChartCard title={`Convenios · ${activeAdvisor}`} subtitle="Top 7 entidades asociadas." accent="orange"><SimpleBars data={entities} color="#ea580c" /></ChartCard></div>
    <ChartCard title={`Distribución por sede y SubUEN · ${activeAdvisor}`} subtitle="Top 8 ubicaciones del portafolio retirado." accent="emerald"><SimpleBars data={locations} color="#0f766e" /></ChartCard>
    <AdvisorTable rows={tableRows} selected={activeAdvisor} onSelect={setSelectedAdvisor} search={search} setSearch={setSearch} sort={sort} setSort={setSort} />
    <AdvisorDetail rows={advisorRows} advisor={activeAdvisor} />
  </div>
}

function SimpleBars({ data, color = '#be123c', height = 'h-72', onSelect }) { return <div className={height}><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical"><CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={145} tick={{ fontSize: 10 }} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="cantidad" name="Retiros" fill={color} radius={[0, 8, 8, 0]} onClick={(entry) => onSelect?.(entry?.name || entry?.payload?.name || '')} /></BarChart></ResponsiveContainer></div> }
function AdvisorTable({ rows, selected, onSelect, search, setSearch, sort, setSort }) { return <ChartCard title="Tabla consolidada de asesores" subtitle="Búsqueda, ordenamiento y selección sin unificar nombres similares."><div className="mb-4 flex flex-wrap gap-3"><label className="relative min-w-64 flex-1"><Search className="absolute left-3 top-3 size-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar asesor…" className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm font-bold" /></label><select value={sort} onChange={(event) => setSort(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold"><option value="total">Total retiros</option><option value="contratos">Contratos</option><option value="adicionales">Adicionales personas</option><option value="mascotas">Adicionales mascotas</option></select></div><div className="overflow-x-auto"><table className="min-w-full whitespace-nowrap text-left text-sm"><thead><tr className="border-b text-[11px] uppercase tracking-[.1em] text-slate-400">{['Asesor', 'Total', 'Contratos', 'Empresariales', 'Independientes', 'Adicionales personas', 'Adicionales mascotas', '% participación', 'Principal causal'].map((head) => <th key={head} className="px-3 py-3">{head}</th>)}</tr></thead><tbody>{rows.map((item) => <tr key={item.name} onClick={() => onSelect(item.name)} className={`cursor-pointer border-b border-slate-100 hover:bg-rose-50 ${selected === item.name ? 'bg-rose-50' : ''}`}><td className="px-3 py-3 font-black">{item.name}</td><td className="px-3 py-3 font-black">{number(item.total)}</td><td className="px-3 py-3">{number(item.contratos)}</td><td className="px-3 py-3">{number(item.empresariales)}</td><td className="px-3 py-3">{number(item.independientes)}</td><td className="px-3 py-3">{number(item.adicionales)}</td><td className="px-3 py-3">{number(item.mascotas)}</td><td className="px-3 py-3">{percent(item.porcentaje)}</td><td className="px-3 py-3">{item.principalCausal}</td></tr>)}</tbody></table></div></ChartCard> }
function AdvisorDetail({ rows, advisor }) { return <ChartCard title="Detalle del asesor" subtitle={`${advisor} · ${number(buildRetirosKpis(rows).total)} retiros; se muestran hasta 200 registros.`} accent="slate"><div className="overflow-x-auto"><table className="min-w-full whitespace-nowrap text-left text-sm"><thead><tr className="border-b text-[11px] uppercase tracking-[.1em] text-slate-400">{['Contrato', 'Identificación / nombre', 'Canal', 'Tipo', 'Convenio', 'Plan', 'Sede / SubUEN', 'Ingreso', 'Retiro', 'Vigencia', 'Estado', 'Causal'].map((head) => <th key={head} className="px-3 py-3">{head}</th>)}</tr></thead><tbody>{rows.slice(0, 200).map((row) => <tr key={row.id} className="border-b border-slate-100"><td className="px-3 py-3 font-black">{row.contrato}</td><td className="px-3 py-3"><p className="font-bold">{row.nombre}</p><p className="text-xs text-slate-500">{row.documento}</p></td><td className="px-3 py-3">{row.canal}</td><td className="px-3 py-3">{row.tipo_retiro}</td><td className="px-3 py-3">{row.entidad}</td><td className="px-3 py-3">{row.plan}</td><td className="px-3 py-3"><p>{row.sede}</p><p className="text-xs text-slate-500">{row.subuen}</p></td><td className="px-3 py-3">{String(row.fecha_ingreso || '').slice(0, 10) || '—'}</td><td className="px-3 py-3">{row.fecha}</td><td className="px-3 py-3">{number(row.meses_vigencia)} meses</td><td className="px-3 py-3">{row.estado_contrato}</td><td className="px-3 py-3">{row.causal_retiro}</td></tr>)}</tbody></table></div></ChartCard> }
