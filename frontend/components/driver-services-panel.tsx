"use client";

import { useEffect, useState } from 'react';
import { formatCurrencyEUR } from '../lib/currency';

type ServiceItem = {
  id: number;
  startAt: string;
  pickupLocation: string;
  destination: string;
  type: 'TRANSFER' | 'TOUR';
  durationHours: number | null;
  notes: string | null;
  price: number | null;
  status: 'OPEN' | 'ASSIGNED' | 'CLOSED';
};

export function DriverServicesPanel() {
  const [today, setToday] = useState<ServiceItem[]>([]);
  const [upcoming, setUpcoming] = useState<ServiceItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const [todayResponse, upcomingResponse] = await Promise.all([
        fetch('/api/driver/services/today', { cache: 'no-store' }),
        fetch('/api/driver/services/upcoming', { cache: 'no-store' })
      ]);

      const todayPayload = (await todayResponse.json().catch(() => [])) as ServiceItem[] | { message?: string };
      const upcomingPayload = (await upcomingResponse.json().catch(() => [])) as ServiceItem[] | { message?: string };

      if (!todayResponse.ok) {
        setError((todayPayload as { message?: string }).message ?? 'Errore caricamento servizi di oggi');
        setLoading(false);
        return;
      }

      if (!upcomingResponse.ok) {
        setError((upcomingPayload as { message?: string }).message ?? 'Errore caricamento servizi futuri');
        setLoading(false);
        return;
      }

      setToday(todayPayload as ServiceItem[]);
      setUpcoming(upcomingPayload as ServiceItem[]);
      setLoading(false);
    }

    load();
  }, []);

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      {error && <p className="error-text">{error}</p>}
      {loading ? (
        <p>Caricamento servizi driver...</p>
      ) : (
        <>
          <article className="dashboard-card">
            <h3>Servizi di oggi</h3>
            {today.length === 0 ? (
              <p>Nessun servizio assegnato per oggi.</p>
            ) : (
              <ul style={{ display: 'grid', gap: 10, listStyle: 'none', margin: 0, padding: 0 }}>
                {today.map((service) => (
                  <li key={service.id} className="dashboard-card">
                    <strong>{new Date(service.startAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</strong>
                    <p>{service.pickupLocation} → {service.destination}</p>
                    <p>{service.type} · {formatCurrencyEUR(service.price)}</p>
                    <p>Stato: {service.status}</p>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="dashboard-card">
            <h3>Prossimi servizi</h3>
            {upcoming.length === 0 ? (
              <p>Nessun servizio futuro assegnato.</p>
            ) : (
              <ul style={{ display: 'grid', gap: 10, listStyle: 'none', margin: 0, padding: 0 }}>
                {upcoming.map((service) => (
                  <li key={service.id} className="dashboard-card">
                    <strong>{new Date(service.startAt).toLocaleString('it-IT')}</strong>
                    <p>{service.pickupLocation} → {service.destination}</p>
                    <p>{service.type} · {formatCurrencyEUR(service.price)}</p>
                    <p>Stato: {service.status}</p>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </>
      )}
    </section>
  );
}