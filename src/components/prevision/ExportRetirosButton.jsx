import { useState } from 'react'
import { Download, LoaderCircle } from 'lucide-react'
import { exportRowsToExcel } from '../../utils/exportExcel.js'

export default function ExportRetirosButton({ rows = [], filename = 'detalle-retiros', label = 'Exportar Excel', className = '' }) {
  const [exporting, setExporting] = useState(false)
  if (!rows.length) return null
  const download = async () => {
    setExporting(true)
    try { await exportRowsToExcel(rows, { filename }) }
    finally { setExporting(false) }
  }
  return <button type="button" disabled={exporting} onClick={download} className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}>{exporting ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />}{exporting ? 'Generando…' : label}</button>
}
