import { useMemo, useState } from 'react'
import {
  Banknote,
  HandHeart,
  LayoutDashboard,
  ReceiptText,
  ShieldCheck,
} from 'lucide-react'
import HomenajesDashboard from './pages/HomenajesDashboard.jsx'
import ModulePlaceholder from './pages/ModulePlaceholder.jsx'

const modules = [
  {
    id: 'prevision',
    name: 'Previsión',
    areaName: 'Previsión Exequial',
    status: 'Activo',
    icon: ShieldCheck,
    description: 'Retiros, contratos retirados, titulares, adicionales, mascotas y afiliaciones exequiales.',
  },
  {
    id: 'homenajes',
    name: 'Homenajes',
    areaName: 'Homenajes',
    status: 'Activo',
    icon: HandHeart,
    description: 'Servicios funerarios, excedentes, sedes, gestores, cementerios y lugares de fallecimiento.',
  },
  {
    id: 'cartera',
    name: 'Cartera',
    areaName: 'Cartera',
    status: 'Preparado',
    icon: Banknote,
    description: 'Recaudo, saldos, vencimientos, cuotas, pagos y seguimiento por cliente o convenio.',
  },
  {
    id: 'facturacion',
    name: 'Facturación',
    areaName: 'Facturación',
    status: 'Preparado',
    icon: ReceiptText,
    description: 'Facturas, notas crédito, anexos, DocKey, TransId, series y validaciones de formatos Crystal.',
  },
]

export default function App() {
  const [activeModule, setActiveModule] = useState('prevision')
  const selectedModule = useMemo(
    () => modules.find((module) => module.id === activeModule) || modules[0],
    [activeModule],
  )

  return (
    <div>
      <nav className="sticky top-0 z-20 border-b border-emerald-100/80 bg-white/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-emerald-950 via-emerald-800 to-lime-600 text-white shadow-lg shadow-emerald-950/20">
              <LayoutDashboard className="size-5" strokeWidth={2.6} />
            </div>
            <div>
              <p className="font-heading text-sm font-bold leading-none tracking-tight text-slate-950">Dashboard Gerencial</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Macro de reportes web por área</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 rounded-full border border-emerald-100 bg-emerald-50/70 p-1">
            {modules.map((module) => {
              const Icon = module.icon
              const isActive = module.id === activeModule

              return (
                <button
                  key={module.id}
                  type="button"
                  onClick={() => setActiveModule(module.id)}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black transition ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-800 to-green-600 text-white shadow-lg shadow-emerald-700/20'
                      : 'bg-white text-slate-600 hover:bg-emerald-100 hover:text-emerald-900'
                  }`}
                  aria-pressed={isActive}
                >
                  <Icon className="size-3.5" strokeWidth={2.5} />
                  {module.name}
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {activeModule === 'homenajes' ? (
        <HomenajesDashboard areaName={selectedModule.areaName} />
      ) : (
        <ModulePlaceholder
          module={selectedModule}
          modules={modules}
          setActiveModule={setActiveModule}
        />
      )}
    </div>
  )
}
