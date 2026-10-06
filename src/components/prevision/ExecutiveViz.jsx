import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts'
import { number, percent } from '../../utils/dashboard.js'

export function RankingList({ data = [], valueKey = 'cantidad', formatter = number, color = '#0f766e', limit = 10, onSelect }) {
  const rows = data.slice(0, limit)
  const maximum = Math.max(...rows.map((item) => Number(item[valueKey] || 0)), 1)
  return <div className="space-y-1.5">{rows.map((item, index) => {
    const value = Number(item[valueKey] || 0)
    return <button key={`${item.name}-${index}`} type="button" onClick={() => onSelect?.(item.name)} className={`group grid w-full grid-cols-[1.7rem_minmax(0,1fr)_auto] items-center gap-2 rounded-xl px-2.5 py-2 text-left transition ${onSelect ? 'hover:bg-slate-50' : 'cursor-default'}`}>
      <span className="grid size-7 place-items-center rounded-lg bg-slate-100 text-[11px] font-black text-slate-500">{index + 1}</span>
      <span className="min-w-0"><span className="block truncate text-xs font-black text-slate-700">{item.name}</span><span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full transition-all group-hover:brightness-95" style={{ width: `${Math.max(3, value / maximum * 100)}%`, backgroundColor: color }} /></span></span>
      <strong className="text-xs text-slate-900">{formatter(value)}</strong>
    </button>
  })}{!rows.length && <p className="py-8 text-center text-sm font-bold text-slate-400">Sin datos para mostrar</p>}</div>
}

export function ShareStrip({ data = [], valueKey = 'cantidad', colors = ['#0f766e', '#2563eb', '#f59e0b', '#7c3aed'] }) {
  const total = data.reduce((sum, item) => sum + Number(item[valueKey] || 0), 0)
  return <div className="space-y-4"><div className="flex h-4 overflow-hidden rounded-full bg-slate-100">{data.map((item, index) => <span key={item.name} title={`${item.name}: ${number(item[valueKey])}`} style={{ width: `${total ? Number(item[valueKey] || 0) / total * 100 : 0}%`, backgroundColor: colors[index % colors.length] }} />)}</div><div className="grid gap-2 sm:grid-cols-2">{data.map((item, index) => <div key={item.name} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"><div className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} /><span className="truncate text-[11px] font-black uppercase tracking-wide text-slate-500">{item.name}</span></div><div className="mt-1 flex items-end justify-between"><strong className="text-lg text-slate-950">{number(item[valueKey])}</strong><span className="text-xs font-black text-slate-500">{percent(total ? Number(item[valueKey] || 0) / total : 0)}</span></div></div>)}</div></div>
}

export function Sparkline({ data = [], dataKey = 'total', color = '#0f766e' }) {
  return <div className="h-12 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><defs><linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.3} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs><Tooltip contentStyle={{ fontSize: 11, borderRadius: 10 }} /><Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.2} fill={`url(#spark-${color.replace('#', '')})`} dot={false} /></AreaChart></ResponsiveContainer></div>
}

export function ProgressList({ data = [], valueKey, formatter = number, color = '#0f766e', limit = 10 }) {
  const rows = data.slice(0, limit), max = Math.max(...rows.map((item) => Number(item[valueKey] || 0)), 1)
  return <div className="space-y-3">{rows.map((item) => <div key={item.name}><div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="truncate font-bold text-slate-600">{item.name}</span><strong>{formatter(item[valueKey])}</strong></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${Number(item[valueKey] || 0) / max * 100}%`, backgroundColor: color }} /></div></div>)}</div>
}
