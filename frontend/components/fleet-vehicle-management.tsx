"use client";

import { FormEvent, useEffect, useState } from 'react';

type VehicleType = 'SEDAN' | 'VAN' | 'MINIBUS' | 'SUV' | 'OTHER';
type DeadlineType = 'BOLLO' | 'ASSICURAZIONE' | 'REVISIONE' | 'TAGLIANDO' | 'ALTRO';
type DeadlineStatus = 'DA_ESEGUIRE' | 'IN_SCADENZA' | 'SCADUTA' | 'PAGATA' | 'ESEGUITA' | 'ANNULLATA';

type VehicleItem = {
  id: number;
  plate: string;
  seats: number;
  type: VehicleType;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

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

type PlanItem = {
  id: number;
  vehicleId: number;
  type: DeadlineType;
  title: string;
  description: string | null;
  recurrenceMonths: number;
  nextDueDate: string;
  standardCost: number;
  currency: string;
  active: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type VehicleDetail = {
  vehicle: VehicleItem;
  upcomingCount: number;
  overdueCount: number;
  occurrences: OccurrenceItem[];
  plans: PlanItem[];
};

type OccurrenceFormState = {
  planId: number | '';
  type: DeadlineType;
  title: string;
  description: string;
  dueDate: string;
  status: DeadlineStatus;
  cost: string;
  currency: string;
  notes: string;
  paymentDate: string;
  executionDate: string;
};

type PlanFormState = {
  type: DeadlineType;
  title: string;
  description: string;
  recurrenceMonths: string;
  nextDueDate: string;
  standardCost: string;
  currency: string;
  notes: string;
};

type UnavailabilityItem = {
  id: number;
  vehicleId: number;
  startDate: string;
  endDate: string;
  reason: string;
  createdAt: string;
  updatedAt: string;
};

type UnavailabilityFormState = {
  startDate: string;
  endDate: string;
  reason: string;
};

const defaultOccurrenceForm: OccurrenceFormState = {
  planId: '',
  type: 'BOLLO',
  title: '',
  description: '',
  dueDate: '',
  status: 'DA_ESEGUIRE',
  cost: '0',
  currency: 'EUR',
  notes: '',
  paymentDate: '',
  executionDate: ''
};

const defaultPlanForm: PlanFormState = {
  type: 'BOLLO',
  title: '',
  description: '',
  recurrenceMonths: '12',
  nextDueDate: '',
  standardCost: '0',
  currency: 'EUR',
  notes: ''
};

const defaultUnavailabilityForm: UnavailabilityFormState = {
  startDate: '',
  endDate: '',
  reason: ''
};

function typeLabel(type: DeadlineType) {
  if (type === 'BOLLO') return 'Bollo';
  if (type === 'ASSICURAZIONE') return 'Assicurazione';
  if (type === 'REVISIONE') return 'Revisione';
  if (type === 'TAGLIANDO') return 'Tagliando';
  return 'Altro';
}

function statusLabel(status: DeadlineStatus) {
  if (status === 'DA_ESEGUIRE') return 'Da eseguire';
  if (status === 'IN_SCADENZA') return 'In scadenza';
  if (status === 'SCADUTA') return 'Scaduta';
  if (status === 'PAGATA') return 'Pagata';
  if (status === 'ESEGUITA') return 'Eseguita';
  return 'Annullata';
}

function isOverdueStatus(status: DeadlineStatus) {
  return status === 'SCADUTA';
}

function isDueSoonStatus(status: DeadlineStatus, dueDate: string) {
  if (status !== 'DA_ESEGUIRE' && status !== 'IN_SCADENZA') {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const normalizedDueDate = dueDate.split('T')[0];
  const due = new Date(`${normalizedDueDate}T00:00:00`);
  if (Number.isNaN(due.getTime())) {
    return false;
  }

  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return diffDays >= 0 && diffDays <= 7;
}

type FleetVehicleManagementProps = {
  userRole?: string;
};

export function FleetVehicleManagement({ userRole = 'UNKNOWN' }: FleetVehicleManagementProps) {
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | ''>('');
  const [detail, setDetail] = useState<VehicleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateVehicleForm, setShowCreateVehicleForm] = useState(false);

  const [vehicleForm, setVehicleForm] = useState({ plate: '', seats: '', type: 'SEDAN' as VehicleType, notes: '' });
  const [newVehicleForm, setNewVehicleForm] = useState({ plate: '', seats: '', type: 'SEDAN' as VehicleType, notes: '' });
  const [occurrenceForm, setOccurrenceForm] = useState<OccurrenceFormState>(defaultOccurrenceForm);
  const [planForm, setPlanForm] = useState<PlanFormState>(defaultPlanForm);
  const [unavailabilities, setUnavailabilities] = useState<UnavailabilityItem[]>([]);
  const [unavailabilityForm, setUnavailabilityForm] = useState<UnavailabilityFormState>(defaultUnavailabilityForm);

  const [showOccurrenceForm, setShowOccurrenceForm] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showUnavailabilityForm, setShowUnavailabilityForm] = useState(false);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [editingOccurrenceId, setEditingOccurrenceId] = useState<number | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [editingUnavailabilityId, setEditingUnavailabilityId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const isAdmin = userRole.toUpperCase() === 'ADMIN';

  function refreshFleetAlertBadge() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('fleet-alerts-refresh'));
      document.dispatchEvent(new Event('fleet-alerts-refresh'));

      window.setTimeout(() => {
        window.dispatchEvent(new Event('fleet-alerts-refresh'));
        document.dispatchEvent(new Event('fleet-alerts-refresh'));
      }, 350);
    }
  }

  async function loadVehicles() {
    const response = await fetch('/api/fleet/vehicles', { cache: 'no-store' });
    const payload = (await response.json().catch(() => [])) as VehicleItem[] | { message?: string };

    if (!response.ok) {
      setError((payload as { message?: string }).message ?? 'Errore caricamento veicoli');
      return;
    }

    const items = payload as VehicleItem[];
    setVehicles(items);

    if (selectedVehicleId && !items.some((item) => item.id === selectedVehicleId)) {
      setSelectedVehicleId('');
      setDetail(null);
      setShowVehicleForm(false);
    }
  }

  async function loadVehicleDetail(vehicleId: number) {
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/fleet/vehicles/${vehicleId}/detail?withinDays=30`, { cache: 'no-store' });
    const payload = (await response.json().catch(() => ({}))) as VehicleDetail | { message?: string };

    if (!response.ok) {
      setError((payload as { message?: string }).message ?? 'Errore caricamento dettaglio veicolo');
      setLoading(false);
      return;
    }

    const detailPayload = payload as VehicleDetail;
    setDetail(detailPayload);
    setVehicleForm({
      plate: detailPayload.vehicle.plate,
      seats: String(detailPayload.vehicle.seats),
      type: detailPayload.vehicle.type,
      notes: detailPayload.vehicle.notes ?? ''
    });
    setLoading(false);
  }

  async function loadVehicleUnavailabilities(vehicleId: number) {
    const response = await fetch(`/api/fleet/vehicles/${vehicleId}/unavailabilities`, { cache: 'no-store' });
    const payload = (await response.json().catch(() => [])) as UnavailabilityItem[] | { message?: string };

    if (!response.ok) {
      setError((payload as { message?: string }).message ?? 'Errore caricamento manutenzioni veicolo');
      return;
    }

    setUnavailabilities(payload as UnavailabilityItem[]);
  }

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    if (selectedVehicleId) {
      setShowVehicleForm(false);
      loadVehicleDetail(selectedVehicleId);
      loadVehicleUnavailabilities(selectedVehicleId);
    } else {
      setDetail(null);
      setUnavailabilities([]);
      setLoading(false);
    }
  }, [selectedVehicleId]);

  const occurrences = detail?.occurrences ?? [];
  const plans = detail?.plans ?? [];

  async function saveVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedVehicleId) return;

    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/fleet/vehicles/${selectedVehicleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plate: vehicleForm.plate,
        seats: Number(vehicleForm.seats),
        type: vehicleForm.type,
        notes: vehicleForm.notes.trim() || null
      })
    });

    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    if (!response.ok) {
      setError(payload.message ?? 'Aggiornamento veicolo fallito');
      return;
    }

    setSuccess('Dati veicolo aggiornati');
    setShowVehicleForm(false);
    await loadVehicles();
    await loadVehicleDetail(selectedVehicleId);
  }

  async function createVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setSuccess(null);

    const response = await fetch('/api/fleet/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plate: newVehicleForm.plate,
        seats: Number(newVehicleForm.seats),
        type: newVehicleForm.type,
        notes: newVehicleForm.notes.trim() || null
      })
    });

    const payload = (await response.json().catch(() => ({}))) as VehicleItem & { message?: string };
    if (!response.ok) {
      setError(payload.message ?? 'Creazione veicolo fallita');
      return;
    }

    setSuccess('Veicolo creato');
    setNewVehicleForm({ plate: '', seats: '', type: 'SEDAN', notes: '' });
    setShowCreateVehicleForm(true);

    await loadVehicles();
  }

  function vehicleTypeLabel(type: VehicleType) {
    if (type === 'SEDAN') return 'Sedan';
    if (type === 'VAN') return 'Van';
    if (type === 'MINIBUS') return 'Minibus';
    if (type === 'SUV') return 'Suv';
    return 'Altro';
  }

  function selectVehicle(vehicleId: number) {
    setSelectedVehicleId(vehicleId);
    setShowVehicleForm(false);
  }

  function editVehicle(vehicle: VehicleItem) {
    setSelectedVehicleId(vehicle.id);
    setVehicleForm({
      plate: vehicle.plate,
      seats: String(vehicle.seats),
      type: vehicle.type,
      notes: vehicle.notes ?? ''
    });
    setShowVehicleForm(true);
  }

  async function saveOccurrence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedVehicleId) return;

    setError(null);
    setSuccess(null);

    const payload = {
      planId: occurrenceForm.planId || null,
      type: occurrenceForm.type,
      title: occurrenceForm.title,
      description: occurrenceForm.description.trim() || null,
      dueDate: occurrenceForm.dueDate,
      status: occurrenceForm.status,
      cost: Number(occurrenceForm.cost),
      currency: occurrenceForm.currency.trim().toUpperCase(),
      notes: occurrenceForm.notes.trim() || null,
      paymentDate: occurrenceForm.paymentDate || null,
      executionDate: occurrenceForm.executionDate || null
    };

    const targetUrl = editingOccurrenceId
      ? `/api/fleet/occurrences/${editingOccurrenceId}`
      : `/api/fleet/vehicles/${selectedVehicleId}/occurrences`;

    const response = await fetch(targetUrl, {
      method: editingOccurrenceId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const responseBody = (await response.json().catch(() => ({}))) as { message?: string };
    if (!response.ok) {
      setError(responseBody.message ?? 'Salvataggio occorrenza fallito');
      return;
    }

    setSuccess(editingOccurrenceId ? 'Occorrenza aggiornata' : 'Occorrenza creata');
    setOccurrenceForm(defaultOccurrenceForm);
    setEditingOccurrenceId(null);
    setShowOccurrenceForm(true);
    refreshFleetAlertBadge();
    await loadVehicleDetail(selectedVehicleId);
  }

  async function savePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedVehicleId) return;

    setError(null);
    setSuccess(null);

    const payload = {
      type: planForm.type,
      title: planForm.title,
      description: planForm.description.trim() || null,
      recurrenceMonths: Number(planForm.recurrenceMonths),
      nextDueDate: planForm.nextDueDate,
      standardCost: Number(planForm.standardCost),
      currency: planForm.currency.trim().toUpperCase(),
      notes: planForm.notes.trim() || null
    };

    const targetUrl = editingPlanId
      ? `/api/fleet/plans/${editingPlanId}`
      : `/api/fleet/vehicles/${selectedVehicleId}/plans`;

    const response = await fetch(targetUrl, {
      method: editingPlanId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const responseBody = (await response.json().catch(() => ({}))) as { message?: string };
    if (!response.ok) {
      setError(responseBody.message ?? 'Salvataggio piano fallito');
      return;
    }

    setSuccess(editingPlanId ? 'Piano aggiornato' : 'Piano creato');
    setPlanForm(defaultPlanForm);
    setEditingPlanId(null);
    setShowPlanForm(true);
    refreshFleetAlertBadge();
    await loadVehicleDetail(selectedVehicleId);
  }

  async function quickOccurrenceAction(occurrenceId: number, action: 'paid' | 'completed' | 'cancel') {
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/fleet/occurrences/${occurrenceId}/${action}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: action === 'cancel' ? undefined : JSON.stringify({ date: new Date().toISOString().slice(0, 10) })
    });

    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    if (!response.ok) {
      setError(payload.message ?? 'Operazione non riuscita');
      return;
    }

    setSuccess('Stato scadenza aggiornato');
    refreshFleetAlertBadge();
    if (selectedVehicleId) {
      await loadVehicleDetail(selectedVehicleId);
    }
  }

  async function togglePlan(planId: number, active: boolean) {
    setError(null);
    setSuccess(null);

    const target = active ? 'deactivate' : 'reactivate';
    const response = await fetch(`/api/fleet/plans/${planId}/${target}`, { method: 'PATCH' });
    const payload = (await response.json().catch(() => ({}))) as { message?: string };

    if (!response.ok) {
      setError(payload.message ?? 'Operazione piano non riuscita');
      return;
    }

    setSuccess(active ? 'Piano disattivato' : 'Piano riattivato');
    refreshFleetAlertBadge();
    if (selectedVehicleId) {
      await loadVehicleDetail(selectedVehicleId);
    }
  }

  async function saveUnavailability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedVehicleId) {
      return;
    }

    setError(null);
    setSuccess(null);

    const targetUrl = editingUnavailabilityId
      ? `/api/fleet/unavailabilities/${editingUnavailabilityId}`
      : `/api/fleet/vehicles/${selectedVehicleId}/unavailabilities`;

    const response = await fetch(targetUrl, {
      method: editingUnavailabilityId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: unavailabilityForm.startDate,
        endDate: unavailabilityForm.endDate,
        reason: unavailabilityForm.reason
      })
    });

    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    if (!response.ok) {
      setError(payload.message ?? 'Salvataggio manutenzione non riuscito');
      return;
    }

    setSuccess(editingUnavailabilityId ? 'Manutenzione aggiornata' : 'Manutenzione inserita');
    setEditingUnavailabilityId(null);
    setUnavailabilityForm(defaultUnavailabilityForm);
    setShowUnavailabilityForm(true);
    await loadVehicleUnavailabilities(selectedVehicleId);
  }

  async function deleteUnavailability(unavailabilityId: number) {
    if (!selectedVehicleId) {
      return;
    }

    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/fleet/unavailabilities/${unavailabilityId}`, { method: 'DELETE' });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      setError(payload.message ?? 'Eliminazione manutenzione non riuscita');
      return;
    }

    setSuccess('Manutenzione eliminata');
    if (editingUnavailabilityId === unavailabilityId) {
      setEditingUnavailabilityId(null);
      setUnavailabilityForm(defaultUnavailabilityForm);
    }
    await loadVehicleUnavailabilities(selectedVehicleId);
  }

  async function syncMissingOccurrences() {
    if (!isAdmin) {
      return;
    }

    setError(null);
    setSuccess(null);

    const response = await fetch('/api/fleet/plans/sync-missing-occurrences', {
      method: 'POST'
    });
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
      plansScanned?: number;
      plansActive?: number;
      occurrencesCreated?: number;
      occurrencesAlreadyPresent?: number;
    };

    if (!response.ok) {
      setError(payload.message ?? 'Sync piani non riuscito');
      return;
    }

    setSuccess(
      `Sync completato: piani ${payload.plansScanned ?? 0}, attivi ${payload.plansActive ?? 0}, create ${payload.occurrencesCreated ?? 0}, già presenti ${payload.occurrencesAlreadyPresent ?? 0}`
    );
    refreshFleetAlertBadge();

    if (selectedVehicleId) {
      await loadVehicleDetail(selectedVehicleId);
    }
  }

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <article className="dashboard-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <h2>Gestione Veicoli e Scadenze</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {isAdmin && (
              <button
                type="button"
                className="primary-button compact-button"
                onClick={syncMissingOccurrences}
              >
                Sync piani
              </button>
            )}
            <button
              type="button"
              className="primary-button compact-button"
              onClick={() => setShowCreateVehicleForm((prev) => !prev)}
            >
              {showCreateVehicleForm ? 'Chiudi nuovo veicolo' : 'Nuovo veicolo'}
            </button>
          </div>
        </div>
        <p>Vista completa: dati veicolo, occorrenze singole, storico e piani ricorrenti.</p>

        {showCreateVehicleForm && (
          <form className="form-grid" onSubmit={createVehicle} style={{ marginBottom: 12 }}>
            <label>
              Targa
              <input
                className="form-input"
                value={newVehicleForm.plate}
                onChange={(event) => setNewVehicleForm((prev) => ({ ...prev, plate: event.target.value }))}
                required
              />
            </label>
            <label>
              Posti
              <input
                className="form-input"
                type="number"
                min={1}
                value={newVehicleForm.seats}
                onChange={(event) => setNewVehicleForm((prev) => ({ ...prev, seats: event.target.value }))}
                required
              />
            </label>
            <label>
              Tipo
              <select
                className="form-input"
                value={newVehicleForm.type}
                onChange={(event) => setNewVehicleForm((prev) => ({ ...prev, type: event.target.value as VehicleType }))}
              >
                <option value="SEDAN">Sedan</option>
                <option value="VAN">Van</option>
                <option value="MINIBUS">Minibus</option>
                <option value="SUV">Suv</option>
                <option value="OTHER">Altro</option>
              </select>
            </label>
            <label>
              Note
              <input
                className="form-input"
                value={newVehicleForm.notes}
                onChange={(event) => setNewVehicleForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </label>
            <button type="submit" className="primary-button compact-button">Crea veicolo</button>
          </form>
        )}

        <p style={{ marginTop: 8 }}>
          {selectedVehicleId
            ? `Veicolo selezionato: ${vehicles.find((item) => item.id === selectedVehicleId)?.plate ?? `#${selectedVehicleId}`}`
            : 'Nessun veicolo selezionato'}
        </p>
      </article>

      <article className="dashboard-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <h3>1) Lista veicoli</h3>
            </div>

            <div style={{ overflowX: 'auto', marginTop: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Targa</th>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Posti</th>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Tipo</th>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Note</th>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.length === 0 ? (
                    <tr>
                      <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }} colSpan={5}>
                        Nessun veicolo presente.
                      </td>
                    </tr>
                  ) : (
                    vehicles.map((vehicle) => (
                      <tr
                        key={vehicle.id}
                        style={selectedVehicleId === vehicle.id ? { background: '#eaf1f9' } : undefined}
                        aria-current={selectedVehicleId === vehicle.id ? 'true' : undefined}
                      >
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>{vehicle.plate}</td>
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>{vehicle.seats}</td>
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>{vehicleTypeLabel(vehicle.type)}</td>
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>{vehicle.notes ?? '-'}</td>
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button type="button" className="primary-button compact-button" onClick={() => editVehicle(vehicle)}>
                              Modifica
                            </button>
                            <button
                              type="button"
                              className="logout-button"
                              onClick={() => selectVehicle(vehicle.id)}
                              disabled={selectedVehicleId === vehicle.id}
                            >
                              {selectedVehicleId === vehicle.id ? 'Selezionato' : 'Seleziona'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {showVehicleForm && selectedVehicleId && (
              <form className="form-grid" onSubmit={saveVehicle} style={{ marginTop: 10 }}>
                <label>
                  Targa
                  <input className="form-input" value={vehicleForm.plate} onChange={(e) => setVehicleForm((p) => ({ ...p, plate: e.target.value }))} required />
                </label>
                <label>
                  Posti
                  <input className="form-input" type="number" min={1} value={vehicleForm.seats} onChange={(e) => setVehicleForm((p) => ({ ...p, seats: e.target.value }))} required />
                </label>
                <label>
                  Tipo
                  <select className="form-input" value={vehicleForm.type} onChange={(e) => setVehicleForm((p) => ({ ...p, type: e.target.value as VehicleType }))}>
                    <option value="SEDAN">Sedan</option>
                    <option value="VAN">Van</option>
                    <option value="MINIBUS">Minibus</option>
                    <option value="SUV">Suv</option>
                    <option value="OTHER">Altro</option>
                  </select>
                </label>
                <label>
                  Note
                  <input className="form-input" value={vehicleForm.notes} onChange={(e) => setVehicleForm((p) => ({ ...p, notes: e.target.value }))} />
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" className="primary-button compact-button">Salva dati veicolo</button>
                  <button type="button" className="logout-button" onClick={() => setShowVehicleForm(false)}>Annulla</button>
                </div>
              </form>
            )}
      </article>

      {!selectedVehicleId ? (
        <article className="dashboard-card"><p>Nessun veicolo selezionato. Usa il pulsante "Seleziona" nella lista veicoli.</p></article>
      ) : loading ? (
        <article className="dashboard-card"><p>Caricamento dettaglio veicolo...</p></article>
      ) : !detail ? (
        <article className="dashboard-card"><p>Dettaglio veicolo non disponibile.</p></article>
      ) : (
        <>
          <article className="dashboard-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <h3>2) Storico scadenze</h3>
              <button
                type="button"
                className="primary-button compact-button"
                onClick={() => {
                  setShowOccurrenceForm((prev) => !prev);
                  setEditingOccurrenceId(null);
                  setOccurrenceForm(defaultOccurrenceForm);
                }}
              >
                Aggiungi scadenza
              </button>
            </div>

            {showOccurrenceForm && (
              <form className="form-grid" onSubmit={saveOccurrence}>
                <label>
                  Piano (opzionale)
                  <select
                    className="form-input"
                    value={occurrenceForm.planId}
                    onChange={(e) => setOccurrenceForm((p) => ({ ...p, planId: e.target.value ? Number(e.target.value) : '' }))}
                  >
                    <option value="">Nessun piano</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>{plan.title}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Tipo
                  <select className="form-input" value={occurrenceForm.type} onChange={(e) => setOccurrenceForm((p) => ({ ...p, type: e.target.value as DeadlineType }))}>
                    <option value="BOLLO">Bollo</option>
                    <option value="ASSICURAZIONE">Assicurazione</option>
                    <option value="REVISIONE">Revisione</option>
                    <option value="TAGLIANDO">Tagliando</option>
                    <option value="ALTRO">Altro</option>
                  </select>
                </label>
                <label>
                  Titolo
                  <input className="form-input" value={occurrenceForm.title} onChange={(e) => setOccurrenceForm((p) => ({ ...p, title: e.target.value }))} required />
                </label>
                <label>
                  Descrizione
                  <input className="form-input" value={occurrenceForm.description} onChange={(e) => setOccurrenceForm((p) => ({ ...p, description: e.target.value }))} />
                </label>
                <label>
                  Data scadenza
                  <input className="form-input" type="date" value={occurrenceForm.dueDate} onChange={(e) => setOccurrenceForm((p) => ({ ...p, dueDate: e.target.value }))} required />
                </label>
                <label>
                  Stato
                  <select className="form-input" value={occurrenceForm.status} onChange={(e) => setOccurrenceForm((p) => ({ ...p, status: e.target.value as DeadlineStatus }))}>
                    <option value="DA_ESEGUIRE">Da eseguire</option>
                    <option value="IN_SCADENZA">In scadenza</option>
                    <option value="SCADUTA">Scaduta</option>
                    <option value="PAGATA">Pagata</option>
                    <option value="ESEGUITA">Eseguita</option>
                    <option value="ANNULLATA">Annullata</option>
                  </select>
                </label>
                <label>
                  Costo
                  <input className="form-input" type="number" min={0} step="0.01" value={occurrenceForm.cost} onChange={(e) => setOccurrenceForm((p) => ({ ...p, cost: e.target.value }))} required />
                </label>
                <label>
                  Valuta
                  <input className="form-input" maxLength={3} value={occurrenceForm.currency} onChange={(e) => setOccurrenceForm((p) => ({ ...p, currency: e.target.value.toUpperCase() }))} required />
                </label>
                <label>
                  Data pagamento
                  <input className="form-input" type="date" value={occurrenceForm.paymentDate} onChange={(e) => setOccurrenceForm((p) => ({ ...p, paymentDate: e.target.value }))} />
                </label>
                <label>
                  Data esecuzione
                  <input className="form-input" type="date" value={occurrenceForm.executionDate} onChange={(e) => setOccurrenceForm((p) => ({ ...p, executionDate: e.target.value }))} />
                </label>
                <label>
                  Note
                  <input className="form-input" value={occurrenceForm.notes} onChange={(e) => setOccurrenceForm((p) => ({ ...p, notes: e.target.value }))} />
                </label>
                <button type="submit" className="primary-button compact-button">{editingOccurrenceId ? 'Aggiorna scadenza' : 'Crea scadenza'}</button>
              </form>
            )}

            <div style={{ overflowX: 'auto', marginTop: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Tipo</th>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Titolo</th>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Data</th>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Stato</th>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Costo</th>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {occurrences.map((item) => (
                    <tr key={item.id}>
                      {(() => {
                        const overdue = isOverdueStatus(item.status);
                        const dueSoon = !overdue && isDueSoonStatus(item.status, item.dueDate);
                        const highlightClass = overdue ? 'error-text' : dueSoon ? 'warning-text' : undefined;

                        return (
                          <>
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>{typeLabel(item.type)}</td>
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>{item.title}</td>
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>
                          <span className={highlightClass}>{item.dueDate}</span>
                        </td>
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>
                          <span className={highlightClass}>{statusLabel(item.status)}</span>
                        </td>
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>{item.cost} {item.currency}</td>
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button type="button" className="primary-button compact-button" onClick={() => {
                              setEditingOccurrenceId(item.id);
                              setShowOccurrenceForm(true);
                              setOccurrenceForm({
                                planId: item.planId ?? '',
                                type: item.type,
                                title: item.title,
                                description: item.description ?? '',
                                dueDate: item.dueDate,
                                status: item.status,
                                cost: String(item.cost),
                                currency: item.currency,
                                notes: item.notes ?? '',
                                paymentDate: item.paymentDate ?? '',
                                executionDate: item.executionDate ?? ''
                              });
                            }}>Modifica</button>
                            <button type="button" className="logout-button" onClick={() => quickOccurrenceAction(item.id, 'paid')}>Segna pagata</button>
                            <button type="button" className="logout-button" onClick={() => quickOccurrenceAction(item.id, 'completed')}>Segna eseguita</button>
                            <button type="button" className="logout-button" onClick={() => quickOccurrenceAction(item.id, 'cancel')}>Annulla</button>
                          </div>
                        </td>
                          </>
                        );
                      })()}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="dashboard-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <h3>3) Piani ricorrenti</h3>
              <button type="button" className="primary-button compact-button" onClick={() => {
                setShowPlanForm((prev) => !prev);
                setEditingPlanId(null);
                setPlanForm(defaultPlanForm);
              }}>Aggiungi piano ricorrente</button>
            </div>

            {showPlanForm && (
              <form className="form-grid" onSubmit={savePlan}>
                <label>
                  Tipo
                  <select className="form-input" value={planForm.type} onChange={(e) => setPlanForm((p) => ({ ...p, type: e.target.value as DeadlineType }))}>
                    <option value="BOLLO">Bollo</option>
                    <option value="ASSICURAZIONE">Assicurazione</option>
                    <option value="REVISIONE">Revisione</option>
                    <option value="TAGLIANDO">Tagliando</option>
                    <option value="ALTRO">Altro</option>
                  </select>
                </label>
                <label>
                  Titolo
                  <input className="form-input" value={planForm.title} onChange={(e) => setPlanForm((p) => ({ ...p, title: e.target.value }))} required />
                </label>
                <label>
                  Descrizione
                  <input className="form-input" value={planForm.description} onChange={(e) => setPlanForm((p) => ({ ...p, description: e.target.value }))} />
                </label>
                <label>
                  Ricorrenza (mesi)
                  <input className="form-input" type="number" min={1} max={60} value={planForm.recurrenceMonths} onChange={(e) => setPlanForm((p) => ({ ...p, recurrenceMonths: e.target.value }))} required />
                </label>
                <label>
                  Prossima scadenza
                  <input className="form-input" type="date" value={planForm.nextDueDate} onChange={(e) => setPlanForm((p) => ({ ...p, nextDueDate: e.target.value }))} required />
                </label>
                <label>
                  Costo standard
                  <input className="form-input" type="number" min={0} step="0.01" value={planForm.standardCost} onChange={(e) => setPlanForm((p) => ({ ...p, standardCost: e.target.value }))} required />
                </label>
                <label>
                  Valuta
                  <input className="form-input" maxLength={3} value={planForm.currency} onChange={(e) => setPlanForm((p) => ({ ...p, currency: e.target.value.toUpperCase() }))} required />
                </label>
                <label>
                  Note
                  <input className="form-input" value={planForm.notes} onChange={(e) => setPlanForm((p) => ({ ...p, notes: e.target.value }))} />
                </label>
                <button type="submit" className="primary-button compact-button">{editingPlanId ? 'Aggiorna piano' : 'Crea piano'}</button>
              </form>
            )}

            <div style={{ overflowX: 'auto', marginTop: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Tipo</th>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Titolo</th>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Ricorrenza</th>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Attivo</th>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Costo standard</th>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((item) => (
                    <tr key={item.id}>
                      <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>{typeLabel(item.type)}</td>
                      <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>{item.title}</td>
                      <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>{item.recurrenceMonths} mesi</td>
                      <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>{item.active ? 'Sì' : 'No'}</td>
                      <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>{item.standardCost} {item.currency}</td>
                      <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button type="button" className="primary-button compact-button" onClick={() => {
                            setEditingPlanId(item.id);
                            setShowPlanForm(true);
                            setPlanForm({
                              type: item.type,
                              title: item.title,
                              description: item.description ?? '',
                              recurrenceMonths: String(item.recurrenceMonths),
                              nextDueDate: item.nextDueDate,
                              standardCost: String(item.standardCost),
                              currency: item.currency,
                              notes: item.notes ?? ''
                            });
                          }}>Modifica</button>
                          <button
                            type="button"
                            className="logout-button"
                            onClick={() => togglePlan(item.id, item.active)}
                          >
                            {item.active ? 'Disattiva piano' : 'Riattiva piano'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="dashboard-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <h3>4) Manutenzioni e indisponibilità</h3>
              <button
                type="button"
                className="primary-button compact-button"
                onClick={() => {
                  setShowUnavailabilityForm((prev) => !prev);
                  setEditingUnavailabilityId(null);
                  setUnavailabilityForm(defaultUnavailabilityForm);
                }}
              >
                {showUnavailabilityForm ? 'Chiudi manutenzione' : 'Nuova manutenzione'}
              </button>
            </div>

            {showUnavailabilityForm && (
              <form className="form-grid" onSubmit={saveUnavailability}>
                <label>
                  Dal giorno
                  <input
                    className="form-input"
                    type="date"
                    value={unavailabilityForm.startDate}
                    onChange={(event) => setUnavailabilityForm((prev) => ({ ...prev, startDate: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  Al giorno
                  <input
                    className="form-input"
                    type="date"
                    value={unavailabilityForm.endDate}
                    onChange={(event) => setUnavailabilityForm((prev) => ({ ...prev, endDate: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  Motivo guasto/manutenzione
                  <input
                    className="form-input"
                    value={unavailabilityForm.reason}
                    onChange={(event) => setUnavailabilityForm((prev) => ({ ...prev, reason: event.target.value }))}
                    required
                  />
                </label>
                <button type="submit" className="primary-button compact-button">
                  {editingUnavailabilityId ? 'Aggiorna manutenzione' : 'Salva manutenzione'}
                </button>
              </form>
            )}

            <div style={{ overflowX: 'auto', marginTop: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Inizio</th>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Fine</th>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Motivo</th>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {unavailabilities.length === 0 ? (
                    <tr>
                      <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }} colSpan={4}>
                        Nessuna manutenzione registrata.
                      </td>
                    </tr>
                  ) : (
                    unavailabilities.map((item) => (
                      <tr key={item.id}>
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>{item.startDate}</td>
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>{item.endDate}</td>
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>{item.reason}</td>
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="primary-button compact-button"
                              onClick={() => {
                                setEditingUnavailabilityId(item.id);
                                setShowUnavailabilityForm(true);
                                setUnavailabilityForm({
                                  startDate: item.startDate,
                                  endDate: item.endDate,
                                  reason: item.reason
                                });
                              }}
                            >
                              Modifica
                            </button>
                            <button
                              type="button"
                              className="logout-button"
                              onClick={() => deleteUnavailability(item.id)}
                            >
                              Elimina
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </>
      )}

      {error && <article className="dashboard-card"><p className="error-text">{error}</p></article>}
      {success && <article className="dashboard-card"><p className="success-text">{success}</p></article>}
    </section>
  );
}
