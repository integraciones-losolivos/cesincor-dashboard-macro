import { CalendarDays, RotateCcw, Search, SlidersHorizontal } from 'lucide-react'
import SelectField from './SelectField.jsx'

export default function FilterPanel({ filters, setFilters, options, resetFilters, resultCount }) {
  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }))

  return (
    <section className="card-shadow overflow-hidden rounded-2xl border border-slate-200/70 bg-white">
      <div className="grid gap-4 bg-gradient-to-br from-emerald-950 via-emerald-900 to-green-700 p-4 text-white lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/10">
              <SlidersHorizontal className="size-5" strokeWidth={2.4} />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Filtros macro</h2>
            <p className="mt-1 text-sm leading-5 text-slate-300">Cruza fechas, sede, encargado, tipo de homenaje, servicio y municipio sobre las OSF finales.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <div className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-bold text-white">
            {resultCount} registros
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black text-white transition hover:bg-white/20"
          >
            <RotateCcw className="size-3.5" strokeWidth={2.5} />
            Limpiar
          </button>
        </div>
      </div>

      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-6">
        <label className="space-y-2 xl:col-span-2">
          <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Buscar</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" strokeWidth={2.4} />
            <input
              value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
              placeholder="OSF, fallecido, encargado, clínica..."
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-bold text-slate-700 outline-none transition placeholder:font-medium placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </div>
        </label>

        <DateFilter label="Desde" value={filters.fechaInicial} onChange={(value) => updateFilter('fechaInicial', value)} />
        <DateFilter label="Hasta" value={filters.fechaFinal} onChange={(value) => updateFilter('fechaFinal', value)} />

        <SelectField label="Sede" value={filters.sede} onChange={(value) => updateFilter('sede', value)} options={options.sedes} />
        <SelectField label="Encargado" value={filters.gestor} onChange={(value) => updateFilter('gestor', value)} options={options.gestores} />
        <SelectField label="Tipo homenaje" value={filters.tipoHomenaje} onChange={(value) => updateFilter('tipoHomenaje', value)} options={options.tiposHomenaje} />
        <SelectField label="Tipo excedente" value={filters.tipoExcedente} onChange={(value) => updateFilter('tipoExcedente', value)} options={options.tiposExcedente} />
        <SelectField label="Lugar fallecimiento" value={filters.lugarFallecimiento} onChange={(value) => updateFilter('lugarFallecimiento', value)} options={options.lugaresFallecimiento} />
        <SelectField label="Tipo servicio" value={filters.tipoServicio} onChange={(value) => updateFilter('tipoServicio', value)} options={options.tiposServicio} />
        <SelectField label="Municipio" value={filters.municipio} onChange={(value) => updateFilter('municipio', value)} options={options.municipios} />
      </div>
    </section>
  )
}

function DateFilter({ label, value, onChange }) {
  return (
    <label className="space-y-2">
      <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</span>
      <div className="relative">
        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" strokeWidth={2.4} />
        <input
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-bold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
        />
      </div>
    </label>
  )
}
