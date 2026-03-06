"use client";

import Link from 'next/link';
import { useMemo, useState } from 'react';

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
  { href: '/app/gestionale', label: 'Gestionale', icon: '📋', roles: ['ADMIN', 'GESTIONALE'] as Role[] },
  { href: '/app/driver', label: 'Driver', icon: '🚗', roles: ['ADMIN', 'DRIVER'] as Role[] }
];

export function AppShell({ userId, userRole, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const normalizedRole = userRole.toUpperCase() as Role;

  const userName = useMemo(() => userId || 'utente', [userId]);

  const initials = useMemo(() => userName.slice(0, 2).toUpperCase(), [userName]);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <button className="collapse-button" onClick={() => setCollapsed((prev) => !prev)} type="button">
          {collapsed ? '»' : '«'}
        </button>

        <Link href="/app" className="brand-link">
          <img src="/rideops-logo.svg" alt="RideOps" className="brand-logo" />
          {!collapsed && <span className="brand-text">RideOps</span>}
        </Link>

        <nav className="menu">
          {menuItems
            .filter((item) => item.roles.includes(normalizedRole))
            .map((item) => (
            <Link key={item.href} href={item.href} className="menu-link">
              <span className="menu-icon" aria-hidden="true">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
            ))}
        </nav>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="user-info">
            <span className="avatar">{initials}</span>
            <div>
              <div className="user-name">{userName}</div>
              <div className="user-role">{userRole}</div>
            </div>
          </div>

          <form action="/api/auth/logout" method="post">
            <button type="submit" className="logout-button">Logout</button>
          </form>
        </header>

        <main className="content-panel">{children}</main>
      </section>
    </div>
  );
}
