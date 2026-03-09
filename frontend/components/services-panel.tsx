"use client";

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
  assignedVehicleId: number | null;
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
  assignedVehicleId: number | '';
};

type VehicleItem = {
  id: number;
  plate: string;
  seats: number;
  type: string;
  notes: string | null;
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
  assignedDriverId: '',
  assignedVehicleId: ''
};

const vehicleDayConflictMessage = 'Il veicolo risulta già assegnato ad un altro servizio nella stessa giornata';
const vehicleMaintenanceConflictMessage = 'Il veicolo risulta in manutenzione nella giornata del servizio';

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
      return fullName;
    }
    return driver.email;
  }

  const PAGE_SIZE = 10;
  const searchParams = useSearchParams();
  const initializedFromQuery = useRef(false);

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [drivers, setDrivers] = useState<DriverItem[]>([]);
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingInitialStatus, setEditingInitialStatus] = useState<Exclude<ServiceStatus, 'CLOSED'>>('OPEN');
  const [editingInitialAssignedDriverId, setEditingInitialAssignedDriverId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [selectedForPrintIds, setSelectedForPrintIds] = useState<number[]>([]);
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

  async function loadVehicles() {
    const response = await fetch('/api/fleet/vehicles', { cache: 'no-store' });
    const payload = (await response.json().catch(() => [])) as VehicleItem[] | { message?: string };

    if (!response.ok) {
      setError((payload as { message?: string }).message ?? 'Errore caricamento veicoli');
      return;
    }

    setVehicles(payload as VehicleItem[]);
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
    loadVehicles();
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
      status,
      assignedVehicleId: form.assignedVehicleId ? Number(form.assignedVehicleId) : null
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

    let overrideVehicleDayConflict = false;
    let overrideVehicleMaintenanceConflict = false;
    let payload: (Partial<ServiceItem> & { message?: string }) = {};
    let responseOk = false;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(targetUrl, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...toPayload(editingId ? editingInitialStatus : 'OPEN'),
          overrideVehicleDayConflict,
          overrideVehicleMaintenanceConflict
        })
      });

      payload = (await response.json().catch(() => ({}))) as Partial<ServiceItem> & { message?: string };

      if (response.ok) {
        responseOk = true;
        break;
      }

      const backendMessage = payload.message ?? 'Operazione fallita';

      if (!overrideVehicleDayConflict && backendMessage.includes(vehicleDayConflictMessage)) {
        const confirmed = window.confirm(
          `${vehicleDayConflictMessage}. Vuoi continuare comunque con l'assegnazione?`
        );
        if (confirmed) {
          overrideVehicleDayConflict = true;
          continue;
        }
      }

      if (!overrideVehicleMaintenanceConflict && backendMessage.includes(vehicleMaintenanceConflictMessage)) {
        const confirmed = window.confirm(
          `${vehicleMaintenanceConflictMessage}. Vuoi continuare comunque con l'assegnazione?`
        );
        if (confirmed) {
          overrideVehicleMaintenanceConflict = true;
          continue;
        }
      }

      setSubmitting(false);
      setError(backendMessage);
      return;
    }

    if (!responseOk) {
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
      assignedDriverId: service.assignedDriverId ?? '',
      assignedVehicleId: service.assignedVehicleId ?? ''
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

  function openPrint(serviceId: number) {
    if (typeof window === 'undefined') {
      return;
    }
    window.open(`/services/${serviceId}/print`, '_blank', 'noopener,noreferrer');
  }

  function togglePrintSelection(serviceId: number) {
    setSelectedForPrintIds((prev) => (
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    ));
  }

  function toggleSelectAllOnPage(checked: boolean) {
    const pageIds = paginatedServices.map((item) => item.id);
    if (!checked) {
      setSelectedForPrintIds((prev) => prev.filter((id) => !pageIds.includes(id)));
      return;
    }

    setSelectedForPrintIds((prev) => {
      const next = new Set(prev);
      pageIds.forEach((id) => next.add(id));
      return Array.from(next);
    });
  }

  function printSelectedServices() {
    if (selectedForPrintIds.length === 0) {
      setError('Seleziona almeno un servizio da stampare');
      return;
    }

    setError(null);
    setSuccess(`Apro ${selectedForPrintIds.length} servizi in stampa`);
    const idsParam = selectedForPrintIds.join(',');
    window.open(`/services/print?ids=${encodeURIComponent(idsParam)}`, '_blank', 'noopener,noreferrer');
  }

  function assignedDriverLabel(service: ServiceItem) {
    if (!service.assignedDriverId) {
      return 'Non assegnato';
    }

    const found = drivers.find((driver) => driver.id === service.assignedDriverId);
    if (!found) {
      return `#${service.assignedDriverId}`;
    }

    return driverLabel(found);
  }

  function assignedVehicleLabel(service: ServiceItem) {
    if (!service.assignedVehicleId) {
      return 'Non assegnato';
    }
    const found = vehicles.find((vehicle) => vehicle.id === service.assignedVehicleId);
    if (!found) {
      return `#${service.assignedVehicleId}`;
    }
    return found.plate;
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

  const selectedService = useMemo(
    () => orderedServices.find((item) => item.id === selectedServiceId) ?? null,
    [orderedServices, selectedServiceId]
  );

  useEffect(() => {
    if (!selectedServiceId) {
      return;
    }
    if (!orderedServices.some((item) => item.id === selectedServiceId)) {
      setSelectedServiceId(null);
    }
  }, [orderedServices, selectedServiceId]);

  useEffect(() => {
    const validIds = new Set(orderedServices.map((item) => item.id));
    setSelectedForPrintIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [orderedServices]);

  const allCurrentPageSelected = paginatedServices.length > 0
    && paginatedServices.every((service) => selectedForPrintIds.includes(service.id));

  return (
    <section style={{ display: 'grid', gap: 16, maxWidth: '100%' }}>
      <article className="dashboard-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
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
          <div style={{ marginTop: 8, marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
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
            {selectedService && (
              <div className="dashboard-card" style={{ marginTop: 10, background: '#eef6ff' }}>
                <strong>Servizio selezionato #{selectedService.id}</strong>
                <p style={{ margin: '6px 0 0' }}>
                  {new Date(selectedService.startAt).toLocaleString('it-IT')} - {typeLabel(selectedService.type)} - {statusLabel(selectedService.status)}
                </p>
                <p style={{ margin: '6px 0 0' }}>
                  {selectedService.pickupLocation} {'->'} {selectedService.destination}
                </p>
                <p style={{ margin: '6px 0 0' }}>
                  <strong>Driver:</strong> {assignedDriverLabel(selectedService)}
                </p>
                <p style={{ margin: '6px 0 0' }}>
                  <strong>Veicolo:</strong> {assignedVehicleLabel(selectedService)}
                </p>
                <p style={{ margin: '6px 0 0' }}>
                  <strong>Prezzo:</strong> {formatCurrencyEUR(selectedService.price)}
                </p>
                {selectedService.notes && (
                  <p style={{ margin: '6px 0 0' }}>
                    <strong>Note:</strong> {selectedService.notes}
                  </p>
                )}
                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" className="primary-button compact-button" onClick={() => onEdit(selectedService)}>
                    Modifica
                  </button>
                  <button
                    type="button"
                    className="primary-button compact-button"
                    style={{ background: '#d32f2f' }}
                    onClick={() => onDelete(selectedService.id)}
                  >
                    Elimina
                  </button>
                  {selectedService.status === 'ASSIGNED' && (
                    <button
                      type="button"
                      className="primary-button compact-button"
                      style={{ background: '#ef6c00' }}
                      onClick={() => onClose(selectedService.id)}
                    >
                      Chiudi
                    </button>
                  )}
                  <button type="button" className="primary-button compact-button" onClick={() => openPrint(selectedService.id)}>
                    Stampa
                  </button>
                  <button
                    type="button"
                    className="logout-button compact-button"
                    onClick={() => setSelectedServiceId(null)}
                  >
                    Deseleziona
                  </button>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
              <small style={{ color: 'var(--muted)' }}>
                Selezionati per stampa: {selectedForPrintIds.length}
              </small>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="primary-button compact-button"
                  onClick={printSelectedServices}
                >
                  Stampa selezionati
                </button>
                <button
                  type="button"
                  className="logout-button compact-button"
                  onClick={() => setSelectedForPrintIds([])}
                  disabled={selectedForPrintIds.length === 0}
                >
                  Pulisci selezione
                </button>
              </div>
            </div>
            <div style={{ overflowX: 'auto', marginTop: 8, maxWidth: '100%' }}>
            <table style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>
                    <input
                      type="checkbox"
                      checked={allCurrentPageSelected}
                      onChange={(event) => toggleSelectAllOnPage(event.target.checked)}
                      aria-label="Seleziona tutti i servizi in pagina per la stampa"
                    />
                  </th>
                  <th style={thStyle}>Inizio</th>
                  <th style={thStyle}>Pickup</th>
                  <th style={thStyle}>Destinazione</th>
                  <th style={thStyle}>Tipo</th>
                  <th style={thStyle}>Prezzo</th>
                  <th style={thStyle}>Driver</th>
                  <th style={thStyle}>Veicolo</th>
                  <th style={thStyle}>Stato</th>
                  <th style={thStyle}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {paginatedServices.map((service) => (
                  <tr
                    key={service.id}
                    style={{
                      background: selectedServiceId === service.id ? '#eaf4ff' : 'transparent',
                      color: service.status === 'CLOSED' ? '#7f8ea3' : 'inherit'
                    }}
                  >
                    <td style={tdStyle}>
                      <input
                        type="checkbox"
                        checked={selectedForPrintIds.includes(service.id)}
                        onChange={() => togglePrintSelection(service.id)}
                        aria-label={`Seleziona servizio ${service.id} per stampa multipla`}
                      />
                    </td>
                    <td style={tdStyle}>{new Date(service.startAt).toLocaleString('it-IT')}</td>
                    <td style={{ ...tdStyle, minWidth: 180, lineHeight: 1.35 }}>{service.pickupLocation}</td>
                    <td style={{ ...tdStyle, minWidth: 180, lineHeight: 1.35 }}>{service.destination}</td>
                    <td style={tdStyle}>{typeLabel(service.type)}</td>
                    <td style={tdStyle}>{formatCurrencyEUR(service.price)}</td>
                    <td style={{ ...tdStyle, minWidth: 140 }}>
                      {assignedDriverLabel(service)}
                    </td>
                    <td style={{ ...tdStyle, minWidth: 100 }}>
                      {assignedVehicleLabel(service)}
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 600,
                          background:
                            service.status === 'CLOSED'
                              ? '#eceff3'
                              : service.status === 'ASSIGNED'
                                ? '#e8f5e9'
                                : '#fff4e5',
                          color:
                            service.status === 'CLOSED'
                              ? '#5f6b7a'
                              : service.status === 'ASSIGNED'
                                ? '#2e7d32'
                                : '#b26a00'
                        }}
                      >
                        {statusLabel(service.status)}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, minWidth: 180 }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="primary-button compact-button"
                          onClick={() => setSelectedServiceId(service.id)}
                        >
                          Seleziona
                        </button>
                        <button
                          type="button"
                          className="primary-button compact-button"
                          onClick={() => openPrint(service.id)}
                        >
                          Stampa
                        </button>
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
                  <option key={driver.id} value={driver.id}>{driverLabel(driver)}</option>
                ))}
              </select>
            </label>

            <label>
              Veicolo (opzionale)
              <select
                className="form-input"
                value={form.assignedVehicleId}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    assignedVehicleId: event.target.value ? Number(event.target.value) : ''
                  }))
                }
              >
                <option value="">Non assegnato</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>{vehicle.plate}</option>
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