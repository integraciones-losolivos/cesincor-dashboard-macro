import { SearchX } from 'lucide-react'

export default function EmptyState() {
  return (
    <div className="card-shadow rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center">
      <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-emerald-50 text-emerald-700">
        <SearchX className="size-7" strokeWidth={2.4} />
      </div>
      <h3 className="mt-4 text-lg font-black text-slate-950">Sin resultados</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        No hay homenajes que coincidan con los filtros seleccionados. Limpia filtros o amplía el rango de fechas.
      </p>
    </div>
  )
}
