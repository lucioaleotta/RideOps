"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';

type KpisPayload = {
  total7d: number;
  total24h: number;
  anomaliesTotal: number;
  uniqueIps: number;
};

type HourlyPayload = {
  hours: number[];
  anomalyHours: number[];
};

type TopIpsPayload = {
  ips: Array<{
    ip: string;
    count: number;
    tenantName: string;
    countryCode: string | null;
    countryName: string | null;
    city: string | null;
    suspicious: boolean;
  }>;
};

type CountriesPayload = {
  countries: Array<{
    countryCode: string;
    countryName: string;
    count: number;
  }>;
};

type SessionsPayload = {
  total: number;
  page: number;
  perPage: number;
  sessions: AccessSession[];
};

type AccessSession = {
  id: number;
  userName: string;
  userInitials: string;
  tenantName: string;
  createdAt: string;
  ipAddress: string;
  countryCode: string | null;
  countryName: string | null;
  city: string | null;
  uaBrowser: string | null;
  uaOs: string | null;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  anomaly: string | null;
};

type TenantOption = {
  id: number;
  businessName: string;
};

type StatusFilter = 'all' | 'anomaly' | 'normal';
type AnomalyKind = 'impossibleTravel' | 'country' | 'device' | 'night' | 'other';

const POLLING_MS = 60_000;

const anomalyOrder: Record<AnomalyKind, number> = {
  impossibleTravel: 0,
  country: 1,
  device: 2,
  night: 3,
  other: 4
};

export function AccessControlDashboard() {
  const [kpis, setKpis] = useState<KpisPayload>({ total7d: 0, total24h: 0, anomaliesTotal: 0, uniqueIps: 0 });
  const [hourly, setHourly] = useState<number[]>(new Array(24).fill(0));
  const [hourlyAnomalies, setHourlyAnomalies] = useState<number[]>(new Array(24).fill(0));
  const [topIps, setTopIps] = useState<TopIpsPayload['ips']>([]);
  const [countries, setCountries] = useState<CountriesPayload['countries']>([]);
  const [sessionsPayload, setSessionsPayload] = useState<SessionsPayload>({ total: 0, page: 0, perPage: 12, sessions: [] });
  const [anomalyBanner, setAnomalyBanner] = useState<AccessSession[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [tenantFilter, setTenantFilter] = useState('');
  const [page, setPage] = useState(0);

  const loadTenants = useCallback(async () => {
    const response = await fetch('/api/admin/tenants', { cache: 'no-store' });
    const payload = (await response.json().catch(() => [])) as TenantOption[];
    if (response.ok && Array.isArray(payload)) {
      setTenants(payload);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setError(null);

    const sessionsParams = new URLSearchParams({
      days: '7',
      page: String(page),
      per_page: '12',
      anomaly_only: statusFilter === 'anomaly' ? 'true' : 'false',
      normal_only: statusFilter === 'normal' ? 'true' : 'false',
      search: search.trim()
    });

    if (tenantFilter) {
      sessionsParams.set('tenant_id', tenantFilter);
    }

    const bannerParams = new URLSearchParams({
      days: '1',
      page: '0',
      per_page: '6',
      anomaly_only: 'true'
    });

    const [kpisRes, hourlyRes, topIpsRes, countriesRes, sessionsRes, anomalyRes] = await Promise.all([
      fetch('/api/owner/sessions/kpis?days=7', { cache: 'no-store' }),
      fetch('/api/owner/sessions/hourly', { cache: 'no-store' }),
      fetch('/api/owner/sessions/top-ips?days=7', { cache: 'no-store' }),
      fetch('/api/owner/sessions/countries?days=7&exclude_unknown=true', { cache: 'no-store' }),
      fetch(`/api/owner/sessions?${sessionsParams.toString()}`, { cache: 'no-store' }),
      fetch(`/api/owner/sessions?${bannerParams.toString()}`, { cache: 'no-store' })
    ]);

    if (!kpisRes.ok || !hourlyRes.ok || !topIpsRes.ok || !countriesRes.ok || !sessionsRes.ok || !anomalyRes.ok) {
      setError('Errore caricamento dashboard accessi');
      return;
    }

    const [kpisData, hourlyData, topIpsData, countriesData, sessionsData, anomalyData] = await Promise.all([
      kpisRes.json() as Promise<KpisPayload>,
      hourlyRes.json() as Promise<HourlyPayload>,
      topIpsRes.json() as Promise<TopIpsPayload>,
      countriesRes.json() as Promise<CountriesPayload>,
      sessionsRes.json() as Promise<SessionsPayload>,
      anomalyRes.json() as Promise<SessionsPayload>
    ]);

    setKpis(kpisData);
    setHourly(Array.isArray(hourlyData.hours) && hourlyData.hours.length === 24 ? hourlyData.hours : new Array(24).fill(0));
    setHourlyAnomalies(Array.isArray(hourlyData.anomalyHours) && hourlyData.anomalyHours.length === 24 ? hourlyData.anomalyHours : new Array(24).fill(0));
    setTopIps(topIpsData.ips ?? []);
    setCountries(countriesData.countries ?? []);
    setSessionsPayload(sessionsData);
    setAnomalyBanner(anomalyData.sessions ?? []);
  }, [page, search, statusFilter, tenantFilter]);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      setLoading(true);
      await Promise.all([loadTenants(), loadDashboard()]);
      if (mounted) {
        setLoading(false);
      }
    }

    bootstrap();

    const timer = window.setInterval(() => {
      loadDashboard();
    }, POLLING_MS);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [loadDashboard, loadTenants]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil((sessionsPayload.total || 0) / (sessionsPayload.perPage || 12)));
  }, [sessionsPayload.perPage, sessionsPayload.total]);

  const maxHourly = useMemo(() => {
    return Math.max(1, ...hourly);
  }, [hourly]);

  const totalHourly = useMemo(() => {
    return hourly.reduce((sum, value) => sum + value, 0);
  }, [hourly]);

  const peakHour = useMemo(() => {
    return hourly.reduce(
      (peak, count, hour) => (count > peak.count ? { hour, count } : peak),
      { hour: 0, count: hourly[0] ?? 0 }
    );
  }, [hourly]);

  const sortedAnomalyBanner = useMemo(() => {
    return [...anomalyBanner].sort((a, b) => {
      const first = anomalyOrder[classifyAnomaly(a.anomaly)] ?? anomalyOrder.other;
      const second = anomalyOrder[classifyAnomaly(b.anomaly)] ?? anomalyOrder.other;
      return first - second;
    });
  }, [anomalyBanner]);

  const topCountries = useMemo(() => {
    return (countries ?? []).map((row) => ({
      label: row.countryName || 'Unknown',
      count: row.count,
      isForeign: row.countryCode !== 'IT' && row.countryCode !== 'LOCAL' && row.countryCode !== 'UN'
    }));
  }, [countries]);

  const maxCountryCount = useMemo(() => {
    return Math.max(1, ...topCountries.map((item) => item.count));
  }, [topCountries]);

  const formatDate = (value: string) => {
    const date = new Date(value);
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <main style={{ display: 'grid', gap: 16 }}>
      <header>
        <h1 style={{ marginBottom: 8 }}>Access Control Dashboard</h1>
        <p style={{ marginTop: 0, color: 'var(--muted)' }}>Monitoraggio accessi ADMIN con rilevamento anomalie in tempo reale (polling ogni 60 secondi).</p>
      </header>

      {error && (
        <div className="services-notice services-notice--error">
          <div className="services-notice-text">
            <strong>Errore</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        <KpiCard title="Accessi totali (7g)" value={kpis.total7d} tone="neutral" />
        <KpiCard title="Accessi ultime 24h" value={kpis.total24h} tone="neutral" />
        <KpiCard title="Anomalie rilevate" value={kpis.anomaliesTotal} tone={kpis.anomaliesTotal > 0 ? 'danger' : 'neutral'} />
        <KpiCard title="IP unici" value={kpis.uniqueIps} tone="neutral" />
      </section>

      {sortedAnomalyBanner.length > 0 && (
        <section className="dashboard-card" style={{ borderLeft: '4px solid #d32f2f' }}>
          <h3 style={{ marginTop: 0 }}>Anomalie ultime 24 ore</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {sortedAnomalyBanner.map((item) => (
              <div key={item.id} style={{ display: 'grid', gap: 2, padding: '10px 12px', borderRadius: 10, background: '#fff3f1' }}>
                <strong>{item.userName} · {item.tenantName}</strong>
                <span style={{ color: '#8a1c17' }}>
                  {isCountryAnomaly(item.anomaly) ? '🚩 ' : ''}
                  {item.anomaly}
                </span>
                <small style={{ color: '#6c7886' }}>{formatDate(item.createdAt)}</small>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="dashboard-card" style={{ display: 'grid', gap: 10 }}>
        <h3 style={{ marginTop: 0 }}>Attività accessi per ora (ultime 24h)</h3>
        <p style={{ margin: 0, color: '#607086', fontSize: 13 }}>
          Totale 24h: <strong>{totalHourly}</strong> login · Picco: <strong>{peakHour.hour.toString().padStart(2, '0')}:00 ({peakHour.count})</strong>
        </p>
        <div className="access-chart-scroll">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, minmax(16px, 1fr))', alignItems: 'end', gap: 4, minHeight: 180, minWidth: 480 }}>
            {hourly.map((count, hour) => {
              const height = Math.max(4, Math.round((count / maxHourly) * 150));
              const nightHour = hour >= 0 && hour <= 5;
              const anomalyCount = hourlyAnomalies[hour] ?? 0;
              return (
                <div key={hour} style={{ display: 'grid', justifyItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, color: '#41566d', lineHeight: 1 }}>{count}</span>
                  <div
                    title={`${hour.toString().padStart(2, '0')}:00 - accessi ${count}, anomalie ${anomalyCount}`}
                    style={{
                      width: '100%',
                      maxWidth: 24,
                      height,
                      borderRadius: 6,
                      background: nightHour ? '#d32f2f' : '#1976d2'
                    }}
                  />
                  <span style={{ fontSize: 10, color: '#607086' }}>{hour.toString().padStart(2, '0')}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="dashboard-card" style={{ display: 'grid', gap: 10 }}>
        <h3 style={{ marginTop: 0 }}>Accessi per paese</h3>
        {topCountries.length === 0 ? (
          <p>Nessun dato disponibile.</p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {topCountries.map((country) => (
              <div key={country.label} style={{ display: 'grid', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: country.isForeign ? '#b3261e' : '#1f2f44', fontWeight: country.isForeign ? 700 : 500 }}>{country.label}</span>
                  <span>{country.count}</span>
                </div>
                <div style={{ height: 8, borderRadius: 99, background: '#e7edf5', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.max(4, Math.round((country.count / maxCountryCount) * 100))}%`,
                      background: country.isForeign ? '#d32f2f' : '#1976d2'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-card" style={{ display: 'grid', gap: 10 }}>
        <h3 style={{ marginTop: 0 }}>Top 5 IP (ultimi 7 giorni)</h3>
        {topIps.length === 0 ? (
          <p>Nessun dato disponibile.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {topIps.map((item, idx) => (
              <div key={`${item.ip}-${idx}`} className="top-ip-card">
                <div className="top-ip-card-header">
                  <span className="top-ip-card-ip">{item.ip}</span>
                  {item.suspicious ? (
                    <span className="access-log-badge access-log-badge-danger">sospetto</span>
                  ) : (
                    <span className="access-log-badge access-log-badge-ok">ok</span>
                  )}
                </div>
                <div className="top-ip-card-meta">
                  <span>Accessi: <strong>{item.count}</strong></span>
                  <span>Tenant: <strong>{item.tenantName}</strong></span>
                </div>
                <div className="top-ip-card-meta">
                  <span>Paese: <strong>{formatCountry(item.countryCode, item.countryName)}</strong></span>
                  <span>Città: <strong>{item.city ?? 'Unknown'}</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-card" style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}>Log accessi</h3>
          <span style={{ color: '#607086' }}>Totale: {sessionsPayload.total}</span>
        </div>

        <div className="access-filters" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          <label>
            <span>Ricerca</span>
            <input
              className="form-input"
              placeholder="Cerca utente o tenant"
              value={search}
              onChange={(event) => {
                setPage(0);
                setSearch(event.target.value);
              }}
            />
          </label>

          <label>
            <span>Stato</span>
            <select
              className="form-input"
              value={statusFilter}
              onChange={(event) => {
                setPage(0);
                setStatusFilter(event.target.value as StatusFilter);
              }}
            >
              <option value="all">Tutti gli accessi</option>
              <option value="anomaly">Solo anomalie</option>
              <option value="normal">Solo normali</option>
            </select>
          </label>

          <label>
            <span>Tenant</span>
            <select
              className="form-input"
              value={tenantFilter}
              onChange={(event) => {
                setPage(0);
                setTenantFilter(event.target.value);
              }}
            >
              <option value="">Tutti i tenant</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>{tenant.businessName}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="access-log-table-wrap">
          <table className="access-log-table">
            <thead>
              <tr>
                <th align="left">Utente</th>
                <th align="left">Tenant</th>
                <th align="left">Data / Ora</th>
                <th align="left" className="col-paese">Paese</th>
                <th align="left">Dispositivo</th>
                <th align="left">Stato</th>
                <th align="left" className="col-anomalia">Descrizione anomalia</th>
              </tr>
            </thead>
            <tbody>
              {sessionsPayload.sessions.map((session, index) => (
                <tr
                  key={session.id}
                  title={`IP: ${session.ipAddress || 'unknown'}${session.city ? ` | Città: ${session.city}` : ''}`}
                  className={session.anomaly ? 'is-anomaly' : ''}
                  data-even={index % 2 === 0 ? 'true' : 'false'}
                >
                  <td>
                    <div className="access-log-user-cell">
                      <span className="access-log-avatar">
                        {session.userInitials}
                      </span>
                      <span className="access-log-primary">{session.userName}</span>
                    </div>
                  </td>
                  <td className="access-log-primary">{session.tenantName}</td>
                  <td className="access-log-secondary">{formatDate(session.createdAt)}</td>
                  <td className="access-log-secondary col-paese">{formatCountry(session.countryCode, session.countryName)}</td>
                  <td className="access-log-secondary">{`${session.uaBrowser ?? 'unknown'} · ${session.uaOs ?? 'unknown'}`}</td>
                  <td>
                    {session.anomaly ? (
                      <span className="access-log-badge access-log-badge-danger">Anomalia</span>
                    ) : (
                      <span className="access-log-badge access-log-badge-ok">OK</span>
                    )}
                  </td>
                  <td className="access-log-anomaly-text col-anomalia" title={session.anomaly ?? '—'}>{session.anomaly ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="access-log-cards">
          {sessionsPayload.sessions.map((session) => (
            <div key={session.id} className={`access-log-card${session.anomaly ? ' is-anomaly' : ''}`}>
              <div className="access-log-card-header">
                <div className="access-log-card-user">
                  <span className="access-log-avatar">{session.userInitials}</span>
                  <div className="access-log-card-user-info">
                    <span className="access-log-card-name">{session.userName}</span>
                    <span className="access-log-card-tenant">{session.tenantName}</span>
                  </div>
                </div>
                {session.anomaly ? (
                  <span className="access-log-badge access-log-badge-danger">Anomalia</span>
                ) : (
                  <span className="access-log-badge access-log-badge-ok">OK</span>
                )}
              </div>
              <div className="access-log-card-row">
                <span>Data: <strong>{formatDate(session.createdAt)}</strong></span>
                <span>Paese: <strong>{formatCountry(session.countryCode, session.countryName)}</strong></span>
              </div>
              <div className="access-log-card-row">
                <span>Dispositivo: <strong>{`${session.uaBrowser ?? 'unknown'} · ${session.uaOs ?? 'unknown'}`}</strong></span>
              </div>
              {session.anomaly && (
                <div className="access-log-card-anomaly">{session.anomaly}</div>
              )}
            </div>
          ))}
        </div>

        <div className="access-pagination">
          <button
            type="button"
            className="logout-button"
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={page <= 0 || loading}
          >
            <span className="btn-prev-long">Pagina precedente</span>
            <span className="btn-prev-short">Precedente</span>
          </button>
          <span className="access-pagination-label">Pagina {page + 1} / {totalPages}</span>
          <button
            type="button"
            className="logout-button"
            onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
            disabled={page >= totalPages - 1 || loading}
          >
            <span className="btn-next-long">Pagina successiva</span>
            <span className="btn-next-short">Successiva</span>
          </button>
        </div>
      </section>
    </main>
  );
}

function classifyAnomaly(anomaly: string | null): AnomalyKind {
  const value = (anomaly ?? '').toLowerCase();
  if (value.includes('impossible travel')) {
    return 'impossibleTravel';
  }
  if (value.includes('paese insolito')) {
    return 'country';
  }
  if (value.includes('dispositivo mai visto')) {
    return 'device';
  }
  if (value.includes('orario insolito')) {
    return 'night';
  }
  return 'other';
}

function isCountryAnomaly(anomaly: string | null): boolean {
  const kind = classifyAnomaly(anomaly);
  return kind === 'country' || kind === 'impossibleTravel';
}

function flagFromCountryCode(countryCode: string | null): string {
  if (!countryCode || countryCode.length !== 2) {
    return '🏳️';
  }
  const upper = countryCode.toUpperCase();
  const first = upper.charCodeAt(0) - 65;
  const second = upper.charCodeAt(1) - 65;
  if (first < 0 || first > 25 || second < 0 || second > 25) {
    return '🏳️';
  }
  return String.fromCodePoint(0x1f1e6 + first, 0x1f1e6 + second);
}

function formatCountry(countryCode: string | null, countryName: string | null): string {
  if (countryCode === 'LOCAL') {
    return '🏠 Local Network';
  }
  if (!countryCode && !countryName) {
    return '🏳️ Unknown';
  }
  const label = countryName ?? countryCode ?? 'Unknown';
  return `${flagFromCountryCode(countryCode)} ${label}`;
}

type KpiCardProps = {
  title: string;
  value: number;
  tone: 'neutral' | 'danger';
};

function KpiCard({ title, value, tone }: KpiCardProps) {
  return (
    <article
      className="dashboard-card"
      style={{
        borderLeft: tone === 'danger' ? '4px solid #c62828' : '4px solid #1565c0',
        background: tone === 'danger' ? '#fff5f4' : 'var(--surface)'
      }}
    >
      <div style={{ fontSize: 13, color: '#607086' }}>{title}</div>
      <div style={{ fontSize: 30, fontWeight: 800, marginTop: 4, color: tone === 'danger' ? '#9f1b1b' : 'inherit' }}>{value}</div>
    </article>
  );
}
