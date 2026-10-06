import { ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react'

export default function PrevisionSubnav({ title, subtitle, items, active, onSelect, collapsed, onToggle, tone = 'teal' }) {
  const colors = tone === 'rose'
    ? { active: 'bg-rose-700 text-white shadow-sm', hover: 'hover:bg-rose-50 hover:text-rose-800', icon: 'bg-rose-50 text-rose-700', ring: 'focus:ring-rose-200' }
    : { active: 'bg-teal-800 text-white shadow-sm', hover: 'hover:bg-teal-50 hover:text-teal-900', icon: 'bg-teal-50 text-teal-800', ring: 'focus:ring-teal-200' }

  return <>
    <div className="relative lg:hidden">
      <select value={active} onChange={(event) => onSelect(event.target.value)} className={`h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm font-black text-slate-800 shadow-sm outline-none focus:ring-4 ${colors.ring}`}>
        {items.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-3.5 size-4 text-slate-500" />
    </div>
    <aside className={`sticky top-4 hidden self-start rounded-2xl border border-slate-200 bg-white p-2 shadow-sm transition-[width] duration-200 lg:block ${collapsed ? 'w-[4.25rem]' : 'w-56'}`}>
      <div className={`mb-2 flex items-center border-b border-slate-100 pb-2 ${collapsed ? 'justify-center' : 'justify-between gap-2 px-2'}`}>
        {!collapsed && <div className="min-w-0"><p className="truncate text-xs font-black uppercase tracking-[.16em] text-slate-800">{title}</p><p className="truncate text-[11px] font-semibold text-slate-400">{subtitle}</p></div>}
        <button type="button" onClick={onToggle} title={collapsed ? 'Expandir navegación' : 'Contraer navegación'} className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </button>
      </div>
      <nav className="space-y-1" aria-label={`Submódulos de ${title}`}>
        {items.map(({ id, label, icon: Icon }) => <button key={id} type="button" title={collapsed ? label : undefined} aria-current={active === id ? 'page' : undefined} onClick={() => onSelect(id)} className={`flex min-h-10 w-full items-center rounded-xl text-left text-xs font-black transition ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} ${active === id ? colors.active : `text-slate-600 ${colors.hover}`}`}>
          <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${active === id ? 'bg-white/15 text-white' : colors.icon}`}><Icon className="size-4" strokeWidth={2.2} /></span>
          {!collapsed && <span className="leading-4">{label}</span>}
        </button>)}
      </nav>
    </aside>
  </>
}
