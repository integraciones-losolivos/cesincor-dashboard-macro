import { LayoutDashboard } from 'lucide-react'

export default function App() {
  return (
    <main className="grid min-h-screen place-items-center bg-emerald-50 px-6">
      <section className="max-w-xl rounded-3xl border border-emerald-100 bg-white p-10 text-center shadow-xl shadow-emerald-950/10">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-800 text-white">
          <LayoutDashboard className="size-7" />
        </div>
        <h1 className="mt-6 font-heading text-3xl font-bold text-slate-950">
          Dashboard Gerencial
        </h1>
        <p className="mt-3 text-slate-600">
          Base del portal de reportes web de Cesincor.
        </p>
      </section>
    </main>
  )
}
