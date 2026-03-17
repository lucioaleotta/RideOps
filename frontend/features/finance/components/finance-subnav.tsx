"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type FinanceSubnavProps = {
  active: 'overview' | 'movements';
};

const navItems = [
  { href: '/app/finance', label: 'Panoramica', key: 'overview' },
  { href: '/app/finance/movements', label: 'Movimenti', key: 'movements' }
] as const;

export function FinanceSubnav({ active }: FinanceSubnavProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sottomenu finance"
      style={{
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        padding: 8,
        borderRadius: 14,
        background: '#eef4fb',
        border: '1px solid #d6e3f3'
      }}
    >
      {navItems.map((item) => {
        const isActive = active === item.key || pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              padding: '9px 14px',
              borderRadius: 999,
              fontWeight: 700,
              textDecoration: 'none',
              background: isActive ? '#1e88e5' : '#ffffff',
              color: isActive ? '#ffffff' : '#18406b',
              border: isActive ? '1px solid #1e88e5' : '1px solid #cfe0f2'
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}