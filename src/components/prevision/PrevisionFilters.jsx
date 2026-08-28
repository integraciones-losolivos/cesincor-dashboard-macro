import { CalendarDays, Filter, RotateCcw, Search } from 'lucide-react'
import SelectField from '../SelectField.jsx'
import { number } from '../../utils/dashboard.js'

export default function PrevisionFilters({ filters, setFilters, options, resultCount, initialFilters, availableDateRange }) {
  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }))
  const setPeriod = (period) => {
    if (!availableDateRange) return

    if (period === 'all') {
      setFilters((current) => ({ ...current, fechaInicial: '', fechaFinal: '' }))
      return
    }

    if (period === 'sixMonths') {
      const [year, month] = availableDateRange.latestMonthStart.split('-').map(Number)
      const start = new Date(year, month - 6, 1)
      const fechaInicial = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`
      setFilters((current) => ({ ...current, fechaInicial, fechaFinal: availableDateRange.latestMonthEnd }))
      return
    }

    setFilters((current) => ({
      ...current,
      fechaInicial: availableDateRange.latestMonthStart,
      fechaFinal: availableDateRange.latestMonthEnd,
    }))
  }

  const resetFilters = () => setFilters({
    ...initialFilters,
    fechaInicial: availableDateRange?.latestMonthStart || '',
    fechaFinal: availableDateRange?.latestMonthEnd || '',
  })

  return (
    <section className="card-shadow overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
      <div className="grid gap-4 border-b border-slate-100 bg-slate-950 p-4 text-white lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/10">
              <Filter className="size-5" strokeWidth={2.4} />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Filtros ejecutivos</h2>
            <p className="mt-1 text-sm leading-5 text-slate-300">Panel compacto alineado a Crystal: Tipo de afiliación, localidad, convenio, plan, asesora y estado.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <div className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-bold text-white">
            {number(resultCount)} registros
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-white transition hover:bg-white/20"
          >
            <RotateCcw className="size-3.5" strokeWidth={2.5} />
            Restablecer
          </button>
        </div>
      </div>

      <div className="border-b border-slate-100 px-4 py-4">
        <p className="mb-3 text-sm font-black text-slate-700">Periodo de consulta</p>
        <div className="flex flex-wrap gap-2">
          <PeriodButton
            active={filters.fechaInicial === availableDateRange?.latestMonthStart && filters.fechaFinal === availableDateRange?.latestMonthEnd}
            onClick={() => setPeriod('latest')}
          >
            Último mes con datos
          </PeriodButton>
          <PeriodButton onClick={() => setPeriod('sixMonths')}>Últimos 6 meses</PeriodButton>
          <PeriodButton active={!filters.fechaInicial && !filters.fechaFinal} onClick={() => setPeriod('all')}>
            Todo el año
          </PeriodButton>
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
              placeholder="Contrato, convenio, asesor..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-bold text-slate-700 outline-none transition placeholder:font-medium placeholder:text-slate-400 hover:border-slate-300 focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
            />
          </div>
        </label>

        <DateFilter label="Desde" value={filters.fechaInicial} onChange={(value) => updateFilter('fechaInicial', value)} />
        <DateFilter label="Hasta" value={filters.fechaFinal} onChange={(value) => updateFilter('fechaFinal', value)} />
        <SelectField label="Tipo de afiliación" value={filters.uen} onChange={(value) => updateFilter('uen', value)} options={options.uens} />
        <SelectField label="Localidad" value={filters.localidad} onChange={(value) => updateFilter('localidad', value)} options={options.localidades} />
        <SelectField label="Asesora" value={filters.asesor} onChange={(value) => updateFilter('asesor', value)} options={options.asesores} />
        <SelectField label="Convenio" value={filters.convenio} onChange={(value) => updateFilter('convenio', value)} options={options.convenios} />
        <SelectField label="Plan" value={filters.plan} onChange={(value) => updateFilter('plan', value)} options={options.planes} />
        <SelectField label="Periodicidad" value={filters.periodicidad} onChange={(value) => updateFilter('periodicidad', value)} options={options.periodicidades} />
        <SelectField label="Cobrador" value={filters.cobrador} onChange={(value) => updateFilter('cobrador', value)} options={options.cobradores} />
        <SelectField label="Tipo afiliado" value={filters.tipoAfiliado} onChange={(value) => updateFilter('tipoAfiliado', value)} options={options.tiposAfiliado} />
        <SelectField label="Estado persona" value={filters.movimiento} onChange={(value) => updateFilter('movimiento', value)} options={options.movimientos} />
        <SelectField label="Estado contrato" value={filters.estadoContrato} onChange={(value) => updateFilter('estadoContrato', value)} options={options.estadosContrato} />
      </div>
    </section>
  )
}

function PeriodButton({ active = false, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-black transition ${
        active
          ? 'border-teal-700 bg-teal-700 text-white shadow-sm'
          : 'border-slate-300 bg-white text-slate-700 hover:border-teal-600 hover:bg-teal-50'
      }`}
    >
      {children}
    </button>
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
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-bold text-slate-700 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
        />
      </div>
    </label>
  )
}
