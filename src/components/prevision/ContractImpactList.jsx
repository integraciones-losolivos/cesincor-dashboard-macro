import { money, number } from '../../utils/dashboard.js'

const palette = ['#0f766e', '#2563eb', '#f59e0b', '#be123c', '#6d28d9', '#475569']

export default function ContractImpactList({ contracts }) {
  return (
    <div className="space-y-3">
      {contracts.slice(0, 7).map((item, index) => (
        <article key={item.contrato} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="grid size-7 place-items-center rounded-lg text-xs font-black text-white" style={{ backgroundColor: palette[index % palette.length] }}>
                  {index + 1}
                </span>
                <h4 className="font-black text-slate-950">{item.contrato}</h4>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${item.estado_contrato === 'RETIRADO' ? 'bg-rose-50 text-rose-700' : 'bg-teal-50 text-teal-700'}`}>
                  {item.estado_contrato}
                </span>
              </div>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                {item.convenio} - {item.sede} - {item.tipos}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-black text-teal-700">{money(item.ingreso_mensual)}</p>
              <p className="text-xs font-semibold text-slate-500">{number(item.afiliaciones)} personas</p>
            </div>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
            <div className="h-full rounded-full bg-teal-600" style={{ width: `${Math.min(100, Math.max(7, item.afiliaciones * 8))}%` }} />
          </div>
        </article>
      ))}
    </div>
  )
}
