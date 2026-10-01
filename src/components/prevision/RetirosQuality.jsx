import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ContactRound, Mail, MailX, Phone, PhoneOff, ShieldAlert, ShieldCheck } from 'lucide-react'
import ChartCard from '../ChartCard.jsx'
import KpiCard from '../KpiCard.jsx'
import { ProgressList } from './ExecutiveViz.jsx'
import { number, percent } from '../../utils/dashboard.js'
import { buildQualityAlerts, buildQualityDimension, buildQualityKpis, isContactable, QUALITY_ALERTS } from '../../utils/retiros.js'

export default function RetirosQuality({ rows }) {
  const [contactStatus, setContactStatus] = useState('TODOS')
  const [alertKey, setAlertKey] = useState('SIN_CONTACTO')
  const contactRows = useMemo(() => rows.filter((row) => contactStatus === 'TODOS' || (contactStatus === 'CONTACTABLE' ? isContactable(row) : !isContactable(row))), [rows, contactStatus])
  const alert = QUALITY_ALERTS.find((item) => item.key === alertKey) || QUALITY_ALERTS[0]
  const alertRows = useMemo(() => contactRows.filter(alert.test), [contactRows, alert])
  const kpis = useMemo(() => buildQualityKpis(contactRows), [contactRows])
  const alerts = useMemo(() => buildQualityAlerts(contactRows), [contactRows])
  const channels = useMemo(() => buildQualityDimension(contactRows, 'canal'), [contactRows])
  const advisors = useMemo(() => buildQualityDimension(contactRows, 'asesor').slice(0, 10), [contactRows])
  const sites = useMemo(() => buildQualityDimension(contactRows, 'sede').slice(0, 10), [contactRows])
  const composition = [{ name: 'Contactables', value: kpis.contactable, color: '#0f766e' }, { name: 'No contactables', value: kpis.notContactable, color: '#be123c' }]
  return <div className="space-y-6">
    <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4"><select value={contactStatus} onChange={(event) => setContactStatus(event.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-bold"><option value="TODOS">Todos los estados</option><option value="CONTACTABLE">Contactable</option><option value="NO_CONTACTABLE">No contactable</option></select><select value={alertKey} onChange={(event) => setAlertKey(event.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-bold">{QUALITY_ALERTS.map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}</select></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard title="Registros retirados" value={number(kpis.total)} helper="Filas individuales bajo los filtros aplicados." icon={<ContactRound className="size-6" />} accent="blue" />
      <KpiCard title="Con teléfono" value={number(kpis.withPhone)} helper={`${number(kpis.withoutPhone)} sin teléfono fijo ni celular.`} icon={<Phone className="size-6" />} accent="emerald" />
      <KpiCard title="Con correo" value={number(kpis.withEmail)} helper={`${number(kpis.withoutEmail)} sin correo.`} icon={<Mail className="size-6" />} accent="violet" />
      <KpiCard title="Contactables" value={number(kpis.contactable)} helper={`${percent(kpis.contactablePercentage)} contactables · ${percent(1 - kpis.contactablePercentage)} no contactables.`} icon={<ShieldCheck className="size-6" />} accent="orange" />
    </div>
    <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]"><ChartCard title="Contactabilidad" subtitle="Al menos un teléfono, celular o correo con contenido." accent="emerald"><div className="h-72"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={composition} dataKey="value" nameKey="name" innerRadius={62} outerRadius={95}>{composition.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div></ChartCard><ChartCard title="Calidad por canal" subtitle="Ausencia de teléfono y correo por población." accent="rose"><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={channels}><CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 9 }} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="withoutPhone" name="Sin teléfono" fill="#ea580c" /><Bar dataKey="withoutEmail" name="Sin correo" fill="#7c3aed" /><Bar dataKey="notContactable" name="Sin teléfono ni correo" fill="#be123c" /></BarChart></ResponsiveContainer></div></ChartCard></div>
    <div className="grid gap-6 xl:grid-cols-2"><ChartCard title="Asesores con registros no contactables" subtitle="Top 10 por cantidad." accent="orange"><QualityBars rows={advisors} /></ChartCard><ChartCard title="Sedes con registros incompletos" subtitle="Top 10 sin teléfono ni correo." accent="blue"><QualityBars rows={sites} color="#2563eb" /></ChartCard></div>
    <ChartCard title="Alertas de calidad" subtitle="Selecciona una alerta para consultar sus registros." accent="rose"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{alerts.map((item) => <button key={item.key} type="button" onClick={() => setAlertKey(item.key)} className={`rounded-2xl border p-4 text-left transition ${alertKey === item.key ? 'border-rose-600 bg-rose-50' : 'border-slate-200 hover:border-rose-300'}`}><span className="flex items-center gap-2 text-sm font-black text-slate-900">{item.key === 'SIN_TELEFONO' ? <PhoneOff className="size-4" /> : item.key === 'SIN_CORREO' ? <MailX className="size-4" /> : <ShieldAlert className="size-4" />}{item.name}</span><strong className="mt-3 block text-2xl text-rose-700">{number(item.cantidad)}</strong><small className="font-bold text-slate-500">{percent(item.porcentaje)}</small></button>)}</div></ChartCard>
    <QualityDetail rows={alertRows} title={alert.name} />
  </div>
}

function QualityBars({ rows, color = '#ea580c' }) { return <ProgressList data={rows} valueKey="notContactable" color={color} /> }
function QualityDetail({ rows, title }) { return <ChartCard title={`Detalle de alerta · ${title}`} subtitle={`${number(rows.length)} registros; se muestran hasta 200.`}><div className="overflow-x-auto"><table className="min-w-full whitespace-nowrap text-left text-sm"><thead><tr className="border-b text-[11px] uppercase text-slate-400">{['Contrato', 'Identificación / nombre', 'Canal', 'Tipo', 'Teléfono 1', 'Teléfono 2', 'Celular', 'Correo', 'Dirección', 'Plan', 'Asesor', 'Sede / SubUEN', 'Entidad', 'Retiro'].map((head) => <th key={head} className="px-3 py-3">{head}</th>)}</tr></thead><tbody>{rows.slice(0, 200).map((row) => <tr key={row.id} className="border-b border-slate-100"><td className="px-3 py-3 font-black">{row.contrato}</td><td className="px-3 py-3"><p className="font-bold">{row.nombre}</p><p className="text-xs text-slate-500">{row.documento}</p></td><td className="px-3 py-3">{row.canal}</td><td className="px-3 py-3">{row.tipo_retiro}</td><td className="px-3 py-3">{row.telefono_1 || '—'}</td><td className="px-3 py-3">{row.telefono_2 || '—'}</td><td className="px-3 py-3">{row.celular || '—'}</td><td className="px-3 py-3">{row.correo || '—'}</td><td className="max-w-72 truncate px-3 py-3">{row.direccion || '—'}</td><td className="px-3 py-3">{row.plan}</td><td className="px-3 py-3">{row.asesor}</td><td className="px-3 py-3">{row.sede} · {row.subuen}</td><td className="px-3 py-3">{row.entidad}</td><td className="px-3 py-3">{row.fecha || '—'}</td></tr>)}</tbody></table></div></ChartCard> }
