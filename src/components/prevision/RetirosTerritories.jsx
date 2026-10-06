import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Building2, ClipboardX, MapPin, PawPrint, Search, Sigma, UserMinus } from 'lucide-react'
import ChartCard from '../ChartCard.jsx'
import CustomTooltip from '../CustomTooltip.jsx'
import KpiCard from '../KpiCard.jsx'
import { RankingList } from './ExecutiveViz.jsx'
import { monthLabel, normalizeText, number, percent } from '../../utils/dashboard.js'
import { buildCausalSummary, buildRetirosKpis, buildRetirosMonthly, buildTerritorySummary, groupRetirosCounted } from '../../utils/retiros.js'

const series = [['empresariales', 'Empresariales', '#0f766e'], ['independientes', 'Independientes', '#2563eb'], ['sin_clasificar', 'Sin clasificar', '#64748b']]
const dimensions = { sede: 'Sede', subuen: 'SubUEN', municipio: 'Municipio' }

export default function RetirosTerritories({ rows, from, to }) {
  const [dimension, setDimension] = useState('sede')
  const [selected, setSelected] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('total')
  const kpis = useMemo(() => buildRetirosKpis(rows), [rows])
  const summary = useMemo(() => buildTerritorySummary(rows, dimension), [rows, dimension])
  const ranked = useMemo(() => [...summary].sort((a, b) => b[sort] - a[sort] || a.name.localeCompare(b.name)), [summary, sort])
  const active = selected && summary.some((item) => item.name === selected) ? selected : ranked[0]?.name || ''
  const territoryRows = useMemo(() => rows.filter((row) => (row[dimension] || `SIN ${dimension.toUpperCase()}`) === active), [rows, dimension, active])
  const monthly = useMemo(() => buildRetirosMonthly(territoryRows, { from, to }), [territoryRows, from, to])
  const causes = useMemo(() => buildCausalSummary(territoryRows).slice(0, 7), [territoryRows])
  const plans = useMemo(() => groupRetirosCounted(territoryRows, 'plan', { limit: 7 }), [territoryRows])
  const advisors = useMemo(() => groupRetirosCounted(territoryRows, 'asesor', { limit: 7 }), [territoryRows])
  const sedes = new Set(rows.map((row) => row.sede).filter((name) => name && name !== 'SIN SEDE')).size
  const subuens = new Set(rows.map((row) => row.subuen).filter((name) => name && name !== 'SIN SUBUEN')).size
  const municipios = new Set(rows.map((row) => row.municipio).filter((name) => name && name !== 'SIN MUNICIPIO')).size
  const tableRows = ranked.filter((item) => normalizeText(item.name).includes(normalizeText(search)))
  const changeDimension = (value) => { setDimension(value); setSelected('') }

  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      <KpiCard title="Sedes con retiros" value={number(sedes)} helper="Nombres exactos, sin consolidación automática." icon={<Building2 className="size-6" />} accent="blue" />
      <KpiCard title="SubUEN con retiros" value={number(subuens)} helper={`${number(municipios)} municipios identificados.`} icon={<MapPin className="size-6" />} accent="emerald" />
      <KpiCard title="Total de retiros" value={number(kpis.total)} helper={ranked[0] ? `Mayor ${dimensions[dimension].toLowerCase()}: ${ranked[0].name}.` : 'Sin retiros.'} icon={<Sigma className="size-6" />} accent="rose" />
      <KpiCard title="Contratos retirados" value={number(kpis.contratos)} helper="Contratos únicos." icon={<ClipboardX className="size-6" />} accent="emerald" />
      <KpiCard title="Adicionales personas" value={number(kpis.adicionales)} helper="Registros A y M." icon={<UserMinus className="size-6" />} accent="orange" />
      <KpiCard title="Adicionales mascotas" value={number(kpis.mascotas)} helper="Registros P y D." icon={<PawPrint className="size-6" />} accent="violet" />
    </div>

    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950"><strong>Punto de venta:</strong> no se muestra ni se usa como filtro porque SAP no expone actualmente una relación confiable con el contrato; la tabla de puntos de venta está vacía. Municipio sí proviene del convenio y del catálogo oficial de municipios.</div>

    <div className="grid gap-6 xl:grid-cols-2">
      <ChartCard title={`Ranking por ${dimensions[dimension]}`} subtitle="Cantidad y participación bajo los filtros aplicados." accent="rose"><Controls dimension={dimension} changeDimension={changeDimension} sort={sort} setSort={setSort} /><Bars data={ranked.slice(0, 12).map((item) => ({ name: item.name, cantidad: item[sort] }))} onSelect={setSelected} height="h-96" /></ChartCard>
      <ChartCard title={`Canales por ${dimensions[dimension]}`} subtitle="Composición territorial sin clasificar un registro en dos canales." accent="blue"><Controls dimension={dimension} changeDimension={changeDimension} sort={sort} setSort={setSort} hideSort /><div className="h-[27rem]"><ResponsiveContainer width="100%" height="100%"><BarChart data={ranked.slice(0, 10)} layout="vertical"><CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 9 }} /><Tooltip content={<CustomTooltip />} />{series.map(([key, label, color]) => <Bar key={key} dataKey={key} name={label} stackId="territorio" fill={color} />)}</BarChart></ResponsiveContainer></div></ChartCard>
    </div>

    <ChartCard title={`Evolución mensual · ${active}`} subtitle={`Tendencia por fecha de retiro para ${dimensions[dimension].toLowerCase()} seleccionada.`} accent="violet"><div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthly}><CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="key" tickFormatter={(key) => monthLabel(`${key}-01`)} /><YAxis allowDecimals={false} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="contratos" name="Contratos" fill="#0f766e" /><Bar dataKey="adicionales" name="Adicionales personas" fill="#ea580c" /><Bar dataKey="mascotas" name="Adicionales mascotas" fill="#7c3aed" /><Bar dataKey="total" name="Total" fill="#be123c" radius={[7, 7, 0, 0]} /></BarChart></ResponsiveContainer></div></ChartCard>

    <div className="grid gap-6 xl:grid-cols-3"><ChartCard title={`Causales · ${active}`} subtitle="Principales motivos identificados." accent="rose"><Bars data={causes} /></ChartCard><ChartCard title={`Planes · ${active}`} subtitle="Top 7 planes." accent="emerald"><Bars data={plans} color="#0f766e" /></ChartCard><ChartCard title={`Asesores · ${active}`} subtitle="Top 7 responsables." accent="orange"><Bars data={advisors} color="#ea580c" /></ChartCard></div>
    <TerritoryTable rows={tableRows} dimension={dimension} search={search} setSearch={setSearch} selected={active} onSelect={setSelected} />
    <TerritoryDetail rows={territoryRows} territory={active} />
  </div>
}

function Controls({ dimension, changeDimension, sort, setSort, hideSort }) { return <div className="mb-3 flex justify-end gap-2"><select value={dimension} onChange={(event) => changeDimension(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black"><option value="sede">Sede</option><option value="subuen">SubUEN</option><option value="municipio">Municipio</option></select>{!hideSort && <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black"><option value="total">Total</option><option value="contratos">Contratos</option><option value="adicionales">Adicionales personas</option><option value="mascotas">Adicionales mascotas</option></select>}</div> }
function Bars({ data, color = '#64748b', onSelect }) { const valueKey = data[0]?.cantidad === undefined ? 'total' : 'cantidad'; return <RankingList data={data} valueKey={valueKey} color={color} limit={12} onSelect={onSelect} /> }
function TerritoryTable({ rows, dimension, search, setSearch, selected, onSelect }) { return <ChartCard title="Tabla consolidada territorial" subtitle={`${number(rows.length)} ${dimensions[dimension]} bajo los filtros aplicados.`}><label className="relative mb-4 block"><Search className="absolute left-3 top-3 size-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Buscar ${dimensions[dimension]}…`} className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm font-bold" /></label><div className="overflow-x-auto"><table className="min-w-full whitespace-nowrap text-left text-sm"><thead><tr className="border-b text-[11px] uppercase tracking-[.1em] text-slate-400">{[dimensions[dimension], 'Total', 'Contratos', 'Empresariales', 'Independientes', 'Adicionales personas', 'Adicionales mascotas', '% participación', 'Principal causal'].map((head) => <th key={head} className="px-3 py-3">{head}</th>)}</tr></thead><tbody>{rows.map((item) => <tr key={item.name} onClick={() => onSelect(item.name)} className={`cursor-pointer border-b border-slate-100 hover:bg-rose-50 ${selected === item.name ? 'bg-rose-50' : ''}`}><td className="px-3 py-3 font-black">{item.name}</td><td className="px-3 py-3 font-black">{number(item.total)}</td><td className="px-3 py-3">{number(item.contratos)}</td><td className="px-3 py-3">{number(item.empresariales)}</td><td className="px-3 py-3">{number(item.independientes)}</td><td className="px-3 py-3">{number(item.adicionales)}</td><td className="px-3 py-3">{number(item.mascotas)}</td><td className="px-3 py-3">{percent(item.porcentaje)}</td><td className="px-3 py-3">{item.principalCausal}</td></tr>)}</tbody></table></div></ChartCard> }
function TerritoryDetail({ rows, territory }) { return <ChartCard title="Detalle del territorio" subtitle={`${territory} · ${number(buildRetirosKpis(rows).total)} retiros; se muestran hasta 200 registros.`}><div className="overflow-x-auto"><table className="min-w-full whitespace-nowrap text-left text-sm"><thead><tr className="border-b text-[11px] uppercase tracking-[.1em] text-slate-400">{['Contrato', 'Identificación / nombre', 'Canal', 'Tipo', 'Plan', 'Convenio', 'Asesor', 'Sede', 'SubUEN', 'Municipio', 'Ingreso', 'Retiro', 'Vigencia', 'Estado', 'Causal'].map((head) => <th key={head} className="px-3 py-3">{head}</th>)}</tr></thead><tbody>{rows.slice(0, 200).map((row) => <tr key={row.id} className="border-b border-slate-100"><td className="px-3 py-3 font-black">{row.contrato}</td><td className="px-3 py-3"><p className="font-bold">{row.nombre}</p><p className="text-xs text-slate-500">{row.documento}</p></td><td className="px-3 py-3">{row.canal}</td><td className="px-3 py-3">{row.tipo_retiro}</td><td className="px-3 py-3">{row.plan}</td><td className="px-3 py-3">{row.entidad}</td><td className="px-3 py-3">{row.asesor}</td><td className="px-3 py-3">{row.sede}</td><td className="px-3 py-3">{row.subuen}</td><td className="px-3 py-3">{row.municipio}</td><td className="px-3 py-3">{String(row.fecha_ingreso || '').slice(0, 10) || '—'}</td><td className="px-3 py-3">{row.fecha}</td><td className="px-3 py-3">{number(row.meses_vigencia)} meses</td><td className="px-3 py-3">{row.estado_contrato}</td><td className="px-3 py-3">{row.causal_retiro}</td></tr>)}</tbody></table></div></ChartCard> }
