import { money } from '../../utils/dashboard.js'

export default function ExecutiveBalance({ kpis }) {
  return (
    <section className="card-shadow overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
      <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="bg-slate-950 p-6 text-white">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-200">Lectura para junta</p>
          <h2 className="mt-3 text-2xl font-black tracking-tight">Cartera mensual activa: {money(kpis.ingresoMensual)}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            La vista consolida contratos activos y sus personas asociadas, sin listar beneficiarios uno por uno. La lectura prioriza volumen,
            composicion de afiliados y valor mensual proyectado para el informe ejecutivo.
          </p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-slate-100 bg-white">
          <div className="p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Personas por contrato</p>
            <p className="mt-3 text-2xl font-black text-slate-950">{kpis.personasPorContrato.toFixed(1)}</p>
          </div>
          <div className="p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Ingreso anualizado</p>
            <p className="mt-3 text-2xl font-black text-teal-700">{money(kpis.ingresoAnualizado)}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
