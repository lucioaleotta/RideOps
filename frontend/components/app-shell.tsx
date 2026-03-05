"use client";

import Link from 'next/link';
import { useMemo, useState } from 'react';

type AppShellProps = {
  userEmail: string;
  userRole: string;
  children: React.ReactNode;
};

const menuItems = [
  { href: '/app', label: 'Home', icon: '🏠' },
  { href: '/app/admin', label: 'Admin', icon: '🛡️' },
  { href: '/app/gestionale', label: 'Gestionale', icon: '📋' },
  { href: '/app/driver', label: 'Driver', icon: '🚗' }
];

export function AppShell({ userEmail, userRole, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  const userName = useMemo(() => {
    const [name] = userEmail.split('@');
    return name || userEmail;
  }, [userEmail]);

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
          {menuItems.map((item) => (
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
