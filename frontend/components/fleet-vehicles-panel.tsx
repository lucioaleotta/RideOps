"use client";

import { FormEvent, useEffect, useState } from 'react';

type VehicleType = 'SEDAN' | 'VAN' | 'MINIBUS' | 'SUV' | 'OTHER';
type DeadlineType = 'BOLLO' | 'ASSICURAZIONE' | 'REVISIONE' | 'TAGLIANDO' | 'ALTRO';

type VehicleItem = {
  id: number;
  plate: string;
  seats: number;
  type: VehicleType;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type VehicleFormState = {
  plate: string;
  seats: string;
  type: VehicleType;
  notes: string;
};

type InitialDeadlineState = {
  type: DeadlineType;
  title: string;
  description: string;
  dueDate: string;
  cost: string;
  currency: string;
  notes: string;
};

const defaultForm: VehicleFormState = {
  plate: '',
  seats: '',
  type: 'SEDAN',
  notes: ''
};

const defaultDeadline: InitialDeadlineState = {
  type: 'ASSICURAZIONE',
  title: '',
  description: '',
  dueDate: '',
  cost: '0',
  currency: 'EUR',
  notes: ''
};

export function FleetVehiclesPanel() {
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<VehicleFormState>(defaultForm);
  const [initialDeadlines, setInitialDeadlines] = useState<InitialDeadlineState[]>([defaultDeadline]);

  const thStyle = {
    textAlign: 'left' as const,
    padding: '0 12px 10px 0',
    whiteSpace: 'nowrap' as const,
    borderBottom: '1px solid #dce8f5'
  };

  const tdStyle = {
    padding: '10px 12px 10px 0',
    verticalAlign: 'top' as const,
    borderBottom: '1px solid #eaf1f9'
  };

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

  function deadlineTypeLabel(type: DeadlineType) {
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

  async function loadVehicles() {
    setLoading(true);
    setError(null);

    const response = await fetch('/api/fleet/vehicles', { cache: 'no-store' });
    const payload = (await response.json().catch(() => [])) as VehicleItem[] | { message?: string };

    if (!response.ok) {
      setError((payload as { message?: string }).message ?? 'Errore caricamento veicoli');
      setLoading(false);
      return;
    }

    setVehicles(payload as VehicleItem[]);
    setLoading(false);
  }

  useEffect(() => {
    loadVehicles();
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm(defaultForm);
    setInitialDeadlines([defaultDeadline]);
  }

  function closeForm() {
    resetForm();
    setIsFormOpen(false);
  }

  function openCreateForm() {
    resetForm();
    setIsFormOpen(true);
  }

  function onEdit(vehicle: VehicleItem) {
    setEditingId(vehicle.id);
    setIsFormOpen(true);
    setError(null);
    setSuccess(null);
    setForm({
      plate: vehicle.plate,
      seats: String(vehicle.seats),
      type: vehicle.type,
      notes: vehicle.notes ?? ''
    });
  }

  async function onDelete(vehicleId: number) {
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/fleet/vehicles/${vehicleId}`, { method: 'DELETE' });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      setError(payload.message ?? 'Eliminazione veicolo fallita');
      return;
    }

    if (editingId === vehicleId) {
      closeForm();
    }

    setSuccess('Veicolo eliminato');
    await loadVehicles();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const targetUrl = editingId ? `/api/fleet/vehicles/${editingId}` : '/api/fleet/vehicles';
    const method = editingId ? 'PUT' : 'POST';

    const response = await fetch(targetUrl, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plate: form.plate,
        seats: Number(form.seats),
        type: form.type,
        notes: form.notes.trim() || null
      })
    });

    const payload = (await response.json().catch(() => ({}))) as { id?: number; message?: string };

    setSubmitting(false);

    if (!response.ok) {
      setError(payload.message ?? 'Salvataggio veicolo fallito');
      return;
    }

    if (!editingId && payload.id) {
      const deadlinesToCreate = initialDeadlines.filter((item) => item.dueDate.trim());
      for (const deadline of deadlinesToCreate) {
        const deadlineResponse = await fetch(`/api/fleet/vehicles/${payload.id}/deadlines`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: deadline.type,
            title: deadline.title.trim() || deadlineTypeLabel(deadline.type),
            description: deadline.description.trim() || null,
            dueDate: deadline.dueDate,
            status: 'DA_ESEGUIRE',
            cost: Number(deadline.cost),
            currency: (deadline.currency.trim() || 'EUR').toUpperCase(),
            notes: deadline.notes.trim() || null
          })
        });

        if (!deadlineResponse.ok) {
          const deadlinePayload = (await deadlineResponse.json().catch(() => ({}))) as { message?: string };
          setError(deadlinePayload.message ?? 'Veicolo creato, ma errore salvataggio scadenze iniziali');
          setSubmitting(false);
          await loadVehicles();
          return;
        }
      }
    }

    if (editingId) {
      setSuccess('Veicolo aggiornato');
      closeForm();
    } else {
      setSuccess('Veicolo creato');
      resetForm();
      setIsFormOpen(true);
    }
    await loadVehicles();
  }

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <article className="dashboard-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <h3>Parco veicoli</h3>
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
            {isFormOpen && !editingId ? 'Chiudi form' : 'Nuovo veicolo'}
          </button>
        </div>

        {isFormOpen && (
          <form className="form-grid" onSubmit={onSubmit} style={{ marginTop: 10 }}>
            <label>
              Targa
              <input
                className="form-input"
                value={form.plate}
                onChange={(event) => setForm((prev) => ({ ...prev, plate: event.target.value }))}
                required
              />
            </label>

            <label>
              Posti
              <input
                className="form-input"
                type="number"
                min={1}
                value={form.seats}
                onChange={(event) => setForm((prev) => ({ ...prev, seats: event.target.value }))}
                required
              />
            </label>

            <label>
              Tipo
              <select
                className="form-input"
                value={form.type}
                onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as VehicleType }))}
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
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </label>

            {!editingId && (
              <div className="dashboard-card" style={{ marginTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <strong>Scadenze iniziali</strong>
                  <button
                    type="button"
                    className="primary-button compact-button"
                    onClick={() => setInitialDeadlines((prev) => [...prev, { ...defaultDeadline }])}
                  >
                    Aggiungi scadenza
                  </button>
                </div>

                <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                  {initialDeadlines.map((deadline, index) => (
                    <div key={`deadline-${index}`} style={{ border: '1px solid #dce8f5', borderRadius: 10, padding: 10 }}>
                      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                        <label>
                          Tipo
                          <select
                            className="form-input"
                            value={deadline.type}
                            onChange={(event) => {
                              const nextType = event.target.value as DeadlineType;
                              setInitialDeadlines((prev) => prev.map((item, itemIndex) => (
                                itemIndex === index ? { ...item, type: nextType } : item
                              )));
                            }}
                          >
                            <option value="BOLLO">{deadlineTypeLabel('BOLLO')}</option>
                            <option value="ASSICURAZIONE">{deadlineTypeLabel('ASSICURAZIONE')}</option>
                            <option value="REVISIONE">{deadlineTypeLabel('REVISIONE')}</option>
                            <option value="TAGLIANDO">{deadlineTypeLabel('TAGLIANDO')}</option>
                            <option value="ALTRO">{deadlineTypeLabel('ALTRO')}</option>
                          </select>
                        </label>

                        <label>
                          Titolo
                          <input
                            className="form-input"
                            value={deadline.title}
                            onChange={(event) => {
                              const nextTitle = event.target.value;
                              setInitialDeadlines((prev) => prev.map((item, itemIndex) => (
                                itemIndex === index ? { ...item, title: nextTitle } : item
                              )));
                            }}
                          />
                        </label>

                        <label>
                          Descrizione
                          <input
                            className="form-input"
                            value={deadline.description}
                            onChange={(event) => {
                              const nextDescription = event.target.value;
                              setInitialDeadlines((prev) => prev.map((item, itemIndex) => (
                                itemIndex === index ? { ...item, description: nextDescription } : item
                              )));
                            }}
                          />
                        </label>

                        <label>
                          Data scadenza
                          <input
                            className="form-input"
                            type="date"
                            value={deadline.dueDate}
                            onChange={(event) => {
                              const nextDate = event.target.value;
                              setInitialDeadlines((prev) => prev.map((item, itemIndex) => (
                                itemIndex === index ? { ...item, dueDate: nextDate } : item
                              )));
                            }}
                          />
                        </label>

                        <label>
                          Costo
                          <input
                            className="form-input"
                            type="number"
                            min={0}
                            step="0.01"
                            value={deadline.cost}
                            onChange={(event) => {
                              const nextCost = event.target.value;
                              setInitialDeadlines((prev) => prev.map((item, itemIndex) => (
                                itemIndex === index ? { ...item, cost: nextCost } : item
                              )));
                            }}
                          />
                        </label>

                        <label>
                          Valuta
                          <input
                            className="form-input"
                            value={deadline.currency}
                            maxLength={3}
                            onChange={(event) => {
                              const nextCurrency = event.target.value.toUpperCase();
                              setInitialDeadlines((prev) => prev.map((item, itemIndex) => (
                                itemIndex === index ? { ...item, currency: nextCurrency } : item
                              )));
                            }}
                          />
                        </label>

                        <label>
                          Note
                          <input
                            className="form-input"
                            value={deadline.notes}
                            onChange={(event) => {
                              const nextNotes = event.target.value;
                              setInitialDeadlines((prev) => prev.map((item, itemIndex) => (
                                itemIndex === index ? { ...item, notes: nextNotes } : item
                              )));
                            }}
                          />
                        </label>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                        <button
                          type="button"
                          className="logout-button"
                          onClick={() => {
                            setInitialDeadlines((prev) => {
                              if (prev.length <= 1) {
                                return [defaultDeadline];
                              }
                              return prev.filter((_, itemIndex) => itemIndex !== index);
                            });
                          }}
                        >
                          Rimuovi
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="primary-button compact-button" disabled={submitting}>
                {submitting ? 'Salvataggio...' : editingId ? 'Aggiorna veicolo' : 'Crea veicolo'}
              </button>
              <button type="button" className="logout-button" onClick={closeForm}>
                Annulla
              </button>
            </div>
          </form>
        )}

        {error && <p className="error-text" style={{ marginTop: 8 }}>{error}</p>}
        {success && <p className="success-text" style={{ marginTop: 8 }}>{success}</p>}
      </article>

      <article className="dashboard-card">
        <h3>Lista veicoli</h3>
        {loading ? (
          <p>Caricamento veicoli...</p>
        ) : vehicles.length === 0 ? (
          <p>Nessun veicolo presente.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Targa</th>
                  <th style={thStyle}>Posti</th>
                  <th style={thStyle}>Tipo</th>
                  <th style={thStyle}>Note</th>
                  <th style={thStyle}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((vehicle) => (
                  <tr key={vehicle.id}>
                    <td style={tdStyle}>{vehicle.plate}</td>
                    <td style={tdStyle}>{vehicle.seats}</td>
                    <td style={tdStyle}>{vehicleTypeLabel(vehicle.type)}</td>
                    <td style={tdStyle}>{vehicle.notes ?? '-'}</td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button
                          type="button"
                          className="primary-button compact-button"
                          onClick={() => onEdit(vehicle)}
                        >
                          Modifica
                        </button>
                        <button
                          type="button"
                          className="logout-button"
                          onClick={() => onDelete(vehicle.id)}
                        >
                          Elimina
                        </button>
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
