"use client";

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SessionProvider } from './session-context';
import { fetchPollingJson, usePolling } from '../lib/use-polling';

type AppShellProps = {
  id: number | null;
  userId: string;
  userRole: string;
  tenantId: number | null;
  children: React.ReactNode;
};

type Role = 'ADMIN' | 'GESTIONALE' | 'DRIVER' | 'DRIVER_FREELANCER';

type MenuChild = { href: string; label: string; icon: string; roles: Role[] };

const menuItems = [
  { href: '/app', label: 'Home', icon: '🏠', roles: ['GESTIONALE', 'DRIVER', 'DRIVER_FREELANCER'] as Role[] },
  { href: '/app/admin-home', label: 'Dashboard', icon: '📊', roles: ['ADMIN'] as Role[] },
  { href: '/app/admin', label: 'User Admin', icon: '🛡️', roles: ['ADMIN'] as Role[] },
  { href: '/app/admin/tenants', label: 'Clienti', icon: '🏢', roles: ['ADMIN'] as Role[] },
  {
    href: '/app/admin/configurazioni/tipi-assenza',
    label: 'Configurazioni',
    icon: '⚙️',
    roles: ['ADMIN'] as Role[],
    children: [
      { href: '/app/admin/configurazioni/tipi-assenza', label: 'Tipi di assenza', icon: '🗓️', roles: ['ADMIN'] as Role[] }
    ] as MenuChild[]
  },
  { href: '/app/services', label: 'Servizi', icon: '🧾', roles: ['GESTIONALE'] as Role[] },
  { href: '/app/finance', label: 'Finanza', icon: '💶', roles: ['GESTIONALE'] as Role[] },
  { href: '/app/fleet', label: 'Parco mezzi', icon: '🚙', roles: ['GESTIONALE'] as Role[] },
  { href: '/app/partners', label: 'Gestione Partner', icon: '🤝', roles: ['GESTIONALE'] as Role[] },
  {
    href: '/app/gestionale',
    label: 'Gestione Personale',
    icon: '📋',
    roles: ['GESTIONALE'] as Role[],
    children: [
      { href: '/app/gestionale/assenze', label: 'Assenze', icon: '🗓️', roles: ['GESTIONALE'] as Role[] },
      { href: '/app/gestionale/assenze/calendario', label: 'Calendario team', icon: '📅', roles: ['GESTIONALE'] as Role[] },
      { href: '/app/gestionale/assenze/configurazione', label: 'Configurazione assenze', icon: '⚙️', roles: ['GESTIONALE'] as Role[] }
    ] as MenuChild[]
  },
  { href: '/app/driver', label: 'Autista', icon: '🚗', roles: ['DRIVER', 'DRIVER_FREELANCER'] as Role[] },
  { href: '/app/driver/assenze', label: 'Le mie assenze', icon: '🗓️', roles: ['DRIVER'] as Role[] }
];

function getNextMidnightDelay(timeZone: string) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });
  const asLocalUtc = (timestamp: number) => {
    const parts = formatter.formatToParts(new Date(timestamp)).reduce<Record<string, number>>((acc, part) => {
      if (part.type !== 'literal') acc[part.type] = Number(part.value);
      return acc;
    }, {});
    return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  };
  const nowParts = formatter.formatToParts(now).reduce<Record<string, number>>((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = Number(part.value);
    return acc;
  }, {});
  const nextDate = new Date(Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day + 1));
  const targetLocalAsUtc = Date.UTC(nextDate.getUTCFullYear(), nextDate.getUTCMonth(), nextDate.getUTCDate());
  let target = targetLocalAsUtc - (asLocalUtc(now.getTime()) - now.getTime());
  for (let attempt = 0; attempt < 3; attempt += 1) {
    target = targetLocalAsUtc - (asLocalUtc(target) - target);
  }
  return Math.max(1000, target - now.getTime() + 50);
}

function getDateKeyInTimeZone(timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date()).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function AppShell({ id, userId, userRole, tenantId, children }: AppShellProps) {
  const sessionKey = `${id ?? 'unknown'}:${tenantId ?? 'none'}:${userRole.toUpperCase()}`;
  return (
    <SessionProvider value={{ userId, userRole, tenantId, sessionKey }}>
      <AppShellContent key={sessionKey} userId={userId} userRole={userRole} sessionKey={sessionKey}>
        {children}
      </AppShellContent>
    </SessionProvider>
  );
}

function AppShellContent({ userId, userRole, sessionKey, children }: Omit<AppShellProps, 'id' | 'tenantId'> & { sessionKey: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openMenuGroups, setOpenMenuGroups] = useState<Record<string, boolean>>({ '/app/gestionale': true });
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [fleetAlertCounts, setFleetAlertCounts] = useState({ total: 0, upcoming: 0, overdue: 0 });
  const [serviceAlertCounts, setServiceAlertCounts] = useState({ total: 0, upcoming: 0, overdue: 0 });
  const [absencePendingCount, setAbsencePendingCount] = useState(0);
  const normalizedRole = userRole.toUpperCase() as Role;

  const userName = useMemo(() => userId || 'utente', [userId]);

  const initials = useMemo(() => userName.slice(0, 2).toUpperCase(), [userName]);

  const fleetRefreshRef = useRef<() => void>(() => undefined);
  const fleetMidnightTimerRef = useRef<number | null>(null);
  const fleetDateKeyRef = useRef<string | null>(null);
  const fleetTimeZoneRef = useRef<string | null>(null);

  const loadDeadlinesCount = useCallback(async (signal: AbortSignal) => {
    const payload = await fetchPollingJson<{ upcoming: number; overdue: number; timezone: string }>(
      '/api/fleet/vehicles/deadline-alert-counts?withinDays=30', signal
    );
    if (signal.aborted) return;
    setFleetAlertCounts({
      upcoming: payload.upcoming,
      overdue: payload.overdue,
      total: payload.upcoming + payload.overdue
    });
    fleetTimeZoneRef.current = payload.timezone;
    fleetDateKeyRef.current = getDateKeyInTimeZone(payload.timezone);
    if (fleetMidnightTimerRef.current !== null) {
      window.clearTimeout(fleetMidnightTimerRef.current);
    }
    fleetMidnightTimerRef.current = window.setTimeout(
      () => fleetRefreshRef.current(),
      getNextMidnightDelay(payload.timezone)
    );
  }, []);

  const fleetPolling = usePolling({
    fn: loadDeadlinesCount,
    intervalMs: 15 * 60_000,
    enabled: normalizedRole === 'GESTIONALE',
    identityKey: sessionKey,
    resumeThresholdMs: 2 * 60_000,
    backoff: { multiplier: 2, capMs: 2 * 60 * 60_000 },
    onAuthError: (status) => {
      if (status === 403) console.warn('Polling flotta interrotto: autorizzazione revocata.');
      if (status === 401 || status === 403) setFleetAlertCounts({ total: 0, upcoming: 0, overdue: 0 });
    }
  });
  const refreshFleet = fleetPolling.refresh;
  const refreshFleetIfIdle = fleetPolling.refreshIfIdle;
  const abortFleet = fleetPolling.abort;
  fleetRefreshRef.current = refreshFleet;

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible' || !fleetDateKeyRef.current) return;
      if (fleetTimeZoneRef.current && getDateKeyInTimeZone(fleetTimeZoneRef.current) !== fleetDateKeyRef.current) {
        refreshFleetIfIdle();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshFleetIfIdle, sessionKey]);

  useEffect(() => () => {
    if (fleetMidnightTimerRef.current !== null) window.clearTimeout(fleetMidnightTimerRef.current);
    abortFleet();
  }, [abortFleet, sessionKey]);

  useEffect(() => {
    if (normalizedRole !== 'GESTIONALE') {
      setFleetAlertCounts({ total: 0, upcoming: 0, overdue: 0 });
      return;
    }
    let debounceTimer: number | null = null;
    const handleFleetRefresh = () => {
      if (debounceTimer !== null) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        refreshFleet();
      }, 200);
    };
    window.addEventListener('rideops:fleet:refresh', handleFleetRefresh);
    return () => {
      window.removeEventListener('rideops:fleet:refresh', handleFleetRefresh);
      if (debounceTimer !== null) window.clearTimeout(debounceTimer);
    };
  }, [refreshFleet, normalizedRole, sessionKey]);

  const serviceAlertHref = normalizedRole === 'DRIVER' ? '/app/driver' : '/app/services?unassigned=1';

  useEffect(() => {
    const handleResize = () => {
      setIsMobileViewport(window.innerWidth <= 960);
      if (window.innerWidth > 960) {
        setMobileMenuOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  const sidebarCollapsed = collapsed && !isMobileViewport;
  const fleetHasAlerts = fleetAlertCounts.total > 0;
  const serviceHasAlerts = serviceAlertCounts.total > 0;
  const absenceHasAlerts = absencePendingCount > 0;

  const loadPendingAbsences = useCallback(async (signal: AbortSignal) => {
    const payload = await fetchPollingJson<{ count?: number }>('/api/richieste-assenza/pending-count', signal);
    if (signal.aborted) return;
    setAbsencePendingCount(payload.count ?? 0);
  }, []);
  const absencePolling = usePolling({
    fn: loadPendingAbsences,
    intervalMs: 5 * 60_000,
    enabled: normalizedRole === 'GESTIONALE',
    identityKey: sessionKey,
    resumeThresholdMs: 60_000,
    backoff: { multiplier: 2, capMs: 2 * 60 * 60_000 },
    onAuthError: (status) => {
      if (status === 403) console.warn('Polling assenze interrotto: autorizzazione revocata.');
      if (status === 401 || status === 403) setAbsencePendingCount(0);
    }
  });
  const refreshAbsences = absencePolling.refresh;

  useEffect(() => {
    if (normalizedRole !== 'GESTIONALE') setAbsencePendingCount(0);
  }, [normalizedRole, sessionKey]);

  const loadServiceAlertCount = useCallback(async (signal: AbortSignal) => {

    function toIsoStartOfDay(date: Date) {
      const copy = new Date(date);
      copy.setHours(0, 0, 0, 0);
      return copy.toISOString().slice(0, 19);
    }

    function addDays(date: Date, days: number) {
      const copy = new Date(date);
      copy.setDate(copy.getDate() + days);
      return copy;
    }

    function summarizeWindow(items: Array<{ startAt?: string; status?: string }>) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const endExclusive = addDays(start, 3);

      return items.reduce(
        (acc, item) => {
          if (!item.startAt) {
            return acc;
          }
          if (item.status === 'CLOSED' || item.status === 'EXECUTED') {
            return acc;
          }

          const at = new Date(item.startAt);
          if (Number.isNaN(at.getTime())) {
            return acc;
          }

          if (at < start) {
            acc.overdue += 1;
            return acc;
          }

          if (at >= start && at < endExclusive) {
            acc.upcoming += 1;
          }

          return acc;
        },
        { total: 0, upcoming: 0, overdue: 0 }
      );
    }

      if (normalizedRole === 'DRIVER') {
        const windowStart = new Date();
        windowStart.setHours(0, 0, 0, 0);
        const windowEnd = toIsoStartOfDay(addDays(windowStart, 3));
        // Driver alert count uses the unified endpoint constrained to today + next 3 days.
        const payload = await fetchPollingJson<unknown>(`/api/driver/services?from=${encodeURIComponent(toIsoStartOfDay(windowStart))}&to=${encodeURIComponent(windowEnd)}`, signal);
        if (signal.aborted) return;
        if (!Array.isArray(payload)) return;
        const summary = summarizeWindow(payload as Array<{ startAt?: string; status?: string }>);
        setServiceAlertCounts({ ...summary, total: summary.upcoming + summary.overdue });
        return;
      }

      // Keep admin/gestionale badge aligned with the Services page "Servizi non assegnati" card.
      const payload = await fetchPollingJson<{ count?: number }>('/api/services/unassigned-count', signal);
      if (signal.aborted) return;
      const count = payload.count ?? 0;
      // Use overdue channel to keep red emphasis when count is greater than zero.
      setServiceAlertCounts({ total: count, upcoming: 0, overdue: count });
  }, [normalizedRole]);

  const servicePolling = usePolling({
    fn: loadServiceAlertCount,
    intervalMs: 60_000,
    enabled: normalizedRole === 'GESTIONALE' || normalizedRole === 'DRIVER',
    identityKey: sessionKey,
    resumeThresholdMs: 60_000,
    backoff: { multiplier: 2, capMs: 2 * 60 * 60_000 },
    onAuthError: (status) => {
      if (status === 403) console.warn('Polling servizi interrotto: autorizzazione revocata.');
      if (status === 401 || status === 403) setServiceAlertCounts({ total: 0, upcoming: 0, overdue: 0 });
    }
  });
  const refreshServices = servicePolling.refresh;

  useEffect(() => {
    const handleAbsenceRefresh = () => refreshAbsences();
    const handleServiceRefresh = () => refreshServices();
    window.addEventListener('rideops:absence:refresh', handleAbsenceRefresh);
    window.addEventListener('rideops:services:refresh', handleServiceRefresh);
    return () => {
      window.removeEventListener('rideops:absence:refresh', handleAbsenceRefresh);
      window.removeEventListener('rideops:services:refresh', handleServiceRefresh);
    };
  }, [refreshAbsences, refreshServices]);

  useEffect(() => {
    if (normalizedRole !== 'GESTIONALE' && normalizedRole !== 'DRIVER') {
      setServiceAlertCounts({ total: 0, upcoming: 0, overdue: 0 });
    }
  }, [normalizedRole, sessionKey]);

  return (
    <div className="app-shell">
      <div
        className={`app-shell-backdrop ${mobileMenuOpen ? 'visible' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <button className="collapse-button" onClick={() => setCollapsed((prev) => !prev)} type="button">
          {sidebarCollapsed ? '»' : '«'}
        </button>

        <Link href="/app" className="brand-link">
          <img src="/rideops-logo.svg" alt="RideOps" className="brand-logo" />
          {!sidebarCollapsed && <span className="brand-text">RideOps</span>}
        </Link>

        <nav className="menu">
          {menuItems
            .filter((item) => item.roles.includes(normalizedRole))
            .map((item) => {
              const visibleChildren = item.children?.filter((child) => child.roles.includes(normalizedRole)) ?? [];
              const hasChildren = visibleChildren.length > 0;
              const isGroupOpen = openMenuGroups[item.href] ?? true;

              return (
                <div key={item.href} className="menu-group">
                  <div className="menu-link-row">
                    <Link href={item.href} className="menu-link" onClick={() => setMobileMenuOpen(false)}>
                      <span className="menu-icon" aria-hidden="true">{item.icon}</span>
                      {!sidebarCollapsed && <span>{item.label}</span>}
                    </Link>
                    {!sidebarCollapsed && hasChildren && (
                      <button
                        type="button"
                        className={`menu-toggle ${isGroupOpen ? 'is-open' : ''}`}
                        aria-expanded={isGroupOpen}
                        aria-label={`${isGroupOpen ? 'Nascondi' : 'Mostra'} sottomenu ${item.label}`}
                        onClick={() => setOpenMenuGroups((prev) => ({ ...prev, [item.href]: !isGroupOpen }))}
                      >
                        <span className="menu-toggle-chevron" aria-hidden="true">
                          <svg viewBox="0 0 24 24" focusable="false">
                            <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      </button>
                    )}
                  </div>
                  {!sidebarCollapsed && hasChildren && (
                    <div className={`menu-submenu ${isGroupOpen ? 'is-open' : ''}`}>
                      <div className="menu-submenu-inner">
                        {visibleChildren.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className="menu-link menu-sublink"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <span className="menu-icon" aria-hidden="true">{child.icon}</span>
                            <span>{child.label}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </nav>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="topbar-identity">
            <button
              type="button"
              className="mobile-menu-button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Apri menu navigazione"
            >
              ☰
            </button>

            <div className="user-info">
              <span className="avatar">{initials}</span>
              <div className="user-meta">
                <div className="user-name">{userName}</div>
                <div className="user-role">{userRole}</div>
                <form action="/api/auth/logout" method="post" className="topbar-inline-logout-form">
                  <button type="submit" className="topbar-inline-logout">Logout</button>
                </form>
              </div>
            </div>
          </div>

          <div className="topbar-actions">
            {(normalizedRole === 'GESTIONALE') && (
              <Link
                href="/app/fleet"
                className={`logout-button mobile-alert-chip mobile-alert-chip-fleet ${fleetHasAlerts ? 'is-alert' : 'is-clear'}`}
              >
                <span className="alert-chip-icon" aria-hidden="true">{fleetHasAlerts ? '⚠️' : '✅'}</span>
                <span className="alert-chip-label">Flotta:</span>
                <span className="alert-chip-count">{fleetAlertCounts.total}</span>
              </Link>
            )}

            {(normalizedRole === 'GESTIONALE' || normalizedRole === 'DRIVER') && (
              <Link
                href={serviceAlertHref}
                className={`logout-button mobile-alert-chip mobile-alert-chip-service ${serviceHasAlerts ? 'is-alert' : 'is-clear'}`}
              >
                <span className="alert-chip-icon" aria-hidden="true">{serviceHasAlerts ? '⚠️' : '✅'}</span>
                <span className="alert-chip-label">Servizi:</span>
                <span className="alert-chip-count">{serviceAlertCounts.total}</span>
              </Link>
            )}

            {normalizedRole === 'GESTIONALE' && (
              <Link
                href="/app/gestionale/assenze"
                className={`logout-button mobile-alert-chip mobile-alert-chip-absence ${absenceHasAlerts ? 'is-alert' : 'is-clear'}`}
              >
                <span className="alert-chip-icon" aria-hidden="true">{absenceHasAlerts ? '⚠️' : '✅'}</span>
                <span className="alert-chip-label">Assenze:</span>
                <span className="alert-chip-count">{absencePendingCount}</span>
              </Link>
            )}
          </div>
        </header>

        <main className="content-panel">{children}</main>
      </section>
    </div>
  );
}
