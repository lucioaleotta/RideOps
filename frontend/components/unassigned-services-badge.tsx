"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ButtonContent, FilterIcon } from './action-icons';

export function UnassignedServicesBadge() {
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const response = await fetch('/api/services/unassigned-count', { cache: 'no-store' });
      const payload = (await response.json().catch(() => ({}))) as { count?: number; message?: string };

      if (!response.ok) {
        setError(payload.message ?? 'Errore caricamento badge');
        return;
      }

      setCount(payload.count ?? 0);
    }

    load();
  }, []);

  return (
    <article className="dashboard-card">
      <h3>Servizi non assegnati</h3>
      {error ? (
        <p className="error-text">{error}</p>
      ) : (
        <div
          className={`mobile-alert-chip ${count > 0 ? 'is-alert' : 'is-clear'}`}
          style={{ width: 'fit-content', marginTop: 6 }}
        >
          <span className="alert-chip-icon" aria-hidden="true">{count > 0 ? '⚠️' : '✅'}</span>
          <span className="alert-chip-label">Servizi:</span>
          <span className="alert-chip-count">{count}</span>
        </div>
      )}
      {!error && (
        <p style={{ marginTop: 10, marginBottom: 0 }}>
          <Link href="/app/services?unassigned=1" className="logout-button compact-button" style={{ display: 'inline-block' }}>
            <ButtonContent icon={<FilterIcon />}>Vedi non assegnati</ButtonContent>
          </Link>
        </p>
      )}
    </article>
  );
}