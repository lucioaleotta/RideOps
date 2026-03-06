"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';

export function GestionaleUnassignedBadge() {
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
      {error ? <p className="error-text">{error}</p> : <p style={{ fontSize: 28, margin: 0 }}>{count}</p>}
      {!error && (
        <p style={{ marginTop: 10, marginBottom: 0 }}>
          <Link href="/app/services?unassigned=1" className="logout-button compact-button" style={{ display: 'inline-block' }}>
            Vedi non assegnati
          </Link>
        </p>
      )}
    </article>
  );
}