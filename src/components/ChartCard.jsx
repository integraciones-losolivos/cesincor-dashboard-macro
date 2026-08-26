export default function ChartCard({ title, subtitle, children, className = '', accent = 'blue', right }) {
  const accents = {
    blue: 'from-emerald-600 to-green-400',
    violet: 'from-violet-500 to-fuchsia-400',
    orange: 'from-orange-500 to-amber-400',
    emerald: 'from-emerald-500 to-teal-400',
    rose: 'from-rose-500 to-pink-400',
    slate: 'from-slate-800 to-slate-500',
  }

  return (
    <section className={`card-shadow overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white ${className}`}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div className="flex gap-3">
          <span className={`mt-1 h-10 w-1.5 rounded-full bg-gradient-to-b ${accents[accent] || accents.blue}`} />
          <div>
            <h3 className="text-lg font-black tracking-tight text-slate-950">{title}</h3>
            {subtitle && <p className="mt-1 text-base leading-6 text-slate-600">{subtitle}</p>}
          </div>
        </div>
        {right}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}
