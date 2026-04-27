"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { StatusNotice } from './status-notice';

type DeadlineType = 'BOLLO' | 'ASSICURAZIONE' | 'REVISIONE' | 'TAGLIANDO' | 'ALTRO';
type DeadlineStatus = 'DA_ESEGUIRE' | 'IN_SCADENZA' | 'SCADUTA' | 'PAGATA' | 'ESEGUITA' | 'ANNULLATA';

type OccurrenceItem = {
  id: number;
  vehicleId: number;
  planId: number | null;
  type: DeadlineType;
  title: string;
  description: string | null;
  dueDate: string;
  status: DeadlineStatus;
  cost: number;
  currency: string;
  notes: string | null;
  paymentDate: string | null;
  executionDate: string | null;
  createdAt: string;
  updatedAt: string;
};

type VehicleType = 'SEDAN' | 'VAN' | 'MINIBUS' | 'SUV' | 'OTHER';

type VehicleItem = {
  id: number;
  plate: string;
  type: VehicleType;
};

type VehicleDetail = {
  vehicle: VehicleItem;
  upcomingCount: number;
  overdueCount: number;
  occurrences: OccurrenceItem[];
};

const OPEN_STATUSES: DeadlineStatus[] = ['DA_ESEGUIRE', 'IN_SCADENZA', 'SCADUTA'];

type FleetDeadlinesAlertsProps = {
  withinDays?: number;
  title?: string;
  suppressUnauthorizedError?: boolean;
};

function dateOnly(isoDate: string) {
  return isoDate.slice(0, 10);
}

function typeLabel(type: DeadlineType) {
  if (type === 'BOLLO') {
    return 'Bollo';
  }
  if (type === 'ASSICURAZIONE') {
    return 'Assicurazione';
  }
  if (type === 'REVISIONE') {
    return 'Revisione';
  }
  if (type === 'TAGLIANDO') {
    return 'Tagliando';
  }
  return 'Altro';
}

function daysToDue(dueDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(`${dateOnly(dueDate)}T00:00:00`);
  const diffMs = due.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function urgencyLabel(days: number) {
  if (days < 0) {
    return `Scaduta da ${Math.abs(days)} gg`;
  }
  if (days === 0) {
    return 'Scade oggi';
  }
  if (days <= 7) {
    return `Scade tra ${days} gg`;
  }
  if (days <= 15) {
    return `In scadenza (${days} gg)`;
  }
  return `Prossima (${days} gg)`;
}

export function FleetDeadlinesAlerts({
  withinDays = 30,
  title = 'Allarmi scadenze veicoli',
  suppressUnauthorizedError = false
}: FleetDeadlinesAlertsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<OccurrenceItem[]>([]);
  const [vehiclesById, setVehiclesById] = useState<Record<number, VehicleItem>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAlerts() {
      setLoading(true);
      setError(null);

      // Step 1: carica la lista veicoli (stessa logica della topbar)
      const vehiclesResponse = await fetch('/api/fleet/vehicles', { cache: 'no-store' });
      const vehiclesPayload = (await vehiclesResponse.json().catch(() => [])) as VehicleItem[] | { message?: string };

      if (!vehiclesResponse.ok) {
        const isUnauthorized = vehiclesResponse.status === 401 || vehiclesResponse.status === 403;
        if (suppressUnauthorizedError && isUnauthorized) {
          setItems([]);
          setError(null);
          setLoading(false);
          return;
        }
        setError((vehiclesPayload as { message?: string }).message ?? 'Errore caricamento veicoli');
        setItems([]);
        setLoading(false);
        return;
      }

      const vehicles = vehiclesPayload as VehicleItem[];

      const mapped = vehicles.reduce<Record<number, VehicleItem>>((acc, vehicle) => {
        acc[vehicle.id] = vehicle;
        return acc;
      }, {});
      setVehiclesById(mapped);

      if (vehicles.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      // Step 2: per ogni veicolo chiama detail (stessa fonte della topbar)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const cutoffMs = today.getTime() + withinDays * 24 * 60 * 60 * 1000;

      const detailResponses = await Promise.all(
        vehicles.map((vehicle) =>
          fetch(`/api/fleet/vehicles/${vehicle.id}/detail?withinDays=${withinDays}`, { cache: 'no-store' })
            .then(async (response) => {
              if (!response.ok) return null;
              return (await response.json().catch(() => null)) as VehicleDetail | null;
            })
            .catch(() => null)
        )
      );

      // Step 3: raccogli occorrenze aperte (imminenti + scadute)
      const allOpen: OccurrenceItem[] = [];
      for (const detail of detailResponses) {
        if (!detail) continue;
        for (const occ of detail.occurrences) {
          if (!OPEN_STATUSES.includes(occ.status)) continue;
          const due = new Date(`${occ.dueDate.slice(0, 10)}T00:00:00`);
          // scadute (passate) oppure imminenti entro la finestra
          if (due.getTime() <= cutoffMs) {
            allOpen.push(occ);
          }
        }
      }

      setItems(allOpen);
      setLoading(false);
    }

    loadAlerts();
  }, [suppressUnauthorizedError, withinDays]);

  const orderedItems = useMemo(
    () => [...items].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
    [items]
  );

  const imminentVehicleIds = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const unique = new Set<number>();
    items.forEach((item) => {
      const due = new Date(`${item.dueDate.slice(0, 10)}T00:00:00`);
      if (due >= today) {
        unique.add(item.vehicleId);
      }
    });
    return [...unique];
  }, [items]);

  const imminentVehicles = useMemo(
    () => imminentVehicleIds.map((id) => vehiclesById[id]).filter((v): v is VehicleItem => Boolean(v)),
    [imminentVehicleIds, vehiclesById]
  );

  function vehicleTypeLabel(type: VehicleType) {
    if (type === 'SEDAN') {
      return 'Sedan';
    }
    if (type === 'VAN') {
      return 'Van';
    }
    if (type === 'MINIBUS') {
      return 'Minibus';
    }
    if (type === 'SUV') {
      return 'Suv';
    }
    return 'Altro';
  }

  if (!loading && !error && orderedItems.length === 0) {
    return null;
  }

  return (
    <article className="dashboard-card">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
      >
        <div>
          <div
            className={`mobile-alert-chip ${orderedItems.length > 0 ? 'is-alert' : 'is-clear'}`}
            style={{ width: 'fit-content' }}
          >
            <span className="alert-chip-icon" aria-hidden="true">{orderedItems.length > 0 ? '⚠️' : '✅'}</span>
            <span className="alert-chip-label">{title}:</span>
            <span className="alert-chip-count">{orderedItems.length}</span>
          </div>
        </div>
        <span style={{ fontSize: 12 }}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <>
          {loading ? (
            <p>Caricamento allarmi...</p>
          ) : error ? (
            <StatusNotice tone="error">{error}</StatusNotice>
          ) : orderedItems.length === 0 ? (
            <p>Nessuna scadenza aperta.</p>
          ) : (
            <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
              {imminentVehicles.length > 0 && (
                <div>
                  <strong>Targhe con scadenze imminenti ({withinDays} gg):</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                    {imminentVehicles.map((vehicle) => (
                      <Link
                        key={vehicle.id}
                        href={`/app/fleet?vehicleId=${vehicle.id}#scadenze`}
                        style={{ padding: '4px 10px', borderRadius: 999, border: '1px solid #cfdff2', background: '#f6faff' }}
                      >
                        {vehicle.plate}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {orderedItems.map((deadline) => {
                const days = daysToDue(deadline.dueDate);
                const vehicle = vehiclesById[deadline.vehicleId];
                return (
                  <div key={deadline.id} style={{ border: '1px solid #dce8f5', borderRadius: 10, padding: 10, background: '#ffffff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                      <strong>{deadline.title || typeLabel(deadline.type)}</strong>
                      <span>{urgencyLabel(days)}</span>
                    </div>
                    <p style={{ margin: '6px 0 0 0' }}>
                      {vehicle
                        ? `Targa ${vehicle.plate} · ${vehicleTypeLabel(vehicle.type)} · Scadenza ${dateOnly(deadline.dueDate)}`
                        : `Veicolo #${deadline.vehicleId} · Scadenza ${dateOnly(deadline.dueDate)}`}
                    </p>
                    <p style={{ margin: '4px 0 0 0' }}>Stato: {deadline.status}</p>
                    {deadline.notes && <p style={{ margin: '4px 0 0 0' }}>Note: {deadline.notes}</p>}
                  </div>
                );
              })}
              <Link href="/app/fleet#scadenze">Apri scadenze Fleet</Link>
            </div>
          )}
        </>
      )}
    </article>
  );
}
