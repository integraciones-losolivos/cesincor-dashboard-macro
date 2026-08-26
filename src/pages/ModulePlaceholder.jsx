import { ArrowRight, Database, Filter, Layers3, TableProperties } from 'lucide-react'

const moduleFields = {
  prevision: ['Contrato', 'Convenio', 'Pagador', 'Beneficiario', 'Seguro', 'Estado', 'Vigencia', 'Factura'],
  cartera: ['Cliente', 'Contrato', 'Saldo', 'Edad cartera', 'Cuota', 'Recaudo', 'Vencimiento', 'Sede'],
  facturacion: ['Factura', 'Nota crédito', 'DocKey', 'TransId', 'Serie', 'Cliente', 'Valor', 'Estado'],
}

export default function ModulePlaceholder({ module, modules, setActiveModule }) {
  const Icon = module.icon
  const fields = moduleFields[module.id] || ['Sede', 'Fecha', 'Cliente', 'Valor']

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dcfce7_0,#f8fafc_34%,#f8fafc_100%)]">
      <section className="relative overflow-hidden border-b border-emerald-100 bg-gradient-to-br from-emerald-950 via-emerald-800 to-green-600 px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="absolute right-[-5rem] top-[-6rem] h-72 w-72 rounded-full bg-lime-300/20 blur-3xl" />
        <div className="absolute bottom-[-5rem] left-1/3 h-60 w-60 rounded-full bg-emerald-300/15 blur-3xl" />
        <div className="relative mx-auto flex max-w-7xl items-center gap-4">
          <div className="grid size-14 shrink-0 place-items-center rounded-[1.4rem] border border-white/15 bg-white/10 shadow-lg shadow-emerald-950/20">
            <Icon className="size-7" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-100">Área</p>
            <h1 className="mt-1 font-heading text-4xl font-bold tracking-[-0.04em] sm:text-5xl">{module.areaName}</h1>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_0.8fr] lg:px-8">
        <article className="card-shadow overflow-hidden rounded-[2rem] border border-emerald-100 bg-white">
          <div className="border-b border-emerald-100 bg-emerald-50/70 px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-white text-emerald-700 ring-1 ring-emerald-100">
                <Layers3 className="size-5" strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="font-heading text-xl font-bold text-slate-950">Vista {module.areaName}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">{module.description}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <Database className="size-6 text-emerald-700" strokeWidth={2.5} />
              <p className="mt-4 font-heading text-sm font-bold text-slate-950">JSON pendiente</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">Queda lista la vista para conectar el archivo de datos del módulo.</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <Filter className="size-6 text-emerald-700" strokeWidth={2.5} />
              <p className="mt-4 font-heading text-sm font-bold text-slate-950">Filtros macro</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">Se reutilizará el patrón de filtros por fecha, sede, cliente, estado y búsqueda.</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <TableProperties className="size-6 text-emerald-700" strokeWidth={2.5} />
              <p className="mt-4 font-heading text-sm font-bold text-slate-950">Detalle y KPIs</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">La estructura queda preparada para tarjetas, gráficas y tabla de detalle.</p>
            </div>
          </div>
        </article>

        <aside className="card-shadow rounded-[2rem] border border-slate-200/70 bg-white p-6">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Campos sugeridos</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {fields.map((field) => (
              <span key={field} className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-800">
                {field}
              </span>
            ))}
          </div>

          <div className="mt-6 rounded-3xl bg-gradient-to-br from-emerald-950 to-green-700 p-5 text-white">
            <p className="font-heading text-base font-bold">Cambio de módulo funcionando</p>
            <p className="mt-2 text-sm leading-6 text-emerald-50">Selecciona otra vista para validar que el switch navega entre áreas sin autenticación ni rutas complejas.</p>
          </div>

          <div className="mt-5 grid gap-2">
            {modules.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveModule(item.id)}
                className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                  item.id === module.id
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/70'
                }`}
              >
                <span className="text-sm font-black">{item.name}</span>
                <ArrowRight className="size-4" strokeWidth={2.5} />
              </button>
            ))}
          </div>
        </aside>
      </section>
    </main>
  )
}
