import { money } from '../utils/dashboard.js'

const typeStyles = {
  PLAN: 'bg-blue-50 text-blue-700 ring-blue-100',
  RED: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  PARTICULAR: 'bg-orange-50 text-orange-700 ring-orange-100',
}

export default function DataTable({ rows }) {
  return (
    <section className="card-shadow overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white">
      <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-base font-black tracking-tight text-slate-950">Órdenes de servicio funerario</h3>
          <p className="mt-1 text-sm text-slate-500">Solo documentos finales cuya serie comienza por OSF.</p>
        </div>
        <span className="rounded-full bg-emerald-900 px-3 py-1 text-xs font-black text-white">
          {rows.length} registros
        </span>
      </div>

      <div className="overflow-x-auto p-4">
        <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
              <th className="px-3 py-2">OSF</th>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Sede</th>
              <th className="px-3 py-2">Fallecido</th>
              <th className="px-3 py-2">Encargado</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Adicional</th>
              <th className="px-3 py-2 text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 12).map((row) => (
              <tr key={row.id} className="group bg-slate-50 text-slate-700 transition hover:bg-emerald-50/70">
                <td className="rounded-l-2xl px-3 py-3 font-black">{row.osf}</td>
                <td className="px-3 py-3 font-bold">{row.fecha}</td>
                <td className="px-3 py-3 font-semibold">{row.sede}</td>
                <td className="px-3 py-3 font-black text-slate-950">{row.fallecido}</td>
                <td className="px-3 py-3">{row.gestor}</td>
                <td className="px-3 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ${typeStyles[row.tipo_homenaje] || 'bg-slate-100 text-slate-700 ring-slate-200'}`}>
                    {row.tipo_homenaje}
                  </span>
                </td>
                <td className="px-3 py-3">{row.estado}</td>
                <td className="px-3 py-3">{money(row.valor_excedente)}</td>
                <td className="rounded-r-2xl px-3 py-3 text-right font-black text-slate-950">{money(row.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > 12 && (
        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          Mostrando los primeros 12 registros. Ajusta filtros para ver un subconjunto más específico.
        </p>
      )}
    </section>
  )
}
