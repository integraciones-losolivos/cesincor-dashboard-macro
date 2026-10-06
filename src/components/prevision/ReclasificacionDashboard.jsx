import { useEffect, useMemo, useState } from 'react'
import { Download, Info, RefreshCw, RotateCcw, Search, Users, FileWarning, UserCheck, UserX, Layers3, Gauge, X } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import ChartCard from '../ChartCard.jsx'
import CustomTooltip from '../CustomTooltip.jsx'
import KpiCard from '../KpiCard.jsx'
import { fetchReclasificacion } from '../../services/reclasificacionApi.js'
import { exportRowsToExcel } from '../../utils/exportExcel.js'
import { getUniqueOptions, number, percent } from '../../utils/dashboard.js'
import { buildPlanRelationshipMatrix, filterReclasificacion, groupReclasificacion, initialReclasificacionFilters, reclasificacionKpis } from '../../utils/reclasificacion.js'

const colors = ['#0f766e', '#14b8a6', '#2563eb', '#7c3aed', '#f59e0b', '#64748b']
const today = () => new Date().toISOString().slice(0, 10)
// Mismo orden y nombres funcionales del SELECT final entregado para Query Manager.
const exportColumns = [['contrato','CONTRATO'],['documento_titular','DOCUMENTO TITULAR'],['titular','TITULAR'],['telefono_1','TELEFONO 1'],['telefono_2','TELEFONO 2'],['empresa','EMPRESA'],['plan','PLAN'],['asesor','ASESOR'],['documento_beneficiario','DOCUMENTO BENEFICIARIO'],['beneficiario','BENEFICIARIO'],['line_id','LINEID'],['parentesco','PARENTESCO'],['fecha_nacimiento','FECHA NACIMIENTO'],['fecha_ingreso','FECHA INGRESO'],['fecha_retiro','FECHA RETIRO'],['edad_actual','EDAD ACTUAL']]

export default function ReclasificacionDashboard({ active = true }) {
  const [vigencia, setVigencia] = useState(today)
  const [rows, setRows] = useState([])
  const [filters, setFilters] = useState(initialReclasificacionFilters)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [selected, setSelected] = useState(null)
  const [planLimit, setPlanLimit] = useState(5)

  useEffect(() => {
    if (!active || !vigencia) return undefined
    let current = true; setLoading(true); setError('')
    fetchReclasificacion(vigencia).then((data) => { if (current) setRows(data) }).catch((e) => { if (current) setError(e.message) }).finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [active, refresh, vigencia])

  const filtered = useMemo(() => filterReclasificacion(rows, filters), [rows, filters])
  const kpis = useMemo(() => reclasificacionKpis(filtered), [filtered])
  const relationship = useMemo(() => groupReclasificacion(filtered, 'parentesco'), [filtered])
  const plans = useMemo(() => groupReclasificacion(filtered, 'plan'), [filtered])
  const companies = useMemo(() => groupReclasificacion(filtered, 'empresa'), [filtered])
  const advisors = useMemo(() => groupReclasificacion(filtered, 'asesor'), [filtered])
  const matrix = useMemo(() => buildPlanRelationshipMatrix(filtered), [filtered])
  const options = useMemo(() => ({ empresas: getUniqueOptions(rows, 'empresa'), planes: getUniqueOptions(rows, 'plan'), asesores: getUniqueOptions(rows, 'asesor'), parentescos: getUniqueOptions(rows, 'parentesco') }), [rows])
  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }))
  const formattedDate = vigencia.split('-').reverse().join('/')

  return <div className="space-y-4">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.2em] text-teal-700">Previsión · Retiros</p><h2 className="mt-1 text-2xl font-black text-slate-950">Reclasificación</h2><p className="mt-1 max-w-3xl text-sm font-semibold text-slate-500">Beneficiarios que alcanzan o superan la edad de permanencia parametrizada según plan y parentesco a la fecha de vigencia seleccionada.</p></div><span className="rounded-full border border-teal-100 bg-teal-50 px-3 py-1.5 text-xs font-black text-teal-800">Fecha de vigencia: {formattedDate}</span></div>

    <section className="card-shadow rounded-2xl border border-slate-200 bg-white p-3">
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[1.05fr_repeat(5,minmax(0,1fr))_auto]">
        <Field label="Fecha de vigencia"><input type="date" value={vigencia} onChange={(e) => setVigencia(e.target.value)} className="control" /></Field>
        <Select label="Empresa" value={filters.empresa} options={options.empresas} onChange={(v) => setFilter('empresa', v)} />
        <Select label="Plan" value={filters.plan} options={options.planes} onChange={(v) => setFilter('plan', v)} />
        <Select label="Asesor" value={filters.asesor} options={options.asesores} onChange={(v) => setFilter('asesor', v)} />
        <Select label="Parentesco" value={filters.parentesco} options={options.parentescos} onChange={(v) => setFilter('parentesco', v)} />
        <Select label="Estado" value={filters.estado} options={['ACTIVO','RETIRADO']} onChange={(v) => setFilter('estado', v)} />
        <div className="flex items-end gap-2"><button type="button" title="Limpiar filtros" onClick={() => setFilters(initialReclasificacionFilters)} className="icon-button"><RotateCcw className="size-4" /></button><button type="button" title="Actualizar" onClick={() => setRefresh((v) => v + 1)} className="icon-button"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /></button></div>
      </div>
      <div className="mt-2"><label className="relative block"><Search className="absolute left-3 top-3 size-4 text-slate-400" /><input value={filters.search} onChange={(e) => setFilter('search', e.target.value)} placeholder="Contrato, titular, beneficiario o documento…" className="control w-full pl-9" /></label></div>
    </section>

    {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">{error}</div>}
    {loading ? <div className="grid min-h-64 place-items-center rounded-2xl bg-white font-black text-slate-500">Consultando reclasificación en SAP HANA…</div> : <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"><KpiCard title="Beneficiarios" value={number(kpis.beneficiarios)} helper="Para reclasificación." icon={<Users className="size-5" />} accent="emerald" /><KpiCard title="Contratos impactados" value={number(kpis.contratos)} helper="Contratos distintos." icon={<FileWarning className="size-5" />} accent="orange" /><KpiCard title="Titulares afectados" value={number(kpis.titulares)} helper="Titulares únicos." icon={<UserCheck className="size-5" />} accent="blue" /><KpiCard title="Activos / retirados" value={`${number(kpis.activos)} / ${number(kpis.retirados)}`} helper="Incluye retirados." icon={<UserX className="size-5" />} accent="rose" /><KpiCard title="Planes impactados" value={number(kpis.planes)} helper="Planes distintos." icon={<Layers3 className="size-5" />} accent="violet" /><KpiCard title="Edad promedio" value={kpis.edadPromedio.toLocaleString('es-CO',{maximumFractionDigits:1})} helper="A la vigencia." icon={<Gauge className="size-5" />} accent="blue" /></div>
      <LogicBlock />
      <div className="grid gap-4 xl:grid-cols-[.8fr_1.2fr]">
        <ChartCard title="Distribución por parentesco" subtitle="Cantidad y participación sobre el total filtrado." accent="emerald"><div className="grid items-center gap-3 sm:grid-cols-2"><div className="relative h-52"><ResponsiveContainer><PieChart><Pie data={relationship} dataKey="cantidad" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={2}>{relationship.map((item,i)=><Cell key={item.name} fill={colors[i%colors.length]} />)}</Pie><Tooltip content={<CustomTooltip />} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 grid place-content-center text-center"><strong className="text-2xl">{number(kpis.beneficiarios)}</strong><span className="text-[10px] font-black uppercase text-slate-400">beneficiarios</span></div></div><Rank data={relationship.slice(0,6)} /></div></ChartCard>
        <ChartCard title="Casos por plan" subtitle="Planes ordenados de mayor a menor." accent="blue" right={<div className="flex gap-1">{[5,10,0].map((v)=><button key={v} onClick={()=>setPlanLimit(v)} className={`rounded-lg px-2 py-1 text-[10px] font-black ${planLimit===v?'bg-teal-800 text-white':'bg-slate-100 text-slate-500'}`}>{v||'Todos'}</button>)}</div>}><Rank data={planLimit ? plans.slice(0,planLimit) : plans} /></ChartCard>
      </div>
      <div className="grid gap-4 xl:grid-cols-3"><ChartCard title="Estado del beneficiario" subtitle="Activos y retirados incluidos en el universo." accent="orange"><Stacked active={kpis.activos} retired={kpis.retirados} /></ChartCard><ChartCard title="Casos por empresa" subtitle="Empresas con mayor concentración." accent="emerald"><Rank data={companies.slice(0,8)} /></ChartCard><ChartCard title="Casos por asesor" subtitle="Ordenados por beneficiarios asociados." accent="violet"><Rank data={advisors.slice(0,8)} /></ChartCard></div>
      <Matrix matrix={matrix} />
      <DetailTable rows={filtered} vigencia={vigencia} onSelect={setSelected} />
    </>}
    {selected && <DetailDrawer row={selected} onClose={() => setSelected(null)} />}
  </div>
}

function Field({ label, children }) { return <label className="grid gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500">{label}{children}</label> }
function Select({ label, value, options, onChange }) { return <Field label={label}><select value={value} onChange={(e)=>onChange(e.target.value)} className="control"><option value="TODOS">Todos</option>{options.map((v)=><option key={v}>{v}</option>)}</select></Field> }
function Rank({ data }) { return <div className="space-y-2">{data.map((item)=><div key={item.name}><div className="flex justify-between gap-3 text-xs"><span className="truncate font-bold text-slate-700">{item.name}</span><strong>{number(item.cantidad)} · {percent(item.porcentaje)}</strong></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-600" style={{width:`${Math.max(2,item.porcentaje*100)}%`}} /></div></div>)}</div> }
function Stacked({ active, retired }) { const total=active+retired; return <div className="space-y-4"><div className="flex h-4 overflow-hidden rounded-full bg-slate-100"><div className="bg-emerald-500" style={{width:`${total?active/total*100:0}%`}}/><div className="bg-amber-400" style={{width:`${total?retired/total*100:0}%`}}/></div><div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs font-black text-emerald-700">Activos</p><strong className="text-2xl">{number(active)}</strong></div><div className="rounded-xl bg-amber-50 p-3"><p className="text-xs font-black text-amber-700">Retirados</p><strong className="text-2xl">{number(retired)}</strong></div></div></div> }
function LogicBlock(){return <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-3"><div className="flex items-center gap-2"><Info className="size-4 text-teal-700"/><h3 className="text-sm font-black text-slate-900">Lógica de reclasificación</h3></div><div className="mt-2 flex flex-wrap gap-1.5">{['Una fecha de vigencia','Beneficiarios tipo B','Excluye titular principal','Evalúa plan + parentesco','Utiliza edad de permanencia','Incluye retirados','Parametrizaciones hasta 110 años'].map((x)=><span key={x} className="rounded-full border border-teal-100 bg-white px-2.5 py-1 text-[11px] font-bold text-teal-900">{x}</span>)}</div><p className="mt-2 text-xs font-semibold text-slate-600">Fecha de nacimiento + edad de permanencia + 1 año ≤ fecha de vigencia seleccionada.</p></div>}
function Matrix({matrix}){const max=Math.max(1,...matrix.rows.flatMap((r)=>r.values));return <ChartCard title="Parentesco vs plan" subtitle="Concentración de casos en las principales combinaciones." accent="emerald"><div className="overflow-x-auto"><table className="min-w-full text-xs"><thead><tr><th className="p-2 text-left">Parentesco</th>{matrix.plans.map((p)=><th key={p} className="p-2 text-center">{p}</th>)}</tr></thead><tbody>{matrix.rows.map((r)=><tr key={r.name} className="border-t border-slate-100"><th className="p-2 text-left">{r.name}</th>{r.values.map((v,i)=><td key={matrix.plans[i]} className="p-1 text-center"><span className="block rounded-lg px-2 py-2 font-black" style={{background:`rgba(13,148,136,${v?0.12+0.78*v/max:0.04})`,color:v/max>.55?'white':'#0f172a'}}>{v}</span></td>)}</tr>)}</tbody></table></div></ChartCard>}
function DetailTable({rows,vigencia,onSelect}){const heads=exportColumns.map(([,label])=>label);const exportButton=<button type="button" disabled={!rows.length} onClick={() => exportRowsToExcel(rows, { filename: `reclasificacion-${vigencia}`, sheetName: 'Reclasificación', columns: exportColumns })} className="inline-flex h-9 items-center gap-2 rounded-xl bg-teal-800 px-3 text-xs font-black text-white disabled:opacity-50"><Download className="size-4" />Exportar detalle</button>;return <ChartCard title="Detalle de beneficiarios para reclasificación" subtitle={`${number(rows.length)} registros filtrados · columnas en el mismo orden del Query Manager. Selecciona una fila para ver el análisis complementario.`} accent="emerald" right={exportButton}><div className="max-h-[34rem] overflow-auto"><table className="min-w-[1720px] text-left text-xs"><thead className="sticky top-0 z-10 bg-white"><tr className="border-b text-[10px] uppercase tracking-wider text-slate-400">{heads.map((h)=><th key={h} className="p-2.5">{h}</th>)}</tr></thead><tbody>{rows.map((r)=><tr key={r.id} onClick={()=>onSelect(r)} className="cursor-pointer border-b border-slate-100 hover:bg-teal-50/60"><td className="p-2.5 font-black">{r.contrato}</td><td className="p-2.5">{r.documento_titular}</td><td className="p-2.5 font-bold">{r.titular}</td><td className="p-2.5">{r.telefono_1||'—'}</td><td className="p-2.5">{r.telefono_2||'—'}</td><td className="p-2.5">{r.empresa}</td><td className="p-2.5">{r.plan}</td><td className="p-2.5">{r.asesor}</td><td className="p-2.5">{r.documento_beneficiario}</td><td className="p-2.5 font-bold">{r.beneficiario}</td><td className="p-2.5">{r.line_id}</td><td className="p-2.5">{r.parentesco}</td><td className="p-2.5">{r.fecha_nacimiento||'—'}</td><td className="p-2.5">{r.fecha_ingreso||'—'}</td><td className="p-2.5">{r.fecha_retiro||'—'}</td><td className="p-2.5 font-black text-teal-700">{r.edad_actual}</td></tr>)}</tbody></table></div></ChartCard>}
function Badge({state}){return <span className={`rounded-full px-2 py-1 text-[10px] font-black ${state==='ACTIVO'?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'}`}>{state}</span>}
function DetailDrawer({row,onClose}){return <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/25" onMouseDown={onClose}><aside onMouseDown={(e)=>e.stopPropagation()} className="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-teal-700">Detalle de reclasificación</p><h3 className="mt-1 text-xl font-black">{row.beneficiario}</h3><p className="text-sm text-slate-500">{row.documento_beneficiario}</p></div><button onClick={onClose} className="icon-button"><X className="size-4"/></button></div><div className="mt-5 grid grid-cols-2 gap-3">{[['Estado',<Badge state={row.estado}/>],['Parentesco',row.parentesco],['Edad actual',row.edad_actual],['Edad permanencia',row.edad_permanencia],['Edad reclasificación',row.edad_reclasificacion],['Años excedidos',`${row.anos_excedidos} años`],['Fecha nacimiento',row.fecha_nacimiento||'—'],['Fecha ingreso',row.fecha_ingreso||'—'],['Fecha retiro',row.fecha_retiro||'—'],['Contrato',row.contrato],['Titular',row.titular],['Documento titular',row.documento_titular],['Teléfonos',[row.telefono_1,row.telefono_2].filter(Boolean).join(' / ')||'—'],['Empresa',row.empresa],['Plan',row.plan],['Asesor',row.asesor]].map(([k,v])=><div key={k} className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-black uppercase text-slate-400">{k}</p><div className="mt-1 text-sm font-bold text-slate-800">{v}</div></div>)}</div><p className="mt-5 rounded-2xl bg-teal-50 p-4 text-sm font-semibold leading-6 text-teal-900">Este beneficiario aparece porque alcanzó o superó la edad de permanencia parametrizada para su plan y parentesco a la fecha de vigencia seleccionada.</p></aside></div>}
