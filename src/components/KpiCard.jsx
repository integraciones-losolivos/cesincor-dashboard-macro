export default function KpiCard({ title, value, helper, icon, accent = 'blue' }) {
  const styles = {
    blue: 'from-emerald-600 to-green-500 text-emerald-700 bg-emerald-50 border-emerald-100',
    violet: 'from-violet-600 to-fuchsia-500 text-violet-600 bg-violet-50 border-violet-100',
    orange: 'from-orange-500 to-amber-400 text-orange-600 bg-orange-50 border-orange-100',
    emerald: 'from-emerald-600 to-teal-500 text-emerald-600 bg-emerald-50 border-emerald-100',
  }
  const selected = styles[accent] || styles.blue

  return (
    <article className="card-shadow relative overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white p-5">
      <div className={`absolute -right-10 -top-10 size-28 rounded-full bg-gradient-to-br opacity-15 ${selected}`} />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="font-heading text-sm font-bold text-slate-500">{title}</p>
          <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{value}</h3>
        </div>
        <div className={`grid size-12 place-items-center rounded-2xl border text-xl ${selected}`}>
          {icon}
        </div>
      </div>
      {helper && <p className="relative mt-4 text-xs leading-5 text-slate-500">{helper}</p>}
    </article>
  )
}
