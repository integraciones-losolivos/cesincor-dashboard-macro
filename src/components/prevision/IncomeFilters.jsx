import { CalendarDays, RefreshCw, RotateCcw, Search, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import SelectField from '../SelectField.jsx'
import { number } from '../../utils/dashboard.js'

const contextual = {
  general: ['search', 'plan', 'convenio', 'tipoAfiliado'], comercial: ['asesor', 'convenio', 'plan'], asesores: ['asesor', 'convenio', 'plan'],
  composicion: ['tipoAfiliado', 'parentesco', 'estado'], sedes: ['asesor', 'plan', 'convenio'], planes: ['plan', 'asesor', 'convenio'],
  convenios: ['convenio', 'asesor', 'plan'], parentescos: ['parentesco', 'tipoAfiliado', 'estado'],
}

export default function IncomeFilters({ sectionView = 'general', filters, setFilters, options, resultCount, loading, onRefresh }) {
  const [expanded, setExpanded] = useState(false)
  const keys = contextual[sectionView] || contextual.general
  const update = (key, value) => setFilters((current) => ({ ...current, [key]: value }))
  const reset = () => setFilters((current) => ({
    ...current,
    search: '', sede: 'TODOS', plan: 'TODOS', convenio: 'TODOS', asesor: 'TODOS',
    tipoAfiliado: 'TODOS', parentesco: 'TODOS', estado: 'ACTIVO', fechaInicial: '', fechaFinal: '',
  }))

  return (
    <section className="card-shadow rounded-2xl border border-slate-200/80 bg-white p-3">
      <div className="flex flex-wrap items-end gap-2">
        <DateField label="Ingreso desde" value={filters.fechaInicial} onChange={(value) => update('fechaInicial', value)} />
        <DateField label="Ingreso hasta" value={filters.fechaFinal} onChange={(value) => update('fechaFinal', value)} />
        <div className="min-w-40 flex-1 xl:max-w-52"><SelectField label="Sede" value={filters.sede} onChange={(value) => update('sede', value)} options={options.sedes} /></div>
        <button type="button" onClick={() => setExpanded((value) => !value)} className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-black ${expanded ? 'border-teal-200 bg-teal-50 text-teal-900' : 'border-slate-200 text-slate-600'}`}><SlidersHorizontal className="size-4" />Más filtros ({keys.length})</button>
        <span className="ml-auto self-center rounded-full bg-teal-50 px-3 py-1.5 text-xs font-black text-teal-800">{number(resultCount)} protegidos</span>
        <button type="button" onClick={reset} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-600"><RotateCcw className="size-4" />Limpiar</button>
        <button type="button" onClick={onRefresh} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-xl bg-teal-800 px-3 text-xs font-black text-white disabled:opacity-60"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</button>
      </div>
      {expanded && <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 md:grid-cols-2 xl:grid-cols-4">
        {keys.includes('search') && <label className="space-y-1"><Label>Buscar</Label><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input value={filters.search} onChange={(event) => update('search', event.target.value)} placeholder="Contrato, convenio, asesor…" className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-xs font-bold outline-none focus:border-teal-600" /></div></label>}
        {keys.includes('plan') && <SelectField label="Plan" value={filters.plan} onChange={(value) => update('plan', value)} options={options.planes} />}
        {keys.includes('convenio') && <SelectField label="Convenio" value={filters.convenio} onChange={(value) => update('convenio', value)} options={options.convenios} />}
        {keys.includes('asesor') && <SelectField label="Responsable / asesor" value={filters.asesor} onChange={(value) => update('asesor', value)} options={options.asesores} />}
        {keys.includes('tipoAfiliado') && <SelectField label="Tipo protegido" value={filters.tipoAfiliado} onChange={(value) => update('tipoAfiliado', value)} options={options.tiposAfiliado} />}
        {keys.includes('parentesco') && <SelectField label="Parentesco" value={filters.parentesco} onChange={(value) => update('parentesco', value)} options={options.parentescos} />}
        {keys.includes('estado') && <SelectField label="Estado" value={filters.estado} onChange={(value) => update('estado', value)} options={options.estados} />}
      </div>}
      <p className="mt-2 text-[11px] font-semibold text-slate-400">Fecha y sede se conservan entre vistas; los demás filtros pertenecen al análisis seleccionado.</p>
    </section>
  )
}

function Label({ children }) { return <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{children}</span> }
function DateField({ label, value, onChange }) {
  return <label className="min-w-40 flex-1 space-y-1 xl:max-w-44"><Label>{label}</Label><div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-xs font-bold outline-none focus:border-teal-600" /></div></label>
}

