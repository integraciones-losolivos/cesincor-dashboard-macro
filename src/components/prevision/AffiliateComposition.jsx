import { useMemo, useState } from 'react'
import { AlertTriangle, CalendarClock, ScanSearch, UsersRound } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartCard from '../ChartCard.jsx'
import CustomTooltip from '../CustomTooltip.jsx'
import KpiCard from '../KpiCard.jsx'
import { fetchPrevisionIncomeAlertDetails } from '../../services/previsionIncomeApi.js'
import { money, number } from '../../utils/dashboard.js'
import { buildAffiliateProfile, buildIncomeComposition, buildIncomeSummary, filterIncomeProfileRows } from '../../utils/previsionIncome.js'

const statusColors = { ACTIVO: '#0f766e', RETIRADO: '#e11d48', FALLECIDO: '#64748b', 'SIN ESTADO': '#94a3b8' }

export default function AffiliateComposition({ rows, filters }) {
  const profileRows = useMemo(() => filterIncomeProfileRows(rows, filters), [filters, rows])
  const profile = useMemo(() => buildAffiliateProfile(profileRows), [profileRows])
  const activeSummary = useMemo(() => buildIncomeSummary(profile.active), [profile.active])
  const composition = useMemo(() => buildIncomeComposition(activeSummary), [activeSummary])
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [details, setDetails] = useState([])
  const [detailError, setDetailError] = useState('')
  const [detailLoading, setDetailLoading] = useState(false)

  const showAlert = async (alert) => {
    setSelectedAlert(alert)
    setDetailLoading(true)
    setDetailError('')
    try {
      const data = await fetchPrevisionIncomeAlertDetails(alert.id, {
        from: filters.fechaInicial, to: filters.fechaFinal, sede: filters.sede, plan: filters.plan,
        convenio: filters.convenio, asesor: filters.asesor, tipoAfiliado: filters.tipoAfiliado, estado: filters.estado,
        parentesco: filters.parentesco, search: filters.search,
      })
      setDetails(data)
    } catch (error) {
      setDetailError(error.message)
      setDetails([])
    } finally {
      setDetailLoading(false)
    }
  }

  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard title="Edad promedio" value={formatAge(profile.average)} helper="Calculada con fechas válidas entre 0 y 120 años." icon={<CalendarClock className="size-6" />} accent="blue" />
      <KpiCard title="Edad mediana" value={formatAge(profile.median)} helper="Punto medio de las edades válidas del universo visible." icon={<UsersRound className="size-6" />} accent="emerald" />
      <KpiCard title="Parentescos identificados" value={number(profile.parentescos)} helper="Se presentan todos los parentescos, no solo los principales." icon={<ScanSearch className="size-6" />} accent="violet" />
      <KpiCard title="Registros no activos" value={number(profile.noActivos)} helper="Personas retiradas o fallecidas dentro del filtro aplicado." icon={<AlertTriangle className="size-6" />} accent="orange" />
    </div>

    <div className="grid gap-6 xl:grid-cols-2">
      <ChartCard title="Personas activas por rango de edad" subtitle="Las fechas vacías, futuras o con edades mayores a 120 se excluyen del cálculo." accent="emerald">
        <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={profile.ranges}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis tickFormatter={number} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="personas" name="Personas" fill="#0f766e" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div>
      </ChartCard>
      <ChartCard title="Composición de personas activas" subtitle="Titulares, adicionales personas, mascotas y beneficiarios con colores claramente diferenciados." accent="violet">
        <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto]"><div className="h-72"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={composition} dataKey="value" nameKey="name" innerRadius={70} outerRadius={105} paddingAngle={3}>{composition.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip content={<CustomTooltip />} /></PieChart></ResponsiveContainer></div><Legend data={composition} /></div>
      </ChartCard>
      <ChartCard title="Estado de los registros" subtitle="Distribución del universo visible entre activos, retirados y fallecidos." accent="rose">
        <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto]"><div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={profile.statuses} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92}>{profile.statuses.map((item) => <Cell key={item.name} fill={statusColors[item.name] || '#94a3b8'} />)}</Pie><Tooltip content={<CustomTooltip />} /></PieChart></ResponsiveContainer></div><Legend data={profile.statuses.map((item) => ({ ...item, color: statusColors[item.name] || '#94a3b8' }))} /></div>
      </ChartCard>
      <ChartCard title="Edad promedio por tipo" subtitle="Promedio calculado únicamente con fechas de nacimiento válidas." accent="blue">
        <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={profile.ageByType} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" /><YAxis dataKey="name" type="category" width={125} tick={{ fontSize: 11 }} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="edad" name="Edad promedio" fill="#2563eb" radius={[0, 8, 8, 0]} /></BarChart></ResponsiveContainer></div>
      </ChartCard>
    </div>

    <ChartCard title="Parentescos de personas activas" subtitle="Listado completo ordenado por cantidad de personas protegidas." accent="slate">
      <div className="max-h-[34rem] overflow-auto"><table className="w-full text-sm"><thead className="sticky top-0 bg-white"><tr className="border-b text-xs uppercase tracking-wider text-slate-400"><th className="px-3 py-3 text-left">Parentesco</th><th className="px-3 py-3 text-right">Personas</th><th className="px-3 py-3 text-right">Contratos</th><th className="px-3 py-3 text-right">Participación</th></tr></thead><tbody>{profile.relationships.map((item) => <tr key={item.name} className="border-b border-slate-100"><td className="px-3 py-3 font-bold text-slate-800">{item.name}</td><td className="px-3 py-3 text-right">{number(item.vidas)}</td><td className="px-3 py-3 text-right">{number(item.contratos)}</td><td className="px-3 py-3 text-right">{profile.active.length ? ((item.vidas / profile.active.length) * 100).toLocaleString('es-CO', { maximumFractionDigits: 1 }) : 0}%</td></tr>)}</tbody></table></div>
    </ChartCard>

    <section className="card-shadow overflow-hidden rounded-[2rem] border border-amber-200 bg-white">
      <div className="border-b border-amber-100 bg-amber-50 px-5 py-4"><h3 className="text-lg font-black text-slate-950">Alertas de calidad</h3><p className="mt-1 text-sm text-slate-600">Selecciona una alerta para consultar hasta 500 casos del filtro actual.</p></div>
      <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">{profile.alerts.map((alert) => <button key={alert.id} type="button" onClick={() => showAlert(alert)} className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${selectedAlert?.id === alert.id ? 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-white'}`}><span className="text-2xl font-black text-slate-950">{number(alert.count)}</span><span className="mt-2 block text-sm font-bold leading-5 text-slate-600">{alert.label}</span></button>)}</div>
      {selectedAlert && <AlertDetail alert={selectedAlert} rows={details} loading={detailLoading} error={detailError} />}
    </section>
  </div>
}

function AlertDetail({ alert, rows, loading, error }) {
  return <div className="border-t border-slate-200 p-5"><h4 className="font-black text-slate-950">Detalle: {alert.label}</h4>{loading ? <p className="py-8 text-center font-bold text-slate-500">Consultando casos…</p> : error ? <p className="py-5 font-bold text-rose-700">{error}</p> : <div className="mt-4 max-h-[30rem] overflow-auto"><table className="w-full min-w-[1200px] text-sm"><thead className="sticky top-0 bg-white"><tr className="border-b text-xs uppercase text-slate-400">{['Contrato','Documento','Nombre','Tipo','Estado','Ingreso','Nacimiento','Edad','Plan','Convenio','Sede','Responsable','Facturación'].map((label) => <th key={label} className="px-2 py-3 text-left">{label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b border-slate-100"><td className="px-2 py-3">{row.contrato}</td><td className="px-2 py-3">{row.documento || 'N/A'}</td><td className="px-2 py-3 font-bold">{row.nombre || 'N/A'}</td><td className="px-2 py-3">{row.categoriaProtegido}</td><td className="px-2 py-3">{row.estado}</td><td className="px-2 py-3">{row.fechaIngreso || 'N/A'}</td><td className="px-2 py-3">{row.fechaNacimiento || 'N/A'}</td><td className="px-2 py-3">{row.edad ?? 'N/A'}</td><td className="px-2 py-3">{row.plan}</td><td className="px-2 py-3">{row.convenio}</td><td className="px-2 py-3">{row.sede}</td><td className="px-2 py-3">{row.asesor}</td><td className="px-2 py-3">{money(row.valorFacturado)}</td></tr>)}</tbody></table>{!rows.length && <p className="py-8 text-center text-slate-500">No hay casos para el filtro actual.</p>}</div>}</div>
}

function Legend({ data }) { return <div className="space-y-2">{data.map((item) => <div key={item.name} className="flex min-w-52 items-center justify-between gap-5 rounded-xl bg-slate-50 px-4 py-3"><span className="flex items-center gap-2 text-sm font-bold text-slate-600"><span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span><strong>{number(item.value)}</strong></div>)}</div> }
function formatAge(value) { return Number.isFinite(value) ? `${value.toLocaleString('es-CO', { maximumFractionDigits: 1 })} años` : 'Sin datos' }
