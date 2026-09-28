import {
  BadgeDollarSign,
  ClipboardCheck,
  Layers3,
  RefreshCw,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchPrevisionIncomeRows } from "../../services/previsionIncomeApi.js";
import { money, number } from "../../utils/dashboard.js";
import {
  buildIncomeComposition,
  buildIncomeSummary,
  filterIncomeRows,
  groupIncomeBy,
  incomeInitialFilters,
  incomeOptions,
} from "../../utils/previsionIncome.js";
import ChartCard from "../ChartCard.jsx";
import CustomTooltip from "../CustomTooltip.jsx";
import EmptyState from "../EmptyState.jsx";
import KpiCard from "../KpiCard.jsx";
import AffiliateComposition from "./AffiliateComposition.jsx";
import CommercialIncome from "./CommercialIncome.jsx";
import CommercialPortfolio from "./CommercialPortfolio.jsx";
import ConventionSummary from "./ConventionSummary.jsx";
import IncomeFilters from "./IncomeFilters.jsx";
import PlanSummary from "./PlanSummary.jsx";
import SiteSummary from "./SiteSummary.jsx";

export default function IncomeOverview({ active = true }) {
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState(incomeInitialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [sectionView, setSectionView] = useState("general");

  useEffect(() => {
    if (!active) return undefined;
    let current = true;
    setLoading(true);
    setError("");
    fetchPrevisionIncomeRows({
      from: filters.fechaInicial,
      to: filters.fechaFinal,
      refresh: refreshKey > 0,
    })
      .then((data) => {
        if (current) setRows(data);
      })
      .catch((requestError) => {
        if (current) setError(requestError.message);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [active, filters.fechaFinal, filters.fechaInicial, refreshKey]);

  const options = useMemo(() => {
    const advisorRows =
      filters.asesor === "TODOS"
        ? rows
        : rows.filter((row) => row.asesor === filters.asesor);
    const dependent = incomeOptions(advisorRows);
    return { ...dependent, asesores: incomeOptions(rows).asesores };
  }, [filters.asesor, rows]);
  const filteredRows = useMemo(
    () => filterIncomeRows(rows, filters),
    [rows, filters],
  );
  const advisorRows = useMemo(
    () => filterIncomeRows(rows, { ...filters, asesor: "TODOS" }),
    [rows, filters],
  );
  const siteRows = useMemo(
    () => filterIncomeRows(rows, { ...filters, sede: "TODOS" }),
    [rows, filters],
  );
  const planRows = useMemo(
    () => filterIncomeRows(rows, { ...filters, plan: "TODOS" }),
    [rows, filters],
  );
  const conventionRows = useMemo(
    () => filterIncomeRows(rows, { ...filters, convenio: "TODOS" }),
    [rows, filters],
  );
  const summary = useMemo(
    () => buildIncomeSummary(filteredRows),
    [filteredRows],
  );
  const composition = useMemo(() => buildIncomeComposition(summary), [summary]);
  const bySede = useMemo(
    () => groupIncomeBy(filteredRows, "sede"),
    [filteredRows],
  );

  if (loading && !rows.length) return <IncomeLoading />;
  if (error && !rows.length)
    return (
      <ErrorState
        message={error}
        onRetry={() => setRefreshKey((key) => key + 1)}
      />
    );

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
          {error} Se conservan los datos cargados.
        </div>
      )}
      <IncomeFilters
        filters={filters}
        setFilters={setFilters}
        options={options}
        resultCount={summary.vidas}
        loading={loading}
        onRefresh={() => setRefreshKey((key) => key + 1)}
      />

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2">
        <SectionButton active={sectionView === "general"} onClick={() => setSectionView("general")}>
          Indicadores generales
        </SectionButton>
        <SectionButton active={sectionView === "comercial"} onClick={() => setSectionView("comercial")}>
          Gestión comercial · Responsables
        </SectionButton>
        <SectionButton active={sectionView === "asesores"} onClick={() => setSectionView("asesores")}>
          Resumen por asesor
        </SectionButton>
        <SectionButton
          active={sectionView === "composicion"}
          onClick={() => {
            setSectionView("composicion");
            setFilters((current) => ({ ...current, estado: "TODOS" }));
          }}
        >
          Composición de afiliados
        </SectionButton>
        <SectionButton active={sectionView === "sedes"} onClick={() => setSectionView("sedes")}>
          Resumen por sede
        </SectionButton>
        <SectionButton active={sectionView === "planes"} onClick={() => setSectionView("planes")}>
          Resumen por planes
        </SectionButton>
        <SectionButton active={sectionView === "convenios"} onClick={() => setSectionView("convenios")}>
          Resumen por convenios
        </SectionButton>
      </div>

      {sectionView === "general" ? <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Personas protegidas"
              value={number(summary.vidas)}
              helper="Personas y mascotas activas dentro del universo filtrado."
              icon={<UsersRound className="size-6" />}
              accent="emerald"
            />
            <KpiCard
              title="Contratos activos"
              value={number(summary.contratos)}
              helper={`${summary.vidasPorContrato.toLocaleString("es-CO", { maximumFractionDigits: 2 })} protegidos en promedio por contrato.`}
              icon={<ClipboardCheck className="size-6" />}
              accent="blue"
            />
            <KpiCard
              title="Titulares activos"
              value={number(summary.titulares)}
              helper={`${number(summary.adicionalesPersonas)} adicionales personas, ${number(summary.mascotas)} mascotas y ${number(summary.beneficiarios)} beneficiarios.`}
              icon={<UserRoundCheck className="size-6" />}
              accent="violet"
            />
            <KpiCard
              title="Facturación vigente"
              value={money(summary.facturacion)}
              helper="Valor facturado una sola vez por contrato, desde la fila titular."
              icon={<BadgeDollarSign className="size-6" />}
              accent="orange"
            />
            <KpiCard
              title="Adicionales personas"
              value={number(summary.adicionalesPersonas)}
              helper={`${number(summary.mascotas)} mascotas adicionales identificadas por separado.`}
              icon={<Layers3 className="size-6" />}
              accent="violet"
            />
            <KpiCard
              title="Beneficiarios activos"
              value={number(summary.beneficiarios)}
              helper="Beneficiarios activos sin duplicar contratos."
              icon={<UsersRound className="size-6" />}
              accent="emerald"
            />
            <KpiCard
              title="Protegidos por contrato"
              value={summary.vidasPorContrato.toLocaleString("es-CO", {
                maximumFractionDigits: 2,
              })}
              helper="Relación entre protegidos visibles y contratos únicos."
              icon={<UsersRound className="size-6" />}
              accent="blue"
            />
            <KpiCard
              title="Contratos con adicional"
              value={number(summary.contratosConAdicional)}
              helper={`${summary.porcentajeConAdicional.toLocaleString("es-CO", { maximumFractionDigits: 1 })}% de los contratos visibles.`}
              icon={<Layers3 className="size-6" />}
              accent="orange"
            />
          </div>

          {!filteredRows.length ? (
            <EmptyState />
          ) : (
            <div className="grid gap-6 xl:grid-cols-2">
              <ChartCard
                title="Composición de personas protegidas"
                subtitle="Distribución jerarquizada entre titulares, adicionales personas, mascotas y beneficiarios."
                accent="emerald"
              >
                <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto]">
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={composition}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={70}
                          outerRadius={105}
                          paddingAngle={2}
                        >
                          {composition.map((item) => (
                            <Cell key={item.name} fill={item.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {composition.map((item) => (
                      <div
                        key={item.name}
                        className="flex min-w-48 items-center justify-between gap-6 rounded-xl bg-slate-50 px-4 py-3"
                      >
                        <span className="flex items-center gap-2 text-sm font-bold text-slate-600">
                          <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          {item.name}
                        </span>
                        <strong className="text-slate-950">
                          {number(item.value)}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              </ChartCard>
              <ChartCard
                title="Personas protegidas por sede"
                subtitle="Sedes con mayor cantidad de protegidos en el universo filtrado."
                accent="violet"
              >
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={bySede}
                      layout="vertical"
                      margin={{ left: 12, right: 18 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tickFormatter={number} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={100}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="vidas"
                        name="Vidas"
                        fill="#0f766e"
                        radius={[0, 8, 8, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </div>
          )}

          {!!filteredRows.length && (
            <ChartCard
              title="Resumen general por sede"
              subtitle="Base reutilizable para profundizar posteriormente en sedes, planes, convenios y responsables."
              accent="slate"
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-400">
                      <th className="px-3 py-3">Sede</th>
                      <th className="px-3 py-3 text-right">Vidas</th>
                      <th className="px-3 py-3 text-right">Contratos</th>
                      <th className="px-3 py-3 text-right">Vidas / contrato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bySede.map((row) => (
                      <tr
                        key={row.name}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-3 py-3 font-bold text-slate-800">
                          {row.name}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {number(row.vidas)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {number(row.contratos)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {row.contratos
                            ? (row.vidas / row.contratos).toLocaleString(
                                "es-CO",
                                { maximumFractionDigits: 2 },
                              )
                            : "0"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          )}
      </> : sectionView === "comercial" ? <CommercialPortfolio rows={filteredRows} /> : sectionView === "asesores" ? <CommercialIncome rows={advisorRows} selectedAdvisor={filters.asesor} onSelectAdvisor={(asesor) => setFilters((current) => ({ ...current, asesor }))} /> : sectionView === "composicion" ? <AffiliateComposition rows={rows} filters={filters} /> : sectionView === "sedes" ? <SiteSummary rows={siteRows} selectedSite={filters.sede} onSelectSite={(sede) => setFilters((current) => ({ ...current, sede }))} /> : sectionView === "planes" ? <PlanSummary rows={planRows} selectedPlan={filters.plan} onSelectPlan={(plan) => setFilters((current) => ({ ...current, plan }))} /> : <ConventionSummary rows={conventionRows} selectedConvention={filters.convenio} onSelectConvention={(convenio) => setFilters((current) => ({ ...current, convenio }))} />}
    </div>
  );
}

function IncomeLoading() {
  return (
    <section className="card-shadow rounded-[2rem] border border-slate-200 bg-white px-6 py-14 text-center">
      <RefreshCw className="mx-auto size-8 animate-spin text-teal-700" />
      <h2 className="mt-4 text-xl font-black text-slate-950">
        Preparando la interfaz general de ingresos
      </h2>
      <p className="mt-2 text-slate-500">
        Consultando contratos y composición activa en SAP HANA…
      </p>
    </section>
  );
}
function ErrorState({ message, onRetry }) {
  return (
    <section className="card-shadow rounded-[2rem] border border-amber-200 bg-white px-6 py-12 text-center">
      <h2 className="text-xl font-black text-slate-950">
        No fue posible consultar Ingresos
      </h2>
      <p className="mt-3 text-slate-600">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
      >
        Intentar nuevamente
      </button>
    </section>
  );
}

function SectionButton({ active, onClick, children }) {
  return <button type="button" onClick={onClick} className={`min-h-11 rounded-xl px-5 text-sm font-black transition ${active ? "bg-cyan-950 text-white shadow" : "text-slate-600 hover:bg-cyan-50"}`}>{children}</button>;
}
