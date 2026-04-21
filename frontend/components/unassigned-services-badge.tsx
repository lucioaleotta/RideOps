"use client";

import { useEffect, useState } from 'react';

type StatusCounts = { open: number; assigned: number; closedOrExecuted: number };

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#FFF4E5" stroke="#F59E0B" strokeWidth="1.5" />
      <line x1="12" y1="8" x2="12" y2="13" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1" fill="#F59E0B" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="4.5" stroke="#3B82F6" strokeWidth="1.5" />
      <line x1="12" y1="9.5" x2="12" y2="12" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="12" x2="14" y2="13.5" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#F0FDF4" stroke="#22C55E" strokeWidth="1.5" />
      <polyline points="8,12.5 11,15.5 16,10" stroke="#22C55E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function UnassignedServicesBadge() {
  const [counts, setCounts] = useState<StatusCounts | null>(null);

  useEffect(() => {
    fetch('/api/services/status-counts', { cache: 'no-store' })
      .then(r => r.json().catch(() => null))
      .then(data => {
        if (data && typeof data.open === 'number') setCounts(data as StatusCounts);
      });
  }, []);

  const open = counts?.open ?? '—';
  const assigned = counts?.assigned ?? '—';
  const closedOrExecuted = counts?.closedOrExecuted ?? '—';

  return (
    <div className="services-stat-cards">
      <article className="services-stat-card">
        <span className="services-stat-icon"><AlertIcon /></span>
        <div className="services-stat-body">
          <span className="services-stat-label">APERTI</span>
          <span className="services-stat-count">{open}</span>
          <span className="services-stat-sub">da assegnare</span>
        </div>
      </article>
      <article className="services-stat-card">
        <span className="services-stat-icon"><ClockIcon /></span>
        <div className="services-stat-body">
          <span className="services-stat-label">ASSEGNATI</span>
          <span className="services-stat-count">{assigned}</span>
          <span className="services-stat-sub">in lavorazione</span>
        </div>
      </article>
      <article className="services-stat-card">
        <span className="services-stat-icon"><CheckIcon /></span>
        <div className="services-stat-body">
          <span className="services-stat-label">CHIUSI</span>
          <span className="services-stat-count">{closedOrExecuted}</span>
          <span className="services-stat-sub">completati</span>
        </div>
      </article>
    </div>
  );
}