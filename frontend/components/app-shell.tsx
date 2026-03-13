"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type AppShellProps = {
  userId: string;
  userRole: string;
  children: React.ReactNode;
};

type Role = 'ADMIN' | 'GESTIONALE' | 'DRIVER';

const menuItems = [
  { href: '/app', label: 'Home', icon: '🏠', roles: ['ADMIN', 'GESTIONALE', 'DRIVER'] as Role[] },
  { href: '/app/admin', label: 'Admin', icon: '🛡️', roles: ['ADMIN'] as Role[] },
  { href: '/app/services', label: 'Services', icon: '🧾', roles: ['ADMIN', 'GESTIONALE'] as Role[] },
  { href: '/app/finance', label: 'Finance', icon: '💶', roles: ['ADMIN', 'GESTIONALE'] as Role[] },
  { href: '/app/fleet', label: 'Fleet', icon: '🚙', roles: ['ADMIN', 'GESTIONALE'] as Role[] },
  { href: '/app/gestionale', label: 'Gestione Personale', icon: '📋', roles: ['ADMIN', 'GESTIONALE'] as Role[] },
  { href: '/app/driver', label: 'Driver', icon: '🚗', roles: ['ADMIN', 'DRIVER'] as Role[] }
];

export function AppShell({ userId, userRole, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [fleetAlertCounts, setFleetAlertCounts] = useState({ total: 0, upcoming: 0, overdue: 0 });
  const [serviceAlertCounts, setServiceAlertCounts] = useState({ total: 0, upcoming: 0, overdue: 0 });
  const normalizedRole = userRole.toUpperCase() as Role;

  const userName = useMemo(() => userId || 'utente', [userId]);

  const initials = useMemo(() => userName.slice(0, 2).toUpperCase(), [userName]);

  useEffect(() => {
    const canSeeFleetAlerts = normalizedRole === 'ADMIN' || normalizedRole === 'GESTIONALE';
    if (!canSeeFleetAlerts) {
      return;
    }

    let isMounted = true;

    async function loadDeadlinesCount() {
      const vehiclesResponse = await fetch('/api/fleet/vehicles', { cache: 'no-store' });
      const vehiclesPayload = (await vehiclesResponse.json().catch(() => [])) as unknown;

      if (!vehiclesResponse.ok || !Array.isArray(vehiclesPayload)) {
        return;
      }

      const vehicleIds = (vehiclesPayload as Array<{ id?: number }>)
        .map((item) => item.id)
        .filter((id): id is number => typeof id === 'number');

      if (vehicleIds.length === 0) {
        if (isMounted) {
          setFleetAlertCounts({ total: 0, upcoming: 0, overdue: 0 });
        }
        return;
      }

      const detailResponses = await Promise.all(
        vehicleIds.map((id) =>
          fetch(`/api/fleet/vehicles/${id}/detail?withinDays=7`, { cache: 'no-store' })
            .then(async (response) => {
              if (!response.ok) {
                return null;
              }
              return (await response.json().catch(() => null)) as {
                upcomingCount?: number;
                overdueCount?: number;
              } | null;
            })
            .catch(() => null)
        )
      );

      const aggregated = detailResponses.reduce(
        (acc, item) => {
          if (!item) {
            return acc;
          }

          acc.upcoming += item.upcomingCount ?? 0;
          acc.overdue += item.overdueCount ?? 0;
          return acc;
        },
        { upcoming: 0, overdue: 0 }
      );

      if (isMounted) {
        setFleetAlertCounts({
          upcoming: aggregated.upcoming,
          overdue: aggregated.overdue,
          total: aggregated.upcoming + aggregated.overdue
        });
      }
    }

    function handleFleetAlertsRefresh() {
      loadDeadlinesCount();
    }

    window.addEventListener('fleet-alerts-refresh', handleFleetAlertsRefresh);
    document.addEventListener('fleet-alerts-refresh', handleFleetAlertsRefresh as EventListener);
    loadDeadlinesCount();
    const pollId = window.setInterval(loadDeadlinesCount, 30_000);

    return () => {
      isMounted = false;
      window.removeEventListener('fleet-alerts-refresh', handleFleetAlertsRefresh);
      document.removeEventListener('fleet-alerts-refresh', handleFleetAlertsRefresh as EventListener);
      window.clearInterval(pollId);
    };
  }, [normalizedRole]);

  const fleetAlertStyle = useMemo(() => {
    if (fleetAlertCounts.overdue > 0) {
      return {
        display: 'inline-block',
        background: '#fdecea',
        color: '#d32f2f',
        fontWeight: 700
      } as const;
    }

    if (fleetAlertCounts.upcoming > 0) {
      return {
        display: 'inline-block',
        background: '#fff3e0',
        color: '#ef6c00',
        fontWeight: 700
      } as const;
    }

    return { display: 'inline-block' } as const;
  }, [fleetAlertCounts.overdue, fleetAlertCounts.upcoming]);

  const serviceAlertStyle = useMemo(() => {
    if (serviceAlertCounts.overdue > 0) {
      return {
        display: 'inline-block',
        background: '#fdecea',
        color: '#d32f2f',
        fontWeight: 700
      } as const;
    }

    if (serviceAlertCounts.upcoming > 0) {
      return {
        display: 'inline-block',
        background: '#fff3e0',
        color: '#ef6c00',
        fontWeight: 700
      } as const;
    }

    return { display: 'inline-block' } as const;
  }, [serviceAlertCounts.overdue, serviceAlertCounts.upcoming]);

  const serviceAlertHref = normalizedRole === 'DRIVER' ? '/app/driver' : '/app/services';

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

  useEffect(() => {
    const canSeeServiceAlerts = normalizedRole === 'ADMIN' || normalizedRole === 'GESTIONALE' || normalizedRole === 'DRIVER';
    if (!canSeeServiceAlerts) {
      return;
    }

    let isMounted = true;

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
          if (item.status === 'CLOSED') {
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

    async function loadServiceAlertCount() {
      if (normalizedRole === 'DRIVER') {
        const windowStart = new Date();
        windowStart.setHours(0, 0, 0, 0);
        const windowEnd = toIsoStartOfDay(addDays(windowStart, 3));
        // Driver alert count uses the unified endpoint constrained to today + next 3 days.
        const response = await fetch(`/api/driver/services?from=${encodeURIComponent(toIsoStartOfDay(windowStart))}&to=${encodeURIComponent(windowEnd)}`, {
          cache: 'no-store'
        });

        const payload = (await response.json().catch(() => [])) as unknown;

        if (!response.ok || !Array.isArray(payload)) {
          return;
        }

        if (isMounted) {
          const summary = summarizeWindow(payload as Array<{ startAt?: string; status?: string }>);
          setServiceAlertCounts({
            ...summary,
            total: summary.upcoming + summary.overdue
          });
        }
        return;
      }

      const today = new Date();
      const to = toIsoStartOfDay(addDays(today, 3));
      const query = new URLSearchParams({ to });

      const response = await fetch(`/api/services?${query.toString()}`, { cache: 'no-store' });
      const payload = (await response.json().catch(() => [])) as unknown;

      if (!response.ok || !Array.isArray(payload)) {
        return;
      }

      if (isMounted) {
        const summary = summarizeWindow(payload as Array<{ startAt?: string; status?: string }>);
        setServiceAlertCounts({
          ...summary,
          total: summary.upcoming + summary.overdue
        });
      }
    }

    loadServiceAlertCount();
    const pollId = window.setInterval(loadServiceAlertCount, 30_000);

    return () => {
      isMounted = false;
      window.clearInterval(pollId);
    };
  }, [normalizedRole]);

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
            .map((item) => (
            <Link key={item.href} href={item.href} className="menu-link" onClick={() => setMobileMenuOpen(false)}>
              <span className="menu-icon" aria-hidden="true">{item.icon}</span>
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
            ))}
        </nav>
      </aside>

      <section className="main-area">
        <header className="topbar">
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
            <div>
              <div className="user-name">{userName}</div>
              <div className="user-role">{userRole}</div>
            </div>
          </div>

          <div className="topbar-actions">
            {(normalizedRole === 'ADMIN' || normalizedRole === 'GESTIONALE') && (
              <Link href="/app/fleet" className="logout-button" style={fleetAlertStyle}>
                Allarme Fleet: {fleetAlertCounts.total}
              </Link>
            )}

            {(normalizedRole === 'ADMIN' || normalizedRole === 'GESTIONALE' || normalizedRole === 'DRIVER') && (
              <Link href={serviceAlertHref} className="logout-button" style={serviceAlertStyle}>
                Allarme Service: {serviceAlertCounts.total}
              </Link>
            )}

            <form action="/api/auth/logout" method="post">
              <button type="submit" className="logout-button">Logout</button>
            </form>
          </div>
        </header>

        <main className="content-panel">{children}</main>
      </section>
    </div>
  );
}
