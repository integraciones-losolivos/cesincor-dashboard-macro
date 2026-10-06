export default function SelectField({ label, value, onChange, options }) {
  return (
    <label className="space-y-2">
      <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none transition hover:border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
      >
        <option value="TODOS">Todos</option>
        {options.map((option) => (
          <option value={typeof option === 'object' ? option.value : option} key={typeof option === 'object' ? option.value : option}>
            {typeof option === 'object' ? option.label : option}
          </option>
        ))}
      </select>
    </label>
  )
}
