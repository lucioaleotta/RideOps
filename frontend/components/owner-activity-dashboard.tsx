"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";

type Months = 1 | 3 | 6 | 12;

type KpisPayload = {
  total_services: number;
  active_clients: number;
  total_clients: number;
  avg_services_per_client: number;
};

type ServicesByMonthPayload = {
  labels: string[];
  datasets: Array<{
    tenant_id: number;
    tenant_name: string;
    color: string;
    data: number[];
  }>;
};

type Top5Payload = {
  top5: Array<{
    tenant_id: number;
    tenant_name: string;
    total_services: number;
    avg_logins_per_week: number;
    score: number;
  }>;
};

type ClientsPayload = {
  clients: Array<{
    tenant_id: number;
    tenant_name: string;
    plan: string;
    plan_limit: number;
    total_services: number;
    avg_logins_per_week: number;
    limit_pct: number;
    trend_pct: number;
  }>;
  total: number;
  page: number;
  per_page: number;
  paginated: boolean;
};

type Loadable<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

type ChartPoint = {
  x: number;
  y: number;
  value: number;
  label: string;
  tenantName: string;
  color: string;
};

const MONTH_OPTIONS: Array<{ value: Months; label: string }> = [
  { value: 1, label: "1 mese" },
  { value: 3, label: "3 mesi" },
  { value: 6, label: "6 mesi" },
  { value: 12, label: "12 mesi" }
];

const EMPTY_KPIS: KpisPayload = {
  total_services: 0,
  active_clients: 0,
  total_clients: 0,
  avg_services_per_client: 0
};

function createLoadable<T>(data: T | null = null): Loadable<T> {
  return { data, loading: true, error: null };
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 }).format(value);
}

function formatDecimal(value: number) {
  return new Intl.NumberFormat("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}

function formatSignedPercent(value: number) {
  if (value > 0) return `+${value}%`;
  if (value < 0) return `${value}%`;
  return "0%";
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function trendColor(value: number) {
  if (value > 0) return "#1b8a3f";
  if (value < 0) return "#c62828";
  return "#607086";
}

function utilizationBadgeStyle(limitPct: number): React.CSSProperties {
  if (limitPct < 60) {
    return { background: "#e9f7ee", color: "#1b8a3f" };
  }
  if (limitPct <= 80) {
    return { background: "#fff5e6", color: "#9a5a00" };
  }
  return { background: "#fdecea", color: "#b71c1c" };
}

function SectionSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          style={{
            height: 36,
            borderRadius: 10,
            background: "linear-gradient(90deg, #edf3fa 0%, #f6f9fd 50%, #edf3fa 100%)"
          }}
        />
      ))}
    </div>
  );
}

function SectionError({ message }: { message: string }) {
  return (
    <div className="services-notice services-notice--error" style={{ marginBottom: 0 }}>
      <div className="services-notice-text">
        <strong>Errore</strong>
        <span>{message}</span>
      </div>
    </div>
  );
}

function KpiCard({ title, value, subtitle, tone = "neutral" }: { title: string; value: string; subtitle: string; tone?: "neutral" | "danger" }) {
  return (
    <article
      className="dashboard-card"
      style={{
        borderLeft: tone === "danger" ? "4px solid #c62828" : "4px solid #1565c0",
        background: tone === "danger" ? "#fff5f4" : "#f9fcff"
      }}
    >
      <div style={{ fontSize: 14, color: "#5f738a" }}>{title}</div>
      <div style={{ fontSize: 38, fontWeight: 800, lineHeight: 1.05, marginTop: 4, color: tone === "danger" ? "#a11919" : "#1e2c3b" }}>{value}</div>
      <div style={{ marginTop: 4, color: "#6a7f95", fontSize: 14 }}>{subtitle}</div>
    </article>
  );
}

function ActivityLineChart({ data }: { data: ServicesByMonthPayload }) {
  const [hovered, setHovered] = useState<ChartPoint | null>(null);

  const chart = useMemo(() => {
    const width = 980;
    const height = 300;
    const padding = { top: 22, right: 24, bottom: 46, left: 56 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const pointCount = Math.max(1, data.labels.length);
    const maxValue = Math.max(1, ...data.datasets.flatMap((d) => d.data));

    const yTicks = 5;
    const grid = Array.from({ length: yTicks + 1 }).map((_, index) => {
      const value = Math.round(maxValue - (maxValue / yTicks) * index);
      const y = padding.top + (chartHeight / yTicks) * index;
      return { value, y };
    });

    const series = data.datasets.map((dataset) => {
      const points = data.labels.map((label, index) => {
        const value = dataset.data[index] ?? 0;
        const x = padding.left + (pointCount === 1 ? chartWidth / 2 : (chartWidth * index) / (pointCount - 1));
        const y = padding.top + chartHeight - (value / maxValue) * chartHeight;
        return {
          x,
          y,
          value,
          label,
          tenantName: dataset.tenant_name,
          color: dataset.color
        };
      });

      const path = points
        .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`)
        .join(" ");

      return {
        tenant_id: dataset.tenant_id,
        tenant_name: dataset.tenant_name,
        color: dataset.color,
        points,
        path
      };
    });

    return { width, height, padding, chartWidth, chartHeight, grid, series };
  }, [data]);

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${chart.width} ${chart.height}`} style={{ width: "100%", height: 280 }}>
        {chart.grid.map((tick, index) => (
          <g key={`grid-${index}`}>
            <line
              x1={chart.padding.left}
              y1={tick.y}
              x2={chart.width - chart.padding.right}
              y2={tick.y}
              stroke="#dbe8f5"
              strokeDasharray="4 4"
            />
            <text x={chart.padding.left - 10} y={tick.y + 4} textAnchor="end" style={{ fontSize: 11, fill: "#607086" }}>
              {formatInteger(tick.value)}
            </text>
          </g>
        ))}

        {chart.series.map((series) => (
          <g key={series.tenant_id}>
            <path d={series.path} fill="none" stroke={series.color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            {series.points.map((point) => (
              <g key={`${series.tenant_id}-${point.label}`}>
                <circle cx={point.x} cy={point.y} r={5} fill="#fff" stroke={series.color} strokeWidth={2.5} onMouseEnter={() => setHovered(point)} onMouseLeave={() => setHovered(null)} />
                <circle cx={point.x} cy={point.y} r={14} fill="transparent" onMouseEnter={() => setHovered(point)} onMouseLeave={() => setHovered(null)} />
              </g>
            ))}
          </g>
        ))}

        {data.labels.map((label, index) => {
          const x = chart.padding.left + (data.labels.length === 1 ? chart.chartWidth / 2 : (chart.chartWidth * index) / Math.max(data.labels.length - 1, 1));
          return (
            <text key={label} x={x} y={chart.height - 18} textAnchor="middle" style={{ fontSize: 12, fill: "#607086" }}>
              {label}
            </text>
          );
        })}
      </svg>

      {hovered ? (
        <div
          style={{
            position: "absolute",
            left: Math.max(12, Math.min((hovered.x / chart.width) * 100, 82)) + "%",
            top: Math.max(6, (hovered.y / chart.height) * 100 - 16) + "%",
            transform: "translateX(-50%)",
            border: "1px solid #d5e3f2",
            borderRadius: 10,
            background: "#ffffff",
            padding: "8px 10px",
            boxShadow: "0 8px 18px rgba(22, 58, 95, 0.15)",
            pointerEvents: "none",
            minWidth: 130
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: "#1d2f46" }}>{hovered.tenantName}</div>
          <div style={{ fontSize: 11, color: "#607086" }}>{hovered.label}</div>
          <div style={{ marginTop: 2, fontSize: 13, fontWeight: 700, color: hovered.color }}>{formatInteger(hovered.value)} servizi</div>
        </div>
      ) : null}
    </div>
  );
}

async function loadSection<T>(url: string, setter: Dispatch<SetStateAction<Loadable<T>>>, fallback: T | null = null) {
  setter((prev) => ({ ...prev, loading: true, error: null }));

  try {
    const response = await fetch(url, { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as T | { message?: string } | null;

    if (!response.ok) {
      const message = payload && typeof payload === "object" && "message" in payload
        ? String(payload.message ?? "Errore caricamento sezione")
        : "Errore caricamento sezione";
      setter({ data: fallback, loading: false, error: message });
      return;
    }

    setter({ data: payload as T, loading: false, error: null });
  } catch {
    setter({ data: fallback, loading: false, error: "Errore di rete" });
  }
}

export function OwnerActivityDashboard() {
  const [months, setMonths] = useState<Months>(3);
  const [refreshing, setRefreshing] = useState(true);
  const [clientsPage, setClientsPage] = useState(0);

  const [kpisState, setKpisState] = useState<Loadable<KpisPayload>>(createLoadable(EMPTY_KPIS));
  const [seriesState, setSeriesState] = useState<Loadable<ServicesByMonthPayload>>(createLoadable());
  const [top5State, setTop5State] = useState<Loadable<Top5Payload>>(createLoadable());
  const [clientsState, setClientsState] = useState<Loadable<ClientsPayload>>(createLoadable());

  useEffect(() => {
    setClientsPage(0);
  }, [months]);

  useEffect(() => {
    let alive = true;

    async function loadDashboard() {
      setRefreshing(true);
      await Promise.all([
        loadSection(`/api/owner/dashboard/kpis?months=${months}`, setKpisState, EMPTY_KPIS),
        loadSection(`/api/owner/dashboard/services-by-month?months=${months}`, setSeriesState),
        loadSection(`/api/owner/dashboard/top5?months=${months}`, setTop5State),
        loadSection(`/api/owner/dashboard/clients?months=${months}&page=${clientsPage}&per_page=15`, setClientsState)
      ]);
      if (alive) {
        setRefreshing(false);
      }
    }

    loadDashboard();
    return () => {
      alive = false;
    };
  }, [months, clientsPage]);

  const nearLimitCount = useMemo(
    () => (clientsState.data?.clients ?? []).filter((client) => client.limit_pct > 80).length,
    [clientsState.data?.clients]
  );

  const topScore = useMemo(() => {
    const items = top5State.data?.top5 ?? [];
    return items.length > 0 ? items[0].score : 1;
  }, [top5State.data?.top5]);

  const clientsTotalPages = useMemo(() => {
    const total = clientsState.data?.total ?? 0;
    const perPage = clientsState.data?.per_page ?? 15;
    return Math.max(1, Math.ceil(total / perPage));
  }, [clientsState.data?.total, clientsState.data?.per_page]);

  return (
    <main style={{ display: "grid", gap: 16 }}>
      <section className="dashboard-card" style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 32, lineHeight: 1.05 }}>Attività clienti</h2>
            <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>Panoramica servizi e utilizzo clienti</p>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", background: "#f2f6fb", border: "1px solid #dce8f5", borderRadius: 12, padding: 6 }}>
            {MONTH_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={months === option.value ? "primary-button" : "logout-button"}
                style={{ minWidth: 92, height: 40 }}
                disabled={refreshing}
                onClick={() => setMonths(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
        {kpisState.loading ? (
          <>
            <div className="dashboard-card"><SectionSkeleton rows={2} /></div>
            <div className="dashboard-card"><SectionSkeleton rows={2} /></div>
            <div className="dashboard-card"><SectionSkeleton rows={2} /></div>
            <div className="dashboard-card"><SectionSkeleton rows={2} /></div>
          </>
        ) : kpisState.error ? (
          <div style={{ gridColumn: "1 / -1" }}><SectionError message={kpisState.error} /></div>
        ) : (
          <>
            <KpiCard title="Servizi totali" value={formatInteger(kpisState.data?.total_services ?? 0)} subtitle="nel periodo selezionato" />
            <KpiCard title="Clienti attivi" value={formatInteger(kpisState.data?.active_clients ?? 0)} subtitle={`su ${formatInteger(kpisState.data?.total_clients ?? 0)} totali`} />
            <KpiCard title="Media servizi/cliente" value={formatInteger(kpisState.data?.avg_services_per_client ?? 0)} subtitle="nel periodo" />
            <KpiCard title="Vicini al limite" value={formatInteger(nearLimitCount)} subtitle=">80% del piano" tone={nearLimitCount > 0 ? "danger" : "neutral"} />
          </>
        )}
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(320px, 1fr)", gap: 12 }}>
        <article className="dashboard-card" style={{ display: "grid", gap: 10 }}>
          <div>
            <h3 style={{ margin: 0 }}>Servizi totali nel periodo</h3>
            <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>andamento mensile per cliente</p>
          </div>

          {seriesState.loading ? (
            <SectionSkeleton rows={5} />
          ) : seriesState.error ? (
            <SectionError message={seriesState.error} />
          ) : !seriesState.data || seriesState.data.labels.length === 0 ? (
            <p style={{ color: "var(--muted)", margin: 0 }}>Nessun dato disponibile nel periodo.</p>
          ) : (
            <>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                {seriesState.data.datasets.map((dataset) => (
                  <span key={`legend-${dataset.tenant_id}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: dataset.color, display: "inline-block" }} />
                    {dataset.tenant_name}
                  </span>
                ))}
              </div>
              <ActivityLineChart data={seriesState.data} />
            </>
          )}
        </article>

        <article className="dashboard-card" style={{ display: "grid", gap: 8 }}>
          <div>
            <h3 style={{ margin: 0 }}>Top 5 clienti</h3>
            <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>punteggio: servizi + frequenza accessi</p>
          </div>

          {top5State.loading ? (
            <SectionSkeleton rows={5} />
          ) : top5State.error ? (
            <SectionError message={top5State.error} />
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {(top5State.data?.top5 ?? []).map((item, index) => {
                const rank = index + 1;
                const width = `${Math.max(8, Math.round((item.score / topScore) * 100))}%`;
                return (
                  <div key={item.tenant_id} style={{ display: "grid", gap: 6, padding: "8px 0", borderBottom: "1px solid #e2ecf6" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "22px 36px 1fr auto", alignItems: "center", gap: 8 }}>
                      <span style={{ textAlign: "center", color: "#8a5a00", fontWeight: 700 }}>{rank}</span>
                      <span style={{ width: 32, height: 32, borderRadius: 999, background: "#edf3fa", color: item.tenant_name ? "#1c4f8c" : "#5f738a", fontWeight: 700, fontSize: 12, display: "grid", placeItems: "center" }}>
                        {initials(item.tenant_name)}
                      </span>
                      <div>
                        <div style={{ fontWeight: 700 }}>{item.tenant_name}</div>
                        <div style={{ color: "#607086", fontSize: 14 }}>{formatInteger(item.total_services)} servizi · {formatDecimal(item.avg_logins_per_week)} acc/sett</div>
                      </div>
                      <div style={{ fontWeight: 700 }}>{formatInteger(item.score)}</div>
                    </div>
                    <div style={{ height: 7, borderRadius: 99, background: "#e6eef8", overflow: "hidden", marginLeft: 66 }}>
                      <div style={{ height: "100%", width, background: item.score === topScore ? "#d85a30" : "#2a67b1", borderRadius: 99 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>
      </section>

      <section className="dashboard-card" style={{ display: "grid", gap: 10 }}>
        <div>
          <h3 style={{ margin: 0 }}>Servizi per cliente</h3>
          <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>{formatInteger(clientsState.data?.total ?? 0)} clienti · ultimi {months} mesi</p>
        </div>

        {clientsState.loading ? (
          <SectionSkeleton rows={8} />
        ) : clientsState.error ? (
          <SectionError message={clientsState.error} />
        ) : (
          <>
            <div className="access-log-table-wrap">
              <table className="access-log-table" style={{ minWidth: 980 }}>
                <thead>
                  <tr>
                    <th align="left">Cliente</th>
                    <th align="left">Piano</th>
                    <th align="left">Servizi</th>
                    <th align="left">Accessi/sett.</th>
                    <th align="left">Utilizzo</th>
                    <th align="left">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {(clientsState.data?.clients ?? []).map((client, index) => {
                    const trendArrow = client.trend_pct > 0 ? "↑" : client.trend_pct < 0 ? "↓" : "→";
                    return (
                      <tr key={client.tenant_id} data-even={index % 2 === 0 ? "true" : "false"}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span className="access-log-avatar">{initials(client.tenant_name)}</span>
                            <strong>{client.tenant_name}</strong>
                          </div>
                        </td>
                        <td>{client.plan}</td>
                        <td><strong>{formatInteger(client.total_services)}</strong></td>
                        <td>{formatDecimal(client.avg_logins_per_week)}</td>
                        <td>
                          <span className="access-log-badge" style={utilizationBadgeStyle(client.limit_pct)}>
                            {client.limit_pct}%
                          </span>
                        </td>
                        <td style={{ color: trendColor(client.trend_pct), fontWeight: 700 }}>
                          {trendArrow} {formatSignedPercent(client.trend_pct)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {(clientsState.data?.paginated ?? false) && clientsTotalPages > 1 ? (
              <div className="access-pagination">
                <button
                  type="button"
                  className="logout-button"
                  onClick={() => setClientsPage((prev) => Math.max(0, prev - 1))}
                  disabled={clientsPage === 0 || refreshing}
                >
                  Precedente
                </button>
                <span className="access-pagination-label">Pagina {clientsPage + 1} / {clientsTotalPages}</span>
                <button
                  type="button"
                  className="logout-button"
                  onClick={() => setClientsPage((prev) => Math.min(clientsTotalPages - 1, prev + 1))}
                  disabled={clientsPage >= clientsTotalPages - 1 || refreshing}
                >
                  Successiva
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}
