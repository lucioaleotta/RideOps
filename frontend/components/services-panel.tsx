"use client";

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { formatCurrencyEUR } from '../lib/currency';

type ServiceType = 'TRANSFER' | 'TOUR';
type ServiceStatus = 'OPEN' | 'ASSIGNED' | 'CLOSED';

type ServiceItem = {
  id: number;
  startAt: string;
  pickupLocation: string;
  destination: string;
  type: ServiceType;
  durationHours: number | null;
  notes: string | null;
  price: number | null;
  status: ServiceStatus;
  assignedDriverId: number | null;
  assignedByUserId: number | null;
  assignedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type DriverItem = {
  id: number;
  userId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
  enabled: boolean;
  createdAt: string;
};

type ServiceFormState = {
  startAt: string;
  pickupLocation: string;
  destination: string;
  type: ServiceType;
  durationHours: string;
  notes: string;
  price: string;
  assignedDriverId: number | '';
};

type ServicesFilterState = {
  status: ServiceStatus | '';
  driverId: number | '';
  fromDate: string;
  toDate: string;
  onlyUnassigned: boolean;
};

const defaultForm: ServiceFormState = {
  startAt: '',
  pickupLocation: '',
  destination: '',
  type: 'TRANSFER',
  durationHours: '',
  notes: '',
  price: '',
  assignedDriverId: ''
};

const defaultFilters: ServicesFilterState = {
  status: '',
  driverId: '',
  fromDate: '',
  toDate: '',
  onlyUnassigned: false
};

export function ServicesPanel() {
    function driverLabel(driver: DriverItem) {
      const fullName = [driver.firstName, driver.lastName].filter(Boolean).join(' ').trim();
      if (fullName) {
        return `${fullName} (${driver.userId || driver.email})`;
      }
      return driver.userId || driver.email;
    }

  const PAGE_SIZE = 10;
  const searchParams = useSearchParams();
  const initializedFromQuery = useRef(false);

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [drivers, setDrivers] = useState<DriverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingInitialStatus, setEditingInitialStatus] = useState<Exclude<ServiceStatus, 'CLOSED'>>('OPEN');
  const [editingInitialAssignedDriverId, setEditingInitialAssignedDriverId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<ServicesFilterState>(defaultFilters);
  const [form, setForm] = useState<ServiceFormState>(defaultForm);

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

  function statusLabel(status: ServiceStatus) {
    if (status === 'OPEN') {
      return 'Aperto';
    }
    if (status === 'ASSIGNED') {
      return 'Assegnato';
    }
    return 'Chiuso';
  }

  function typeLabel(type: ServiceType) {
    if (type === 'TRANSFER') {
      return 'Transfer';
    }
    return 'Tour';
  }

  function toStartDateTime(dateValue: string) {
    return `${dateValue}T00:00:00`;
  }

  function toNextDayStartDateTime(dateValue: string) {
    const day = new Date(`${dateValue}T00:00:00`);
    day.setDate(day.getDate() + 1);
    const year = day.getFullYear();
    const month = String(day.getMonth() + 1).padStart(2, '0');
    const date = String(day.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}T00:00:00`;
  }

  async function loadDrivers() {
    const response = await fetch('/api/gestionale/drivers', { cache: 'no-store' });
    const payload = (await response.json().catch(() => [])) as DriverItem[] | { message?: string };

    if (!response.ok) {
      setError((payload as { message?: string }).message ?? 'Errore caricamento driver');
      return;
    }

    setDrivers(payload as DriverItem[]);
  }

  async function loadServices() {
    setLoading(true);
    setError(null);

    const effectiveStatus: ServiceStatus | '' = filters.onlyUnassigned ? 'OPEN' : filters.status;

    const query = new URLSearchParams();
    if (effectiveStatus) {
      query.set('status', effectiveStatus);
    }
    if (filters.driverId) {
      query.set('driverId', String(filters.driverId));
    }
    if (filters.fromDate) {
      query.set('from', toStartDateTime(filters.fromDate));
    }
    if (filters.toDate) {
      query.set('to', toNextDayStartDateTime(filters.toDate));
    }

    const targetUrl = query.size > 0 ? `/api/services?${query.toString()}` : '/api/services';

    const response = await fetch(targetUrl, { cache: 'no-store' });
    const payload = (await response.json().catch(() => [])) as ServiceItem[] | { message?: string };

    if (!response.ok) {
      setError((payload as { message?: string }).message ?? 'Errore caricamento servizi');
      setLoading(false);
      return;
    }

    const nextServices = payload as ServiceItem[];
    const filteredServices = filters.onlyUnassigned
      ? nextServices.filter((service) => !service.assignedDriverId)
      : nextServices;

    setServices(filteredServices);
    setLoading(false);
  }

  useEffect(() => {
    loadDrivers();
  }, []);

  useEffect(() => {
    if (initializedFromQuery.current) {
      return;
    }
    const active = searchParams.get('unassigned') === '1';
    setFilters((prev) => ({ ...prev, onlyUnassigned: active }));
    setCurrentPage(1);
    initializedFromQuery.current = true;
  }, [searchParams]);

  useEffect(() => {
    loadServices();
    setCurrentPage(1);
  }, [filters.status, filters.driverId, filters.fromDate, filters.toDate, filters.onlyUnassigned]);

  function resetForm() {
    setEditingId(null);
    setEditingInitialStatus('OPEN');
    setEditingInitialAssignedDriverId(null);
    setForm(defaultForm);
  }

  function openCreateForm() {
    resetForm();
    setIsFormOpen(true);
  }

  function closeForm() {
    resetForm();
    setIsFormOpen(false);
  }

  function toPayload(status: Exclude<ServiceStatus, 'CLOSED'>) {
    return {
      startAt: form.startAt,
      pickupLocation: form.pickupLocation,
      destination: form.destination,
      type: form.type,
      durationHours: form.type === 'TOUR' ? Number(form.durationHours) : null,
      notes: form.notes.trim() || null,
      price: form.price.trim() ? Number(form.price) : null,
      status
    };
  }

  function selectedDriverId(): number | null {
    return form.assignedDriverId ? Number(form.assignedDriverId) : null;
  }

  async function syncAssignment(serviceId: number, desiredDriverId: number | null) {
    const shouldSkip = editingId != null && editingInitialAssignedDriverId === desiredDriverId;
    if (shouldSkip) {
      return true;
    }

    if (desiredDriverId) {
      const response = await fetch(`/api/services/${serviceId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: desiredDriverId })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        setError(payload.message ?? 'Assegnazione fallita');
        return false;
      }

      return true;
    }

    if (editingId != null && editingInitialAssignedDriverId) {
      const response = await fetch(`/api/services/${serviceId}/unassign`, { method: 'PATCH' });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        setError(payload.message ?? 'Rimozione assegnazione fallita');
        return false;
      }
    }

    return true;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const targetUrl = editingId ? `/api/services/${editingId}` : '/api/services';
    const method = editingId ? 'PUT' : 'POST';

    const response = await fetch(targetUrl, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toPayload(editingId ? editingInitialStatus : 'OPEN'))
    });

    const payload = (await response.json().catch(() => ({}))) as Partial<ServiceItem> & { message?: string };

    if (!response.ok) {
      setSubmitting(false);
      setError(payload.message ?? 'Operazione fallita');
      return;
    }

    const serviceId = editingId ?? payload.id;
    if (!serviceId) {
      setSubmitting(false);
      setError('Impossibile identificare il servizio salvato');
      return;
    }

    const assignmentSynced = await syncAssignment(serviceId, selectedDriverId());
    setSubmitting(false);
    if (!assignmentSynced) {
      return;
    }

    setSuccess(editingId ? 'Servizio aggiornato' : 'Servizio creato');
    closeForm();
    await loadServices();
  }

  function onEdit(service: ServiceItem) {
    if (service.status === 'CLOSED') {
      setError('Un servizio chiuso non è modificabile');
      return;
    }

    setEditingId(service.id);
    setEditingInitialStatus(service.status);
    setEditingInitialAssignedDriverId(service.assignedDriverId);
    setIsFormOpen(true);
    setError(null);
    setSuccess(null);
    setForm({
      startAt: service.startAt.slice(0, 16),
      pickupLocation: service.pickupLocation,
      destination: service.destination,
      type: service.type,
      durationHours: service.durationHours ? String(service.durationHours) : '',
      notes: service.notes ?? '',
      price: service.price != null ? String(service.price) : '',
      assignedDriverId: service.assignedDriverId ?? ''
    });
  }

  async function onDelete(serviceId: number) {
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/services/${serviceId}`, { method: 'DELETE' });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      setError(payload.message ?? 'Eliminazione fallita');
      return;
    }

    if (editingId === serviceId) {
      resetForm();
    }
    setSuccess('Servizio eliminato');
    await loadServices();
  }

  async function onClose(serviceId: number) {
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/services/${serviceId}/close`, { method: 'PATCH' });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      setError(payload.message ?? 'Chiusura fallita');
      return;
    }

    setSuccess('Servizio chiuso');
    await loadServices();
  }

  const orderedServices = useMemo(
    () => [...services].sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()),
    [services]
  );

  const totalPages = Math.max(1, Math.ceil(orderedServices.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return orderedServices.slice(start, start + PAGE_SIZE);
  }, [orderedServices, currentPage]);

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <article className="dashboard-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <h3>Lista servizi</h3>
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
            {isFormOpen && !editingId ? 'Chiudi form' : 'Nuovo servizio'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginTop: 8 }}>
          <label>
            Stato
            <select
              className="form-input"
              value={filters.status}
              onChange={(event) => {
                const nextStatus = event.target.value as ServiceStatus | '';
                setFilters((prev) => ({
                  ...prev,
                  status: nextStatus,
                  onlyUnassigned: nextStatus === 'ASSIGNED' || nextStatus === 'CLOSED' ? false : prev.onlyUnassigned
                }));
              }}
            >
              <option value="">Tutti</option>
              <option value="OPEN">Aperti</option>
              <option value="ASSIGNED">Assegnati</option>
              <option value="CLOSED">Chiusi</option>
            </select>
          </label>

          <label>
            Driver
            <select
              className="form-input"
              value={filters.driverId}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  driverId: event.target.value ? Number(event.target.value) : ''
                }))
              }
            >
              <option value="">Tutti</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>{driverLabel(driver)}</option>
              ))}
            </select>
          </label>

          <label>
            Da data
            <input
              className="form-input"
              type="date"
              value={filters.fromDate}
              onChange={(event) => setFilters((prev) => ({ ...prev, fromDate: event.target.value }))}
            />
          </label>

          <label>
            A data
            <input
              className="form-input"
              type="date"
              value={filters.toDate}
              onChange={(event) => setFilters((prev) => ({ ...prev, toDate: event.target.value }))}
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'end', gap: 8, paddingBottom: 4 }}>
            <input
              type="checkbox"
              checked={filters.onlyUnassigned}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  onlyUnassigned: event.target.checked,
                  status: event.target.checked ? 'OPEN' : prev.status
                }))
              }
            />
            Solo non assegnati
          </label>

          <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="logout-button compact-button"
              onClick={() => setFilters(defaultFilters)}
            >
              Reset filtri
            </button>
          </div>
        </div>
        {filters.onlyUnassigned && (
          <div style={{ marginTop: 8, marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontWeight: 600 }}>Filtro attivo: Non assegnati</span>
            <button
              type="button"
              className="logout-button compact-button"
              onClick={() => setFilters((prev) => ({ ...prev, onlyUnassigned: false }))}
            >
              Rimuovi filtro
            </button>
          </div>
        )}
        {error && <p className="error-text">{error}</p>}
        {success && <p className="success-text">{success}</p>}
        {loading ? (
          <p>Caricamento servizi...</p>
        ) : (
          <>
            <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Inizio</th>
                  <th style={thStyle}>Pickup</th>
                  <th style={thStyle}>Destinazione</th>
                  <th style={thStyle}>Tipo</th>
                  <th style={thStyle}>Prezzo</th>
                  <th style={thStyle}>Driver</th>
                  <th style={thStyle}>Stato</th>
                  <th style={thStyle}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {paginatedServices.map((service) => (
                  <tr key={service.id}>
                    <td style={tdStyle}>{new Date(service.startAt).toLocaleString('it-IT')}</td>
                    <td style={{ ...tdStyle, minWidth: 220, lineHeight: 1.35 }}>{service.pickupLocation}</td>
                    <td style={{ ...tdStyle, minWidth: 220, lineHeight: 1.35 }}>{service.destination}</td>
                    <td style={tdStyle}>{typeLabel(service.type)}</td>
                    <td style={tdStyle}>{formatCurrencyEUR(service.price)}</td>
                    <td style={{ ...tdStyle, minWidth: 200 }}>
                      {service.assignedDriverId
                        ? driverLabel(drivers.find((driver) => driver.id === service.assignedDriverId) ?? {
                          id: service.assignedDriverId,
                          userId: '',
                          email: `#${service.assignedDriverId}`,
                          role: 'DRIVER',
                          enabled: true,
                          createdAt: ''
                        })
                        : '—'}
                    </td>
                    <td style={tdStyle}>{statusLabel(service.status)}</td>
                    <td style={{ ...tdStyle, minWidth: 320 }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', alignItems: 'center' }}>
                      <button type="button" className="logout-button" onClick={() => onEdit(service)}>
                        Modifica
                      </button>
                      <button type="button" className="logout-button" onClick={() => onDelete(service.id)}>
                        Elimina
                      </button>
                      {service.status === 'ASSIGNED' && (
                        <button type="button" className="logout-button" onClick={() => onClose(service.id)}>
                          Chiudi
                        </button>
                      )}
                      <Link
                        className="logout-button"
                        href={`/services/${service.id}/print`}
                        target="_blank"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        Stampa
                      </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <span>
                Pagina {currentPage} di {totalPages}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="logout-button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  aria-label="Pagina precedente"
                  title="Pagina precedente"
                >
                  ←
                </button>
                <button
                  type="button"
                  className="logout-button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="Pagina successiva"
                  title="Pagina successiva"
                >
                  →
                </button>
              </div>
            </div>
          </>
        )}
      </article>

      {isFormOpen && (
        <article className="dashboard-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <h3>{editingId ? `Modifica servizio #${editingId}` : 'Nuovo servizio'}</h3>
            <button type="button" className="logout-button" onClick={closeForm}>
              Chiudi
            </button>
          </div>
          <form className="form-grid" onSubmit={onSubmit}>
            <label>
              Data/ora inizio
              <input
                className="form-input"
                type="datetime-local"
                value={form.startAt}
                onChange={(event) => setForm((prev) => ({ ...prev, startAt: event.target.value }))}
                required
              />
            </label>

            <label>
              Pickup
              <input
                className="form-input"
                value={form.pickupLocation}
                onChange={(event) => setForm((prev) => ({ ...prev, pickupLocation: event.target.value }))}
                required
              />
            </label>

            <label>
              Destinazione
              <input
                className="form-input"
                value={form.destination}
                onChange={(event) => setForm((prev) => ({ ...prev, destination: event.target.value }))}
                required
              />
            </label>

            <label>
              Tipologia
              <select
                className="form-input"
                value={form.type}
                onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as ServiceType }))}
              >
                <option value="TRANSFER">TRANSFER</option>
                <option value="TOUR">TOUR</option>
              </select>
            </label>

            {form.type === 'TOUR' && (
              <label>
                Durata ore
                <input
                  className="form-input"
                  type="number"
                  min={1}
                  value={form.durationHours}
                  onChange={(event) => setForm((prev) => ({ ...prev, durationHours: event.target.value }))}
                  required
                />
              </label>
            )}

            <label>
              Prezzo (opzionale)
              <input
                className="form-input"
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
              />
              <small style={{ color: 'var(--muted)' }}>
                {form.price.trim() ? `Anteprima: ${formatCurrencyEUR(Number(form.price))}` : 'Anteprima: -'}
              </small>
            </label>

            <label>
              Driver (opzionale)
              <select
                className="form-input"
                value={form.assignedDriverId}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    assignedDriverId: event.target.value ? Number(event.target.value) : ''
                  }))
                }
              >
                <option value="">Non assegnato</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>{driver.email}</option>
                ))}
              </select>
            </label>

            <label>
              Note
              <textarea
                className="form-input"
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                rows={4}
              />
            </label>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="primary-button compact-button" disabled={submitting}>
                {submitting ? 'Salvataggio...' : editingId ? 'Aggiorna servizio' : 'Crea servizio'}
              </button>
              {editingId && (
                <button type="button" className="logout-button" onClick={openCreateForm}>
                  Nuovo servizio
                </button>
              )}
            </div>
          </form>
        </article>
      )}
    </section>
  );
}