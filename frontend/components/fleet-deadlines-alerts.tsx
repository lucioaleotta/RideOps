"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type DeadlineType = 'BOLLO' | 'ASSICURAZIONE' | 'REVISIONE' | 'TAGLIANDO' | 'ALTRO';
type DeadlineStatus = 'DA_ESEGUIRE' | 'IN_SCADENZA' | 'SCADUTA' | 'PAGATA' | 'ESEGUITA' | 'ANNULLATA';

type DeadlineItem = {
  id: number;
  vehicleId: number;
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

type FleetDeadlinesAlertsProps = {
  withinDays?: number;
  title?: string;
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

export function FleetDeadlinesAlerts({ withinDays = 30, title = 'Allarmi scadenze veicoli' }: FleetDeadlinesAlertsProps) {
  const [items, setItems] = useState<DeadlineItem[]>([]);
  const [vehiclesById, setVehiclesById] = useState<Record<number, VehicleItem>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAlerts() {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/fleet/deadlines/upcoming?withinDays=${withinDays}`, { cache: 'no-store' });
      const payload = (await response.json().catch(() => [])) as DeadlineItem[] | { message?: string };

      if (!response.ok) {
        setError((payload as { message?: string }).message ?? 'Errore caricamento scadenze');
        setItems([]);
        setLoading(false);
        return;
      }

      setItems(payload as DeadlineItem[]);
      setLoading(false);
    }

    loadAlerts();
  }, [withinDays]);

  useEffect(() => {
    async function loadVehicles() {
      const response = await fetch('/api/fleet/vehicles', { cache: 'no-store' });
      const payload = (await response.json().catch(() => [])) as VehicleItem[];
      if (!response.ok || !Array.isArray(payload)) {
        return;
      }

      const mapped = payload.reduce<Record<number, VehicleItem>>((acc, vehicle) => {
        acc[vehicle.id] = vehicle;
        return acc;
      }, {});
      setVehiclesById(mapped);
    }

    loadVehicles();
  }, []);

  const orderedItems = useMemo(
    () => [...items].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
    [items]
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

  return (
    <article className="dashboard-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <h3>{title}</h3>
        <span>{orderedItems.length}</span>
      </div>

      {loading ? (
        <p>Caricamento allarmi...</p>
      ) : error ? (
        <p className="error-text">{error}</p>
      ) : orderedItems.length === 0 ? (
        <p>Nessuna scadenza entro {withinDays} giorni.</p>
      ) : (
        <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
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
                    ? `Targa ${vehicle.plate} · Modello ${vehicleTypeLabel(vehicle.type)} · Scadenza ${dateOnly(deadline.dueDate)}`
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
    </article>
  );
}
