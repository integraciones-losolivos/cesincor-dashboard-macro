import { Construction } from 'lucide-react'

export default function ModulePlaceholder({ module }) {
  const Icon = module.icon

  return (
    <main className="grid min-h-[calc(100vh-4.5rem)] place-items-center bg-slate-50 px-6 py-12">
      <section className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-950/5 sm:p-12">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-slate-100 text-slate-600">
          <Icon className="size-7" strokeWidth={2.4} />
        </div>
        <div className="mx-auto mt-5 flex w-fit items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-amber-700">
          <Construction className="size-3.5" /> En preparación
        </div>
        <h1 className="mt-5 font-heading text-3xl font-bold text-slate-950">Módulo de {module.name}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-slate-500">
          Este módulo aún no se ha implementado. Estará disponible próximamente.
        </p>
      </section>
    </main>
  )
}
