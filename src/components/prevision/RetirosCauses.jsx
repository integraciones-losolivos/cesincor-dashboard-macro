import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, Cell, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CircleAlert, ListChecks, Search, Sigma, Trophy } from 'lucide-react'
import ChartCard from '../ChartCard.jsx'
import CustomTooltip from '../CustomTooltip.jsx'
import KpiCard from '../KpiCard.jsx'
import { RankingList } from './ExecutiveViz.jsx'
import { monthLabel, normalizeText, number, percent } from '../../utils/dashboard.js'
import { buildCausalMonthly, buildCausalSummary, buildRetirosKpis } from '../../utils/retiros.js'

const NO_CAUSE = 'SIN CAUSAL IDENTIFICADA'
const causeChannels = ['EMPRESARIALES', 'INDEPENDIENTES', 'SIN CLASIFICAR']

export default function RetirosCauses({ rows, onOpenDetail }) {
  const [selectedCause, setSelectedCause] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('cantidad')
  const summary = useMemo(() => buildCausalSummary(rows), [rows])
  const kpis = useMemo(() => buildRetirosKpis(rows), [rows])
  const missing = summary.find((item) => item.name === NO_CAUSE)?.cantidad || 0
  const identified = summary.filter((item) => item.name !== NO_CAUSE)
  const leader = identified[0]
  const activeCause = selectedCause && summary.some((item) => item.name === selectedCause) ? selectedCause : leader?.name || summary[0]?.name || ''
  const causeRows = useMemo(() => activeCause ? rows.filter((row) => row.causal_retiro === activeCause) : rows, [rows, activeCause])
  const monthly = useMemo(() => buildCausalMonthly(rows, activeCause), [rows, activeCause])
  const tableRows = useMemo(() => summary.filter((item) => normalizeText(item.name).includes(normalizeText(search))).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : b.cantidad - a.cantidad), [summary, search, sort])
  const channelLeaders = useMemo(() => causeChannels.map((channel) => {
    const first = buildCausalSummary(rows.filter((row) => row.canal === channel))[0]
    return { channel, cause: first?.name || 'SIN DATOS', cantidad: first?.cantidad || 0, porcentaje: first?.porcentaje || 0 }
  }), [rows])
  useEffect(() => { if (selectedCause && !summary.some((item) => item.name === selectedCause)) setSelectedCause('') }, [selectedCause, summary])

  return <div className="space-y-6">
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950"><b>Calidad de información:</b> la causal se obtiene de la última novedad de cancelación parametrizada. Los retiros individuales de personas o mascotas en contratos activos no tienen un campo causal confiable y se muestran como “Sin causal identificada”.</div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard title="Total de retiros" value={number(kpis.total)} helper="Según las reglas de conteo del módulo." icon={<Sigma className="size-6" />} accent="rose" />
      <KpiCard title="Causales identificadas" value={number(identified.length)} helper="Motivos parametrizados distintos." icon={<ListChecks className="size-6" />} accent="blue" />
      <KpiCard title="Sin causal identificada" value={number(missing)} helper={`${percent(kpis.total ? missing / kpis.total : 0)} del total filtrado.`} icon={<CircleAlert className="size-6" />} accent="orange" />
      <KpiCard title="Principal causal" value={leader ? number(leader.cantidad) : '—'} helper={leader ? `${leader.name} · ${percent(leader.porcentaje)}` : 'Sin causal parametrizada.'} icon={<Trophy className="size-6" />} accent="violet" />
    </div>

    <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <ChartCard title="Principales causales de retiro" subtitle="Participación y ranking; selecciona una causal para ver su evolución." accent="violet"><div className="grid gap-3 md:grid-cols-[.65fr_1.35fr]"><div className="h-52"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={summary.slice(0, 6)} dataKey="cantidad" nameKey="name" innerRadius={48} outerRadius={76} paddingAngle={2}>{summary.slice(0, 6).map((item, index) => <Cell key={item.name} fill={['#475569','#6366f1','#8b5cf6','#14b8a6','#f59e0b','#94a3b8'][index]} />)}</Pie><Tooltip content={<CustomTooltip />} /></PieChart></ResponsiveContainer></div><RankingList data={summary} color="#6366f1" limit={8} onSelect={setSelectedCause} /></div></ChartCard>
      <ChartCard title="Principal causal por canal" subtitle="La participación se calcula dentro de cada canal." accent="orange"><div className="space-y-3">{channelLeaders.map((item) => <button key={item.channel} type="button" onClick={() => item.cause !== 'SIN DATOS' && setSelectedCause(item.cause)} className="block w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left transition hover:border-rose-200 hover:bg-rose-50"><p className="text-[11px] font-black uppercase tracking-[.14em] text-slate-500">{item.channel}</p><div className="mt-1 flex items-end justify-between gap-3"><p className="font-black text-slate-900">{item.cause}</p><p className="shrink-0 text-sm font-black text-rose-700">{number(item.cantidad)} · {percent(item.porcentaje)}</p></div></button>)}</div></ChartCard>
    </div>

    <ChartCard title="Evolución de la causal" subtitle={activeCause || 'Selecciona una causal.'} accent="blue"><div className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthly}><defs><linearGradient id="causeArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} /><stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="key" tickFormatter={(key) => monthLabel(`${key}-01`)} /><YAxis allowDecimals={false} /><Tooltip content={<CustomTooltip />} /><Area type="monotone" dataKey="total" name="Retiros" stroke="#2563eb" strokeWidth={3} fill="url(#causeArea)" /></AreaChart></ResponsiveContainer></div></ChartCard>

    <ChartCard title="Tabla de causales" subtitle="Busca, ordena y selecciona una causal para consultar sus registros."><div className="mb-4 flex flex-wrap gap-3"><label className="relative min-w-64 flex-1"><Search className="absolute left-3 top-3 size-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar causal…" className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm font-bold" /></label><select value={sort} onChange={(event) => setSort(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold"><option value="cantidad">Mayor cantidad</option><option value="name">Nombre de causal</option></select></div><div className="overflow-x-auto"><table className="min-w-full whitespace-nowrap text-left text-sm"><thead><tr className="border-b text-[11px] uppercase tracking-[.1em] text-slate-400">{['Causal', 'Cantidad', '% participación', 'Contratos', 'Adicionales personas', 'Adicionales mascotas', 'Empresariales', 'Independientes'].map((head) => <th key={head} className="px-3 py-3">{head}</th>)}</tr></thead><tbody>{tableRows.map((item) => <tr key={item.name} onClick={() => setSelectedCause(item.name)} className={`cursor-pointer border-b border-slate-100 hover:bg-rose-50 ${activeCause === item.name ? 'bg-rose-50' : ''}`}><td className="px-3 py-3 font-black">{item.name}</td><td className="px-3 py-3 font-black">{number(item.cantidad)}</td><td className="px-3 py-3">{percent(item.porcentaje)}</td><td className="px-3 py-3">{number(item.contratos)}</td><td className="px-3 py-3">{number(item.adicionales)}</td><td className="px-3 py-3">{number(item.mascotas)}</td><td className="px-3 py-3">{number(item.empresariales)}</td><td className="px-3 py-3">{number(item.independientes)}</td></tr>)}</tbody></table></div></ChartCard>
    <div className="flex justify-end"><button type="button" onClick={() => onOpenDetail?.({ causal: activeCause })} className="rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-black text-white">Ver detalle filtrado</button></div>
    <CauseDetail rows={causeRows} cause={activeCause} />
  </div>
}

function CauseDetail({ rows, cause }) {
  return <ChartCard title="Detalle de la causal" subtitle={`${cause || 'Sin selección'} · ${number(rows.length)} registros; se muestran hasta 200.`} accent="slate"><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b text-[11px] uppercase tracking-[.1em] text-slate-400">{['Contrato', 'Identificación / nombre', 'Canal', 'Tipo', 'Causal', 'Comentario de bitácora', 'Estado', 'Plan', 'Entidad', 'Asesor', 'Sede', 'Fecha retiro', 'Fecha novedad', 'Registro bitácora', 'Vigencia'].map((head) => <th key={head} className="whitespace-nowrap px-3 py-3">{head}</th>)}</tr></thead><tbody>{rows.slice(0, 200).map((row) => <tr key={row.id} className="border-b border-slate-100"><td className="whitespace-nowrap px-3 py-3 font-black">{row.contrato}</td><td className="whitespace-nowrap px-3 py-3"><p className="font-bold">{row.nombre}</p><p className="text-xs text-slate-500">{row.documento}</p></td><td className="whitespace-nowrap px-3 py-3">{row.canal}</td><td className="whitespace-nowrap px-3 py-3">{row.tipo_retiro}</td><td className="whitespace-nowrap px-3 py-3 font-bold">{row.causal_retiro}</td><td className="min-w-80 max-w-xl px-3 py-3 text-xs leading-5 text-slate-600">{row.detalle_causal || 'Sin comentario de novedad'}</td><td className="whitespace-nowrap px-3 py-3">{row.estado_contrato}</td><td className="whitespace-nowrap px-3 py-3">{row.plan}</td><td className="whitespace-nowrap px-3 py-3">{row.entidad}</td><td className="whitespace-nowrap px-3 py-3">{row.asesor}</td><td className="whitespace-nowrap px-3 py-3">{row.sede}</td><td className="whitespace-nowrap px-3 py-3">{row.fecha}</td><td className="whitespace-nowrap px-3 py-3">{formatDate(row.fecha_novedad)}</td><td className="whitespace-nowrap px-3 py-3">{formatDate(row.fecha_registro_novedad)}</td><td className="whitespace-nowrap px-3 py-3">{number(row.meses_vigencia)} meses</td></tr>)}</tbody></table></div></ChartCard>
}

function formatDate(value) { return value ? String(value).slice(0, 10) : '—' }
