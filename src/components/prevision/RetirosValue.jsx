import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BadgeDollarSign, BriefcaseBusiness, Building2, Calculator, Search, UserRound } from 'lucide-react'
import ChartCard from '../ChartCard.jsx'
import KpiCard from '../KpiCard.jsx'
import { RankingList } from './ExecutiveViz.jsx'
import { money, monthLabel, normalizeText, number, percent, shortMoney } from '../../utils/dashboard.js'
import { buildRetirosValueKpis, buildValueMonthly, buildValueSummary } from '../../utils/retiros.js'

const dimensions = { canal: 'Canal', plan: 'Plan', asesor: 'Asesor', sede: 'Sede', subuen: 'SubUEN', municipio: 'Municipio', entidad: 'Entidad / convenio', causal_retiro: 'Causal' }
const colors = [['empresariales', 'Empresariales', '#0f766e'], ['independientes', 'Independientes', '#2563eb'], ['adicionales_personas', 'Adicionales personas', '#ea580c'], ['adicionales_mascotas', 'Adicionales mascotas', '#7c3aed']]

export default function RetirosValue({ rows }) {
  const [dimension, setDimension] = useState('plan')
  const [selected, setSelected] = useState('')
  const [search, setSearch] = useState('')
  const kpis = useMemo(() => buildRetirosValueKpis(rows), [rows])
  const summary = useMemo(() => buildValueSummary(rows, dimension), [rows, dimension])
  const active = selected && summary.some((item) => item.name === selected) ? selected : summary[0]?.name || ''
  const detailRows = useMemo(() => rows.filter((row) => (row[dimension] || 'SIN DEFINIR') === active), [rows, dimension, active])
  const monthly = useMemo(() => buildValueMonthly(rows), [rows])
  const tableRows = summary.filter((item) => normalizeText(item.name).includes(normalizeText(search)))
  const topPlan = buildValueSummary(rows, 'plan')[0]
  const topAdvisor = buildValueSummary(rows, 'asesor')[0]
  const topSite = buildValueSummary(rows, 'sede')[0]
  const setAnalysis = (value) => { setDimension(value); setSelected('') }

  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <KpiCard title="Facturación asociada" value={money(kpis.total)} helper="Facturación del periodo, contabilizada una vez por contrato retirado." icon={<BadgeDollarSign className="size-6" />} accent="rose" />
      <KpiCard title="Contratos retirados" value={money(kpis.contractValue)} helper="Facturación de contratos únicos cancelados en el periodo." icon={<Building2 className="size-6" />} accent="emerald" />
      <KpiCard title="Retiros empresariales" value={money(kpis.businessValue)} helper="Valor mensual de contratos empresariales." icon={<BriefcaseBusiness className="size-6" />} accent="blue" />
      <KpiCard title="Retiros independientes" value={money(kpis.independentValue)} helper="Valor mensual de contratos independientes." icon={<UserRound className="size-6" />} accent="violet" />
      <KpiCard title="Promedio por unidad valorada" value={money(kpis.average)} helper={`${number(kpis.applicable)} unidades valoradas; ${number(kpis.withoutValue)} con valor cero.`} icon={<Calculator className="size-6" />} accent="orange" />
    </div>

    <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-950"><strong>Definición:</strong> facturación obtenida de los movimientos `OKEX` de SAP dentro del mismo rango seleccionado. Se toma una sola vez por contrato retirado y se descuentan adicionales, seguros y complementos según la lógica usada en Activos. Los adicionales y mascotas no reciben automáticamente la facturación completa del contrato.</div>

    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <ChartCard title={`Valor por ${dimensions[dimension]}`} subtitle="Top 12 por facturación asociada dentro del periodo." accent="rose"><DimensionSelect value={dimension} onChange={setAnalysis} /><MoneyBars data={summary.slice(0, 12)} onSelect={setSelected} /></ChartCard>
      <ChartCard title="Valor por canal" subtitle="Adicionales y mascotas permanecen en cero mientras no exista facturación individual validada." accent="blue"><MoneyBars data={buildValueSummary(rows, 'canal')} color="#2563eb" /></ChartCard>
    </div>

    <ChartCard title="Evolución mensual del valor" subtitle="Valor mensual asociado agrupado por fecha de retiro y comparado por canal." accent="violet"><div className="h-80"><ResponsiveContainer width="100%" height="100%"><LineChart data={monthly}><CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="key" tickFormatter={(key) => monthLabel(`${key}-01`)} /><YAxis tickFormatter={shortMoney} /><Tooltip formatter={(value) => money(value)} labelFormatter={(key) => monthLabel(`${key}-01`)} /><Line type="monotone" dataKey="valor" name="Valor total" stroke="#be123c" strokeWidth={3} />{colors.map(([key, label, color]) => <Line key={key} type="monotone" dataKey={key} name={label} stroke={color} strokeWidth={2} dot={false} />)}</LineChart></ResponsiveContainer></div></ChartCard>

    <div className="grid gap-4 sm:grid-cols-3"><Leader label="Plan con mayor valor" item={topPlan} /><Leader label="Asesor con mayor valor" item={topAdvisor} /><Leader label="Sede con mayor valor" item={topSite} /></div>
    <ValueTable rows={tableRows} dimension={dimension} search={search} setSearch={setSearch} selected={active} onSelect={setSelected} setDimension={setAnalysis} />
    <ValueDetail rows={detailRows} label={active} />
  </div>
}

function DimensionSelect({ value, onChange }) { return <div className="mb-3 flex justify-end"><select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black">{Object.entries(dimensions).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div> }
function MoneyBars({ data, color = '#475569', onSelect }) { return <RankingList data={data} valueKey="valor" formatter={money} color={color} limit={12} onSelect={onSelect} /> }
function Leader({ label, item }) { return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 truncate font-black text-slate-900">{item?.name || 'Sin información'}</p><p className="mt-1 text-lg font-black text-rose-700">{money(item?.valor)}</p></div> }
function ValueTable({ rows, dimension, search, setSearch, selected, onSelect, setDimension }) { return <ChartCard title="Tabla consolidada de valor" subtitle={`${number(rows.length)} categorías bajo los filtros aplicados.`}><div className="mb-4 flex gap-3"><label className="relative flex-1"><Search className="absolute left-3 top-3 size-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar dimensión…" className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm font-bold" /></label><select value={dimension} onChange={(event) => setDimension(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold">{Object.entries(dimensions).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div><div className="overflow-x-auto"><table className="min-w-full whitespace-nowrap text-left text-sm"><thead><tr className="border-b text-[11px] uppercase tracking-[.1em] text-slate-400">{[dimensions[dimension], 'Cantidad de retiros', 'Unidades valoradas', 'Valor mensual asociado', 'Promedio', '% participación'].map((head) => <th key={head} className="px-3 py-3">{head}</th>)}</tr></thead><tbody>{rows.map((item) => <tr key={item.name} onClick={() => onSelect(item.name)} className={`cursor-pointer border-b border-slate-100 hover:bg-rose-50 ${selected === item.name ? 'bg-rose-50' : ''}`}><td className="px-3 py-3 font-black">{item.name}</td><td className="px-3 py-3">{number(item.cantidad)}</td><td className="px-3 py-3">{number(item.unidadesValoradas)}</td><td className="px-3 py-3 font-black">{money(item.valor)}</td><td className="px-3 py-3">{money(item.promedio)}</td><td className="px-3 py-3">{percent(item.participacion)}</td></tr>)}</tbody></table></div></ChartCard> }
function ValueDetail({ rows, label }) { return <ChartCard title="Detalle del valor asociado" subtitle={`${label} · se muestran hasta 200 registros; las líneas incluidas en el contrato aparecen con valor cero para evidenciar la regla.`}><div className="overflow-x-auto"><table className="min-w-full whitespace-nowrap text-left text-sm"><thead><tr className="border-b text-[11px] uppercase tracking-[.1em] text-slate-400">{['Contrato', 'Identificación / nombre', 'Canal', 'Tipo retiro', 'Plan', 'Entidad', 'Asesor', 'Sede / SubUEN', 'Fecha retiro', 'Valor asociado', 'Tipo de valor', 'Causal'].map((head) => <th key={head} className="px-3 py-3">{head}</th>)}</tr></thead><tbody>{rows.slice(0, 200).map((row) => <tr key={row.id} className="border-b border-slate-100"><td className="px-3 py-3 font-black">{row.contrato}</td><td className="px-3 py-3"><p className="font-bold">{row.nombre}</p><p className="text-xs text-slate-500">{row.documento}</p></td><td className="px-3 py-3">{row.canal}</td><td className="px-3 py-3">{row.tipo_retiro}</td><td className="px-3 py-3">{row.plan}</td><td className="px-3 py-3">{row.entidad}</td><td className="px-3 py-3">{row.asesor}</td><td className="px-3 py-3"><p>{row.sede}</p><p className="text-xs text-slate-500">{row.subuen}</p></td><td className="px-3 py-3">{row.fecha}</td><td className="px-3 py-3 font-black">{money(row.valor_asociado)}</td><td className="px-3 py-3">{row.tipo_valor}</td><td className="px-3 py-3">{row.causal_retiro}</td></tr>)}</tbody></table></div></ChartCard> }
