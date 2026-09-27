import { CalendarDays, Filter, RefreshCw, RotateCcw, Search } from 'lucide-react'
import SelectField from '../SelectField.jsx'
import { number } from '../../utils/dashboard.js'

export default function IncomeFilters({ filters, setFilters, options, resultCount, loading, onRefresh }) {
  const update = (key, value) => setFilters((current) => ({ ...current, [key]: value }))
  const reset = () => setFilters((current) => ({
    ...current,
    search: '', sede: 'TODOS', plan: 'TODOS', convenio: 'TODOS', asesor: 'TODOS',
    tipoAfiliado: 'TODOS', parentesco: 'TODOS', estado: 'ACTIVO', fechaInicial: '', fechaFinal: '',
  }))

  return (
    <section className="card-shadow overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
      <div className="grid gap-4 border-b border-cyan-900/20 bg-gradient-to-r from-slate-950 to-cyan-950 p-4 text-white lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/10"><Filter className="size-5" /></div>
          <div><h2 className="text-lg font-bold">Filtros de ingresos</h2><p className="mt-1 text-sm text-cyan-100/85">Personas protegidas y portafolio activo por contrato, sede, plan, convenio y responsable.</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <span className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-bold">{number(resultCount)} protegidos</span>
          <button type="button" onClick={onRefresh} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 text-sm font-black hover:bg-white/20 disabled:opacity-60"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</button>
          <button type="button" onClick={reset} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 text-sm font-black hover:bg-white/20"><RotateCcw className="size-4" />Restablecer</button>
        </div>
      </div>
      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-6">
        <label className="space-y-2 xl:col-span-2"><Label>Buscar</Label><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input value={filters.search} onChange={(event) => update('search', event.target.value)} placeholder="Contrato, sede, convenio, asesor..." className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm font-bold outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100" /></div></label>
        <DateField label="Ingreso desde" value={filters.fechaInicial} onChange={(value) => update('fechaInicial', value)} />
        <DateField label="Ingreso hasta" value={filters.fechaFinal} onChange={(value) => update('fechaFinal', value)} />
        <SelectField label="Sede" value={filters.sede} onChange={(value) => update('sede', value)} options={options.sedes} />
        <SelectField label="Plan" value={filters.plan} onChange={(value) => update('plan', value)} options={options.planes} />
        <SelectField label="Convenio" value={filters.convenio} onChange={(value) => update('convenio', value)} options={options.convenios} />
        <SelectField label="Responsable / asesor" value={filters.asesor} onChange={(value) => update('asesor', value)} options={options.asesores} />
        <SelectField label="Tipo protegido" value={filters.tipoAfiliado} onChange={(value) => update('tipoAfiliado', value)} options={options.tiposAfiliado} />
        <SelectField label="Parentesco" value={filters.parentesco} onChange={(value) => update('parentesco', value)} options={options.parentescos} />
        <SelectField label="Estado" value={filters.estado} onChange={(value) => update('estado', value)} options={options.estados} />
      </div>
      <p className="border-t border-slate-100 px-4 py-3 text-xs font-semibold text-slate-500">Las fechas consultan contratos que tuvieron ingresos de personas en el periodo y muestran su composición completa, según la consulta de negocio.</p>
    </section>
  )
}

function Label({ children }) { return <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{children}</span> }
function DateField({ label, value, onChange }) {
  return <label className="space-y-2"><Label>{label}</Label><div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm font-bold outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100" /></div></label>
}

