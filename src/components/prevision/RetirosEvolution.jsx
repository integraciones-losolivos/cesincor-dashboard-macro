import { useMemo, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CalendarRange, ChartNoAxesCombined, ClipboardX, PawPrint, Sigma, UserMinus } from 'lucide-react'
import ChartCard from '../ChartCard.jsx'
import CustomTooltip from '../CustomTooltip.jsx'
import KpiCard from '../KpiCard.jsx'
import { monthLabel, number, percent } from '../../utils/dashboard.js'
import { buildRetirosKpis, buildRetirosTimeline, timelineKey } from '../../utils/retiros.js'

const channels = [
  ['empresariales', 'Empresariales', '#0f766e'],
  ['independientes', 'Independientes', '#2563eb'],
  ['adicionales', 'Adicionales personas', '#ea580c'],
  ['mascotas', 'Adicionales mascotas', '#7c3aed'],
]

function signed(value) { return value === null || value === undefined ? '—' : `${value > 0 ? '+' : ''}${number(value)}` }
function periodLabel(key, granularity) { if (granularity === 'monthly') return monthLabel(`${key}-01`); const date = new Date(`${key}T00:00:00`); const label = date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }); return granularity === 'weekly' ? `Semana ${label}` : label }

export default function RetirosEvolution({ rows, from, to }) {
  const [selectedMonth, setSelectedMonth] = useState('')
  const [granularity, setGranularity] = useState('monthly')
  const [visibleChannels, setVisibleChannels] = useState(() => new Set(channels.map(([key]) => key)))
  const monthly = useMemo(() => buildRetirosTimeline(rows, granularity, { from, to }), [rows, granularity, from, to])
  const scopedRows = useMemo(() => selectedMonth ? rows.filter((row) => timelineKey(row.fecha, granularity) === selectedMonth) : rows, [rows, selectedMonth, granularity])
  const kpis = useMemo(() => buildRetirosKpis(scopedRows), [scopedRows])
  const average = monthly.length ? monthly.reduce((sum, item) => sum + item.total, 0) / monthly.length : 0
  const peak = monthly.reduce((best, item) => !best || item.total > best.total ? item : best, null)
  const comparison = selectedMonth ? monthly.find((item) => item.key === selectedMonth) : monthly.at(-1)
  const typeData = comparison ? [
    { name: 'Contratos', cantidad: comparison.contratos }, { name: 'Adicional mayor', cantidad: comparison.adicionalMayor },
    { name: 'Adicional menor', cantidad: comparison.adicionalMenor }, { name: 'Mascota', cantidad: comparison.mascota },
    { name: 'Mascota adicional', cantidad: comparison.mascotaAdicional },
  ] : []
  const selectMonth = (entry) => { const key = entry?.payload?.key || entry?.key; if (key) setSelectedMonth((current) => current === key ? '' : key) }
  const toggleChannel = (key) => setVisibleChannels((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next })

  return <div className="space-y-6">
    {selectedMonth && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3"><p className="text-sm font-black text-rose-900">Detalle activo: {periodLabel(selectedMonth, granularity)}</p><button type="button" onClick={() => setSelectedMonth('')} className="rounded-lg bg-white px-3 py-1.5 text-xs font-black text-rose-700 shadow-sm">Ver periodo completo</button></div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <KpiCard title="Total de retiros" value={number(kpis.total)} helper={selectedMonth ? 'Total del mes seleccionado.' : 'Total del periodo filtrado.'} icon={<Sigma className="size-6" />} accent="rose" />
      <KpiCard title="Contratos retirados" value={number(kpis.contratos)} helper="Número de contrato único." icon={<ClipboardX className="size-6" />} accent="blue" />
      <KpiCard title="Adicionales personas" value={number(kpis.adicionales)} helper="Personas adicionales A y M." icon={<UserMinus className="size-6" />} accent="orange" />
      <KpiCard title="Adicionales mascotas" value={number(kpis.mascotas)} helper={`${percent(kpis.participacionMascotas)} del total visible.`} icon={<PawPrint className="size-6" />} accent="violet" />
      <KpiCard title={`Promedio ${granularity === 'daily' ? 'diario' : granularity === 'weekly' ? 'semanal' : 'mensual'}`} value={number(Math.round(average))} helper={peak ? `Pico: ${periodLabel(peak.key, granularity)} (${number(peak.total)}).` : 'Sin periodos disponibles.'} icon={<CalendarRange className="size-6" />} accent="emerald" />
    </div>

    <ChartCard title="Evolución general" subtitle="Selecciona un periodo para llevar la vista de tendencia a canal y detalle." accent="rose" right={<select value={granularity} onChange={(event) => { setGranularity(event.target.value); setSelectedMonth('') }} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black"><option value="daily">Diaria</option><option value="weekly">Semanal</option><option value="monthly">Mensual</option></select>}>
      <div className="mb-4 flex flex-wrap gap-3 text-xs font-bold text-slate-600"><span>Última variación: <b className={comparison?.variacion > 0 ? 'text-rose-700' : 'text-emerald-700'}>{signed(comparison?.variacion)}</b></span><span>Variación porcentual: <b>{comparison?.variacionPorcentual === null || comparison?.variacionPorcentual === undefined ? 'No aplica' : percent(comparison.variacionPorcentual)}</b></span></div>
      <div className="h-80"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthly} onClick={(state) => state?.activeLabel && setSelectedMonth((current) => current === state.activeLabel ? '' : state.activeLabel)}><defs><linearGradient id="retirosArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#e11d48" stopOpacity={0.32} /><stop offset="95%" stopColor="#e11d48" stopOpacity={0.03} /></linearGradient></defs><CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="key" tickFormatter={(key) => periodLabel(key, granularity)} /><YAxis allowDecimals={false} /><Tooltip content={<CustomTooltip />} labelFormatter={(key) => periodLabel(key, granularity)} /><Area type="monotone" dataKey="total" name="Total retiros" stroke="#be123c" fill="url(#retirosArea)" strokeWidth={3} activeDot={{ r: 7 }} /></AreaChart></ResponsiveContainer></div>
    </ChartCard>

    <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
      <ChartCard title="Evolución por canal" subtitle="Activa o desactiva las series que deseas comparar." accent="blue"><div className="mb-4 flex flex-wrap gap-2">{channels.map(([key, label, color]) => <button key={key} type="button" onClick={() => toggleChannel(key)} className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${visibleChannels.has(key) ? 'text-white shadow-sm' : 'border-slate-200 bg-white text-slate-400'}`} style={visibleChannels.has(key) ? { backgroundColor: color, borderColor: color } : undefined}>{label}</button>)}</div><div className="h-80"><ResponsiveContainer width="100%" height="100%"><LineChart data={monthly}><CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="key" tickFormatter={(key) => periodLabel(key, granularity)} /><YAxis allowDecimals={false} /><Tooltip content={<CustomTooltip />} labelFormatter={(key) => periodLabel(key, granularity)} />{channels.filter(([key]) => visibleChannels.has(key)).map(([key, label, color]) => <Line key={key} type="monotone" dataKey={key} name={label} stroke={color} strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} />)}</LineChart></ResponsiveContainer></div></ChartCard>
      <ChartCard title="Tipos de retiro" subtitle={comparison ? `Desglose de ${periodLabel(comparison.key, granularity)}.` : 'Selecciona un periodo.'} accent="orange"><div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={typeData} layout="vertical"><CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={125} tick={{ fontSize: 11 }} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="cantidad" name="Retiros" fill="#ea580c" radius={[0, 9, 9, 0]} onClick={selectMonth} /></BarChart></ResponsiveContainer></div></ChartCard>
    </div>

    <MonthlyTable rows={monthly} selectedMonth={selectedMonth} onSelect={setSelectedMonth} granularity={granularity} />
    <EvolutionDetail rows={scopedRows} selectedMonth={selectedMonth} granularity={granularity} />
  </div>
}

function MonthlyTable({ rows, selectedMonth, onSelect, granularity }) {
  return <ChartCard title="Tabla de evolución" subtitle="Resumen temporal bajo los filtros aplicados."><div className="overflow-x-auto"><table className="min-w-full whitespace-nowrap text-left text-sm"><thead><tr className="border-b text-[11px] uppercase tracking-[.11em] text-slate-400">{['Periodo', 'Contratos', 'Adicionales personas', 'Adicionales mascotas', 'Empresariales', 'Independientes', 'Total', 'Variación', '% variación'].map((head) => <th key={head} className="px-3 py-3">{head}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.key} onClick={() => onSelect(selectedMonth === row.key ? '' : row.key)} className={`cursor-pointer border-b border-slate-100 transition hover:bg-rose-50 ${selectedMonth === row.key ? 'bg-rose-50' : ''}`}><td className="px-3 py-3 font-black">{periodLabel(row.key, granularity)}</td><td className="px-3 py-3">{number(row.contratos)}</td><td className="px-3 py-3">{number(row.adicionales)}</td><td className="px-3 py-3">{number(row.mascotas)}</td><td className="px-3 py-3">{number(row.empresariales)}</td><td className="px-3 py-3">{number(row.independientes)}</td><td className="px-3 py-3 font-black">{number(row.total)}</td><td className="px-3 py-3">{signed(row.variacion)}</td><td className="px-3 py-3">{row.variacionPorcentual === null ? '—' : percent(row.variacionPorcentual)}</td></tr>)}</tbody></table></div></ChartCard>
}

function EvolutionDetail({ rows, selectedMonth, granularity }) {
  return <ChartCard title="Registros del periodo" subtitle={selectedMonth ? `Detalle de ${periodLabel(selectedMonth, granularity)}; hasta 150 registros.` : 'Selecciona un periodo para concentrar el detalle; se muestran hasta 150 registros.'} accent="slate"><div className="overflow-x-auto"><table className="min-w-full whitespace-nowrap text-left text-sm"><thead><tr className="border-b text-[11px] uppercase tracking-[.11em] text-slate-400">{['Fecha', 'Contrato', 'Persona', 'Tipo', 'Canal', 'Sede', 'Plan', 'Asesor'].map((head) => <th key={head} className="px-3 py-3">{head}</th>)}</tr></thead><tbody>{rows.slice(0, 150).map((row) => <tr key={row.id} className="border-b border-slate-100"><td className="px-3 py-3 font-bold">{row.fecha}</td><td className="px-3 py-3 font-black">{row.contrato}</td><td className="px-3 py-3">{row.nombre}</td><td className="px-3 py-3">{row.tipo_retiro}</td><td className="px-3 py-3 font-bold">{row.canal}</td><td className="px-3 py-3">{row.sede}</td><td className="px-3 py-3">{row.plan}</td><td className="px-3 py-3">{row.asesor}</td></tr>)}</tbody></table></div></ChartCard>
}
