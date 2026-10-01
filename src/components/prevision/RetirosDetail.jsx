import { useEffect, useMemo, useState } from 'react'
import { ArrowUpDown, ChevronDown, ChevronUp, Columns3 } from 'lucide-react'
import ChartCard from '../ChartCard.jsx'
import { number } from '../../utils/dashboard.js'
import { isContactable, permanenceRange, PERMANENCE_RANGES } from '../../utils/retiros.js'

const PAGE_SIZE = 25
const columns = [
  ['contrato', 'Contrato'], ['documento', 'Identificación'], ['nombre', 'Nombre'], ['canal', 'Canal'], ['tipo_retiro', 'Tipo de retiro'],
  ['plan', 'Plan'], ['asesor', 'Asesor'], ['sede', 'Sede'], ['entidad', 'Entidad'], ['fecha', 'Fecha de retiro'],
  ['meses_vigencia', 'Vigencia'], ['estado_contrato', 'Estado'], ['numero_convenio', 'N.º convenio'], ['tipo_contratante', 'Tipo contratante'],
  ['telefono_1', 'Teléfono 1'], ['telefono_2', 'Teléfono 2'], ['celular', 'Celular'], ['correo', 'Correo'], ['direccion', 'Dirección'],
  ['subuen', 'SubUEN'], ['fecha_ingreso', 'Fecha de ingreso'], ['causal_retiro', 'Causal'], ['retiros_contratante', 'Retiros contratante'], ['retiros_asegurado_principal', 'Retiros asegurado principal'],
]
const initialColumns = new Set(['contrato', 'documento', 'nombre', 'canal', 'tipo_retiro', 'plan', 'asesor', 'sede', 'entidad', 'fecha', 'meses_vigencia', 'estado_contrato'])
function repeatCount(row) { const values = [row.retiros_contratante, row.retiros_asegurado_principal].filter((value) => Number.isFinite(value)); return values.length ? Math.max(...values) : null }

export default function RetirosDetail({ rows }) {
  const [contact, setContact] = useState('TODOS')
  const [repeat, setRepeat] = useState('TODOS')
  const [range, setRange] = useState('TODOS')
  const [sort, setSort] = useState({ key: 'fecha', direction: 'desc' })
  const [page, setPage] = useState(1)
  const [visibleColumns, setVisibleColumns] = useState(initialColumns)
  const [showColumns, setShowColumns] = useState(false)
  const [expanded, setExpanded] = useState('')
  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const count = repeatCount(row)
      return (contact === 'TODOS' || (contact === 'CONTACTABLE' ? isContactable(row) : !isContactable(row))) &&
        (repeat === 'TODOS' || (repeat === 'PRIMERO' ? count === 1 : repeat === 'REINCIDENTE' ? count > 1 : count === null)) &&
        (range === 'TODOS' || permanenceRange(row)?.key === range)
    })
  }, [rows, contact, repeat, range])
  const sorted = useMemo(() => [...filtered].sort((a, b) => { const left = a[sort.key] ?? '', right = b[sort.key] ?? ''; const result = typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right), 'es'); return sort.direction === 'asc' ? result : -result }), [filtered, sort])
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const activeColumns = columns.filter(([key]) => visibleColumns.has(key))
  useEffect(() => setPage(1), [contact, repeat, range])
  useEffect(() => { if (page > pages) setPage(pages) }, [page, pages])
  const toggleColumn = (key) => setVisibleColumns((current) => { const next = new Set(current); if (next.has(key) && next.size > 1) next.delete(key); else next.add(key); return next })
  const changeSort = (key) => setSort((current) => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }))
  return <div className="space-y-6">
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid gap-3 md:grid-cols-3"><select value={contact} onChange={(event) => setContact(event.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-bold"><option value="TODOS">Toda contactabilidad</option><option value="CONTACTABLE">Contactable</option><option value="NO_CONTACTABLE">No contactable</option></select><select value={repeat} onChange={(event) => setRepeat(event.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-bold"><option value="TODOS">Toda reincidencia</option><option value="PRIMERO">Primer retiro</option><option value="REINCIDENTE">Más de un retiro</option><option value="SIN_DATO">Sin dato de reincidencia</option></select><select value={range} onChange={(event) => setRange(event.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-bold"><option value="TODOS">Toda permanencia</option>{PERMANENCE_RANGES.map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}</select></div></div>
    <ChartCard title="Detalle consolidado de retiros" subtitle={`${number(filtered.length)} registros filtrados de ${number(rows.length)}; cada fila conserva su tipo de retiro original.`} right={<button type="button" onClick={() => setShowColumns((value) => !value)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-black"><Columns3 className="size-4" />Columnas</button>}>
      {showColumns && <div className="mb-4 flex flex-wrap gap-2 rounded-xl bg-slate-50 p-3">{columns.map(([key, label]) => <label key={key} className="inline-flex items-center gap-2 rounded-lg bg-white px-2 py-1.5 text-xs font-bold"><input type="checkbox" checked={visibleColumns.has(key)} onChange={() => toggleColumn(key)} />{label}</label>)}</div>}
      <div className="overflow-x-auto"><table className="min-w-full whitespace-nowrap text-left text-sm"><thead><tr className="border-b text-[11px] uppercase tracking-[.08em] text-slate-400"><th className="w-10 px-2 py-3" />{activeColumns.map(([key, label]) => <th key={key} className="px-3 py-3"><button type="button" onClick={() => changeSort(key)} className="inline-flex items-center gap-1 font-black">{label}<ArrowUpDown className="size-3" /></button></th>)}</tr></thead><tbody>{pageRows.map((row) => <Row key={row.id} row={row} activeColumns={activeColumns} expanded={expanded === row.id} toggle={() => setExpanded((current) => current === row.id ? '' : row.id)} />)}</tbody></table></div>
      <div className="mt-4 flex items-center justify-end gap-3"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border px-3 py-1.5 text-xs font-black disabled:opacity-40">Anterior</button><span className="text-xs font-bold text-slate-500">Página {page} de {pages}</span><button type="button" disabled={page >= pages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border px-3 py-1.5 text-xs font-black disabled:opacity-40">Siguiente</button></div>
    </ChartCard>
  </div>
}

function display(row, key) { if (key === 'meses_vigencia') return `${number(row[key])} meses`; if (key === 'retiros_contratante' || key === 'retiros_asegurado_principal') return row[key] === null ? '—' : number(row[key]); return row[key] || '—' }
function Row({ row, activeColumns, expanded, toggle }) { return <><tr className="border-b border-slate-100 hover:bg-slate-50"><td className="px-2 py-3"><button type="button" onClick={toggle} aria-label={expanded ? 'Cerrar detalle' : 'Abrir detalle'}>{expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}</button></td>{activeColumns.map(([key]) => <td key={key} className={`max-w-64 truncate px-3 py-3 ${key === 'contrato' ? 'font-black' : ''}`}>{display(row, key)}</td>)}</tr>{expanded && <tr className="border-b border-slate-200 bg-slate-50"><td colSpan={activeColumns.length + 1} className="p-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{columns.map(([key, label]) => <div key={key}><p className="text-[10px] font-black uppercase text-slate-400">{label}</p><p className="mt-1 break-words text-sm font-bold text-slate-800">{display(row, key)}</p></div>)}</div><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Info label="Asegurado principal" value={`${row.cedula_asegurado_principal || '—'} · ${row.asegurado_principal}`} /><Info label="Municipio" value={row.municipio} /><Info label="Días de permanencia" value={row.dias_permanencia === null ? 'Sin cálculo' : number(row.dias_permanencia)} /><Info label="Contactabilidad" value={isContactable(row) ? 'CONTACTABLE' : 'NO CONTACTABLE'} /></div></td></tr>}</> }
function Info({ label, value }) { return <div><p className="text-[10px] font-black uppercase text-slate-400">{label}</p><p className="mt-1 text-sm font-bold text-slate-800">{value || '—'}</p></div> }
