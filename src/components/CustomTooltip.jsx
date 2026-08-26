import { money, number } from '../utils/dashboard.js'

const valueFormatters = {
  valor: money,
  valor_excedente: money,
  excedentes: money,
  valor_cubierto: money,
  perdida_mensual: money,
  ingreso_mensual: money,
  balance: money,
  valor: money,
  valor_plan_base: money,
  valor_adicional: money,
  valor_asistencia: money,
  valor_seguro: money,
  valor_mascota: money,
  valor_club: money,
  cantidad: number,
  servicios: number,
  retiros: number,
  afiliaciones: number,
  total_personas: number,
  total_titulares: number,
  total_beneficiarios: number,
  total_mascotas: number,
}

export default function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  return (
    <div className="min-w-48 rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-2xl shadow-slate-900/10 backdrop-blur">
      <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
      <div className="space-y-1.5">
        {payload.map((item) => {
          const formatter = valueFormatters[item.dataKey] || valueFormatters[item.name] || number
          return (
            <div key={`${item.dataKey}-${item.name}`} className="flex items-center justify-between gap-5 text-sm">
              <span className="flex items-center gap-2 font-semibold text-slate-600">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
                {item.name}
              </span>
              <span className="font-black text-slate-950">{formatter(item.value)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
