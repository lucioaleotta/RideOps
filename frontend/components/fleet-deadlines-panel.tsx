"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';

type DeadlineType = 'BOLLO' | 'ASSICURAZIONE' | 'REVISIONE' | 'TAGLIANDO' | 'ALTRO';
type DeadlineStatus = 'DA_ESEGUIRE' | 'IN_SCADENZA' | 'SCADUTA' | 'PAGATA' | 'ESEGUITA' | 'ANNULLATA';

type VehicleItem = {
  id: number;
  plate: string;
  type: 'SEDAN' | 'VAN' | 'MINIBUS' | 'SUV' | 'OTHER';
};

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

type DeadlineFormState = {
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

const defaultForm: DeadlineFormState = {
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

type ViewMode = 'vehicle' | 'upcoming' | 'overdue';

function typeLabel(type: DeadlineType) {
  if (type === 'BOLLO') return 'Bollo';
  if (type === 'ASSICURAZIONE') return 'Assicurazione';
  if (type === 'REVISIONE') return 'Revisione';
  if (type === 'TAGLIANDO') return 'Tagliando';
  return 'Altro';
}

export function FleetDeadlinesPanel() {
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | ''>('');
  const [viewMode, setViewMode] = useState<ViewMode>('vehicle');
  const [withinDays, setWithinDays] = useState(30);

  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<DeadlineFormState>(defaultForm);

  useEffect(() => {
    async function loadVehicles() {
      const response = await fetch('/api/fleet/vehicles', { cache: 'no-store' });
      const payload = (await response.json().catch(() => [])) as VehicleItem[];
      if (!response.ok || !Array.isArray(payload)) {
        return;
      }
      setVehicles(payload);
      if (payload.length > 0) {
        setSelectedVehicleId(payload[0].id);
      }
    }

    loadVehicles();
  }, []);

  async function loadDeadlines() {
    setLoading(true);
    setError(null);

    let url = '';
    if (viewMode === 'overdue') {
      url = '/api/fleet/deadlines/overdue';
    } else if (viewMode === 'upcoming') {
      url = `/api/fleet/deadlines/upcoming?withinDays=${withinDays}`;
    } else if (selectedVehicleId) {
      url = `/api/fleet/vehicles/${selectedVehicleId}/deadlines`;
    }

    if (!url) {
      setDeadlines([]);
      setLoading(false);
      return;
    }

    const response = await fetch(url, { cache: 'no-store' });
    const payload = (await response.json().catch(() => [])) as DeadlineItem[] | { message?: string };

    if (!response.ok) {
      setError((payload as { message?: string }).message ?? 'Errore caricamento scadenze');
      setDeadlines([]);
      setLoading(false);
      return;
    }

    setDeadlines(payload as DeadlineItem[]);
    setLoading(false);
  }

  useEffect(() => {
    loadDeadlines();
  }, [viewMode, selectedVehicleId, withinDays]);

  function resetForm() {
    setEditingId(null);
    setForm(defaultForm);
  }

  function closeForm() {
    resetForm();
    setIsFormOpen(false);
  }

  function openCreateForm() {
    resetForm();
    setIsFormOpen(true);
  }

  function onEdit(item: DeadlineItem) {
    setEditingId(item.id);
    setIsFormOpen(true);
    setError(null);
    setSuccess(null);
    setForm({
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
    setSelectedVehicleId(item.vehicleId);
  }

  async function onDelete(deadlineId: number) {
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/fleet/deadlines/${deadlineId}`, { method: 'DELETE' });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      setError(payload.message ?? 'Eliminazione scadenza fallita');
      return;
    }

    if (editingId === deadlineId) {
      closeForm();
    }

    setSuccess('Scadenza eliminata');
    await loadDeadlines();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedVehicleId && !editingId) {
      setError('Seleziona un veicolo');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const payload = {
      type: form.type,
      title: form.title,
      description: form.description.trim() || null,
      dueDate: form.dueDate,
      status: form.status,
      cost: Number(form.cost),
      currency: form.currency.trim().toUpperCase(),
      notes: form.notes.trim() || null,
      paymentDate: form.paymentDate || null,
      executionDate: form.executionDate || null
    };

    const targetUrl = editingId
      ? `/api/fleet/deadlines/${editingId}`
      : `/api/fleet/vehicles/${selectedVehicleId}/deadlines`;
    const method = editingId ? 'PUT' : 'POST';

    const response = await fetch(targetUrl, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const body = (await response.json().catch(() => ({}))) as { message?: string };

    setSubmitting(false);

    if (!response.ok) {
      setError(body.message ?? 'Salvataggio scadenza fallito');
      return;
    }

    setSuccess(editingId ? 'Scadenza aggiornata' : 'Scadenza creata');
    if (editingId) {
      closeForm();
    } else {
      resetForm();
      setIsFormOpen(true);
    }
    await loadDeadlines();
  }

  const vehicleMap = useMemo(() => {
    return vehicles.reduce<Record<number, VehicleItem>>((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  }, [vehicles]);

  return (
    <section className="responsive-panel fleet-deadlines-panel" style={{ display: 'grid', gap: 16 }}>
      <article className="dashboard-card">
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <h3>Scadenze e interventi</h3>
          <button
            type="button"
            className="primary-button compact-button"
            onClick={() => {
              if (isFormOpen && !editingId) {
                closeForm();
              } else {
                openCreateForm();
              }
            }}
          >
            {isFormOpen && !editingId ? 'Chiudi form' : 'Nuova voce'}
          </button>
        </div>

        <div className="responsive-filters-grid" style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginTop: 8 }}>
          <label>
            Vista
            <select className="form-input" value={viewMode} onChange={(event) => setViewMode(event.target.value as ViewMode)}>
              <option value="vehicle">Storico veicolo</option>
              <option value="upcoming">In scadenza</option>
              <option value="overdue">Scadute</option>
            </select>
          </label>

          <label>
            Veicolo
            <select
              className="form-input"
              value={selectedVehicleId}
              onChange={(event) => setSelectedVehicleId(event.target.value ? Number(event.target.value) : '')}
            >
              <option value="">Seleziona...</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>{vehicle.plate}</option>
              ))}
            </select>
          </label>

          {viewMode === 'upcoming' && (
            <label>
              Entro giorni
              <input
                className="form-input"
                type="number"
                min={1}
                max={365}
                value={withinDays}
                onChange={(event) => setWithinDays(Number(event.target.value || 30))}
              />
            </label>
          )}
        </div>

        {isFormOpen && (
          <form className="form-grid" onSubmit={onSubmit} style={{ marginTop: 10 }}>
            <label>
              Tipo
              <select className="form-input" value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as DeadlineType }))}>
                <option value="BOLLO">Bollo</option>
                <option value="ASSICURAZIONE">Assicurazione</option>
                <option value="REVISIONE">Revisione</option>
                <option value="TAGLIANDO">Tagliando</option>
                <option value="ALTRO">Altro</option>
              </select>
            </label>

            <label>
              Titolo
              <input className="form-input" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} required />
            </label>

            <label>
              Descrizione
              <input className="form-input" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
            </label>

            <label>
              Data scadenza
              <input className="form-input" type="date" value={form.dueDate} onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))} required />
            </label>

            <label>
              Stato
              <select className="form-input" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as DeadlineStatus }))}>
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
              <input className="form-input" type="number" min={0} step="0.01" value={form.cost} onChange={(event) => setForm((prev) => ({ ...prev, cost: event.target.value }))} required />
            </label>

            <label>
              Valuta
              <input className="form-input" maxLength={3} value={form.currency} onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))} required />
            </label>

            <label>
              Data pagamento
              <input className="form-input" type="date" value={form.paymentDate} onChange={(event) => setForm((prev) => ({ ...prev, paymentDate: event.target.value }))} />
            </label>

            <label>
              Data esecuzione
              <input className="form-input" type="date" value={form.executionDate} onChange={(event) => setForm((prev) => ({ ...prev, executionDate: event.target.value }))} />
            </label>

            <label>
              Note
              <input className="form-input" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
            </label>

            <div className="form-actions" style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="primary-button compact-button" disabled={submitting}>
                {submitting ? 'Salvataggio...' : editingId ? 'Aggiorna voce' : 'Crea voce'}
              </button>
              <button type="button" className="logout-button" onClick={closeForm}>Annulla</button>
            </div>
          </form>
        )}

        {error && <p className="error-text" style={{ marginTop: 8 }}>{error}</p>}
        {success && <p className="success-text" style={{ marginTop: 8 }}>{success}</p>}
      </article>

      <article className="dashboard-card">
        <h3>Lista voci</h3>
        {loading ? (
          <p>Caricamento voci...</p>
        ) : deadlines.length === 0 ? (
          <p>Nessuna voce disponibile.</p>
        ) : (
          <div className="table-scroll" style={{ overflowX: 'auto' }}>
            <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Veicolo</th>
                  <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Tipo</th>
                  <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Titolo</th>
                  <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Scadenza</th>
                  <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Stato</th>
                  <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Costo</th>
                  <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {deadlines.map((item) => (
                  <tr key={item.id}>
                    <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>
                      {vehicleMap[item.vehicleId]?.plate ?? `#${item.vehicleId}`}
                    </td>
                    <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>{typeLabel(item.type)}</td>
                    <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>{item.title}</td>
                    <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>{item.dueDate}</td>
                    <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>{item.status}</td>
                    <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>{item.cost} {item.currency}</td>
                    <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>
                      <div className="table-actions" style={{ display: 'flex', gap: 8 }}>
                        <button type="button" className="primary-button compact-button" onClick={() => onEdit(item)}>Modifica</button>
                        <button type="button" className="logout-button" onClick={() => onDelete(item.id)}>Elimina</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}
