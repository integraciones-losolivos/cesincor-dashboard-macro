import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Building2, PawPrint, Sigma, UserMinus, UsersRound } from 'lucide-react'
import ChartCard from '../ChartCard.jsx'
import CustomTooltip from '../CustomTooltip.jsx'
import KpiCard from '../KpiCard.jsx'
import { ShareStrip } from './ExecutiveViz.jsx'
import { monthLabel, number, percent } from '../../utils/dashboard.js'
import { buildCausalSummary, buildChannelDimension, buildChannelSummary, buildRetirosKpis, buildRetirosMonthly, groupRetiros, RETIRO_CHANNELS } from '../../utils/retiros.js'

const channelConfig = [
  { name: 'EMPRESARIALES', monthly: 'empresariales', dataKey: 'empresariales', label: 'Empresariales', color: '#0f766e' },
  { name: 'INDEPENDIENTES', monthly: 'independientes', dataKey: 'independientes', label: 'Independientes', color: '#2563eb' },
  { name: 'SIN CLASIFICAR', monthly: 'sinClasificar', dataKey: 'sin_clasificar', label: 'Sin clasificar', color: '#64748b' },
]

export default function RetirosChannels({ rows, from, to, onOpenDetail }) {
  const summary = useMemo(() => buildChannelSummary(rows), [rows])
  const total = useMemo(() => buildRetirosKpis(rows).total, [rows])
  const leader = summary.reduce((best, item) => !best || item.cantidad > best.cantidad ? item : best, null)
  const [selectedChannel, setSelectedChannel] = useState('')
  const [visibleChannels, setVisibleChannels] = useState(() => new Set(RETIRO_CHANNELS))
  const [dimension, setDimension] = useState('plan')
  const activeChannel = selectedChannel && summary.some((item) => item.name === selectedChannel) ? selectedChannel : leader?.name || RETIRO_CHANNELS[0]
  const channelRows = useMemo(() => rows.filter((row) => row.canal === activeChannel), [rows, activeChannel])
  const monthly = useMemo(() => buildRetirosMonthly(rows, { from, to }), [rows, from, to])
  const bySede = useMemo(() => buildChannelDimension(rows, 'sede', { limit: 8 }), [rows])
  const byPlan = useMemo(() => buildChannelDimension(channelRows, 'plan', { limit: 8 }), [channelRows])
  const byAdvisor = useMemo(() => buildChannelDimension(channelRows, 'asesor', { limit: 8 }), [channelRows])
  const causes = useMemo(() => buildCausalSummary(channelRows).slice(0, 6), [channelRows])
  const internalKey = dimension
  const internal = useMemo(() => groupRetiros(channelRows, internalKey, { limit: 8 }), [channelRows, internalKey])
  const toggle = (channel) => setVisibleChannels((current) => { const next = new Set(current); if (next.has(channel)) next.delete(channel); else next.add(channel); return next })

  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <KpiCard title="Retiros empresariales" value={number(summary[0]?.cantidad)} helper={`${percent(summary[0]?.porcentaje)} del total.`} icon={<Building2 className="size-6" />} accent="emerald" />
      <KpiCard title="Retiros independientes" value={number(summary[1]?.cantidad)} helper={`${percent(summary[1]?.porcentaje)} del total.`} icon={<UsersRound className="size-6" />} accent="blue" />
      <KpiCard title="Sin canal clasificado" value={number(summary[2]?.cantidad)} helper="Convenios sin UEN1/UEN2." icon={<Sigma className="size-6" />} accent="slate" />
      <KpiCard title="Adicionales personas" value={number(buildRetirosKpis(rows).adicionales)} helper="Tipo de retiro, no canal." icon={<UserMinus className="size-6" />} accent="orange" />
      <KpiCard title="Adicionales mascotas" value={number(buildRetirosKpis(rows).mascotas)} helper="Tipo de retiro, no canal." icon={<PawPrint className="size-6" />} accent="violet" />
    </div>

    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <ChartCard title="Participación por canal" subtitle="La barra 100% permite comparar el peso relativo sin repetir cuatro barras." accent="violet"><ShareStrip data={summary} colors={channelConfig.map((item) => item.color)} /><div className="mt-4 grid grid-cols-2 gap-2">{summary.map((item) => <button key={item.name} onClick={() => setSelectedChannel(item.name)} className="rounded-xl border border-slate-100 px-3 py-2 text-left text-[11px] font-black text-slate-600 transition hover:bg-slate-50">Analizar {item.name.toLowerCase()}</button>)}</div></ChartCard>
      <ChartCard title="Evolución mensual por canal" subtitle="Activa o desactiva canales para facilitar la comparación." accent="blue"><div className="mb-4 flex flex-wrap gap-2">{channelConfig.map((item) => <button key={item.name} type="button" onClick={() => toggle(item.name)} className={`rounded-full border px-3 py-1.5 text-xs font-black ${visibleChannels.has(item.name) ? 'text-white' : 'border-slate-200 text-slate-400'}`} style={visibleChannels.has(item.name) ? { backgroundColor: item.color, borderColor: item.color } : undefined}>{item.label}</button>)}</div><div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={monthly}><CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="key" tickFormatter={(key) => monthLabel(`${key}-01`)} /><YAxis allowDecimals={false} /><Tooltip content={<CustomTooltip />} />{channelConfig.filter((item) => visibleChannels.has(item.name)).map((item) => <Line key={item.name} type="monotone" dataKey={item.monthly} name={item.label} stroke={item.color} strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} />)}</LineChart></ResponsiveContainer></div></ChartCard>
    </div>

    <div className="grid gap-6 xl:grid-cols-2">
      <ChartCard title="Composición por sede y canal" subtitle="Top 8 sedes; barras apiladas por población." accent="orange"><StackedBars data={bySede} /></ChartCard>
      <ChartCard title={`Composición interna · ${activeChannel}`} subtitle="Selecciona un canal en el comparativo para actualizar esta sección." accent="violet"><div className="mb-3 flex flex-wrap items-center justify-between gap-2">{!activeChannel.startsWith('ADICIONALES') && <select value={dimension} onChange={(event) => setDimension(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black"><option value="plan">Plan</option><option value="sede">Sede</option><option value="asesor">Asesor</option><option value="entidad">Convenio</option></select>}<span className="text-xs font-bold text-slate-500">{number(channelRows.length)} filas fuente</span></div><SimpleBars data={internal} color="#7c3aed" /></ChartCard>
    </div>

    <div className="grid gap-6 xl:grid-cols-3"><ChartCard title={`Planes · ${activeChannel}`} subtitle="Top 8 dentro del canal." accent="blue"><DimensionBars data={byPlan} channel={activeChannel} /></ChartCard><ChartCard title={`Asesores · ${activeChannel}`} subtitle="Comparativo Top 8." accent="orange"><DimensionBars data={byAdvisor} channel={activeChannel} /></ChartCard><ChartCard title={`Causales · ${activeChannel}`} subtitle="Principales motivos disponibles." accent="rose"><SimpleBars data={causes} /></ChartCard></div>
    <ChannelTable summary={summary} selected={activeChannel} onSelect={setSelectedChannel} />
    <div className="flex justify-end"><button type="button" onClick={() => onOpenDetail?.({ canal: activeChannel })} className="rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-black text-white">Ver detalle filtrado</button></div>
    <ChannelDetail rows={channelRows} channel={activeChannel} />
  </div>
}

function StackedBars({ data }) { return <div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} /><Tooltip content={<CustomTooltip />} />{channelConfig.map((item) => <Bar key={item.name} dataKey={item.dataKey} name={item.label} stackId="channel" fill={item.color} />)}</BarChart></ResponsiveContainer></div> }
function SimpleBars({ data, color = '#be123c' }) { return <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical"><CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="cantidad" name="Retiros" fill={color} radius={[0, 8, 8, 0]} /></BarChart></ResponsiveContainer></div> }
function DimensionBars({ data, channel }) { const config = channelConfig.find((item) => item.name === channel) || channelConfig[0]; return <SimpleBars data={data.map((item) => ({ name: item.name, cantidad: item[config.dataKey] || 0 }))} color={config.color} /> }
function ChannelTable({ summary, selected, onSelect }) { return <ChartCard title="Tabla consolidada por canal" subtitle="Selecciona una fila para actualizar el análisis y detalle."><div className="overflow-x-auto"><table className="min-w-full whitespace-nowrap text-left text-sm"><thead><tr className="border-b text-[11px] uppercase tracking-[.1em] text-slate-400">{['Canal', 'Total retiros', '% participación', 'Contratos', 'Adicionales personas', 'Adicionales mascotas', 'Principales planes', 'Principales sedes'].map((head) => <th key={head} className="px-3 py-3">{head}</th>)}</tr></thead><tbody>{summary.map((item) => <tr key={item.name} onClick={() => onSelect(item.name)} className={`cursor-pointer border-b border-slate-100 hover:bg-rose-50 ${selected === item.name ? 'bg-rose-50' : ''}`}><td className="px-3 py-3 font-black">{item.name}</td><td className="px-3 py-3 font-black">{number(item.cantidad)}</td><td className="px-3 py-3">{percent(item.porcentaje)}</td><td className="px-3 py-3">{number(item.contratos)}</td><td className="px-3 py-3">{number(item.adicionales)}</td><td className="px-3 py-3">{number(item.mascotas)}</td><td className="px-3 py-3">{item.planes.map((entry) => entry.name).join(', ') || '—'}</td><td className="px-3 py-3">{item.sedes.map((entry) => entry.name).join(', ') || '—'}</td></tr>)}</tbody></table></div></ChartCard> }
function ChannelDetail({ rows, channel }) { return <ChartCard title="Detalle del canal" subtitle={`${channel} · ${number(rows.length)} registros fuente; se muestran hasta 200.`} accent="slate"><div className="overflow-x-auto"><table className="min-w-full whitespace-nowrap text-left text-sm"><thead><tr className="border-b text-[11px] uppercase tracking-[.1em] text-slate-400">{['Contrato', 'Identificación / nombre', 'Tipo', 'Canal', 'Plan', 'Convenio', 'Asesor', 'Sede / SubUEN', 'Ingreso', 'Retiro', 'Vigencia', 'Estado', 'Causal'].map((head) => <th key={head} className="px-3 py-3">{head}</th>)}</tr></thead><tbody>{rows.slice(0, 200).map((row) => <tr key={row.id} className="border-b border-slate-100"><td className="px-3 py-3 font-black">{row.contrato}</td><td className="px-3 py-3"><p className="font-bold">{row.nombre}</p><p className="text-xs text-slate-500">{row.documento}</p></td><td className="px-3 py-3">{row.tipo_retiro}</td><td className="px-3 py-3 font-bold">{row.canal}</td><td className="px-3 py-3">{row.plan}</td><td className="px-3 py-3">{row.entidad}</td><td className="px-3 py-3">{row.asesor}</td><td className="px-3 py-3"><p>{row.sede}</p><p className="text-xs text-slate-500">{row.subuen}</p></td><td className="px-3 py-3">{String(row.fecha_ingreso || '').slice(0, 10) || '—'}</td><td className="px-3 py-3">{row.fecha}</td><td className="px-3 py-3">{number(row.meses_vigencia)} meses</td><td className="px-3 py-3">{row.estado_contrato}</td><td className="px-3 py-3">{row.causal_retiro}</td></tr>)}</tbody></table></div></ChartCard> }
