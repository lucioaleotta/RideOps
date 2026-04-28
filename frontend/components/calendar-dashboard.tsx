"use client";

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, ArrowRightIcon, ButtonContent, LockIcon, OpenIcon, SelectIcon, TodayIcon } from './action-icons';
import { formatCurrencyEUR } from '../lib/currency';
import { StatusNotice } from './status-notice';

type ViewMode = 'month' | 'week' | 'day';
type ServiceType = 'TRANSFER' | 'TOUR' | 'DISPOSIZIONE';
type ServiceStatus = 'OPEN' | 'ASSIGNED' | 'EXECUTED' | 'CLOSED';

type ServiceItem = {
  id: number;
  startAt: string;
  pickupLocation: string;
  destination: string;
  type: ServiceType;
  durationHours: number | null;
  notes: string | null;
  price: number | null;
  externalBookingReference: string | null;
  internalBookingReference: string | null;
  clientName: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
  passengersCount: number | null;
  itinerary: string | null;
  status: ServiceStatus;
  assignedDriverId: number | null;
  assignedVehicleId: number | null;
  serviceAssignmentType: 'INTERNAL' | 'OUTSOURCED' | 'INCOMING';
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

type VehicleItem = {
  id: number;
  plate: string;
  type: string | null;
  notes: string | null;
};

type FilterState = {
  driverId: number | '';
  status: ServiceStatus | '';
  type: ServiceType | '';
};

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const filtersDefault: FilterState = {
  driverId: '',
  status: '',
  type: ''
};

function cloneDate(date: Date) {
  return new Date(date.getTime());
}

function startOfDay(date: Date) {
  const next = cloneDate(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDayExclusive(date: Date) {
  const next = startOfDay(date);
  next.setDate(next.getDate() + 1);
  return next;
}

function startOfWeek(date: Date) {
  const next = startOfDay(date);
  const day = next.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + delta);
  return next;
}

function endOfWeekExclusive(date: Date) {
  const next = startOfWeek(date);
  next.setDate(next.getDate() + 7);
  return next;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonthExclusive(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0);
}

function toLocalDateTimeParam(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

function sameDate(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

type CalendarDashboardProps = {
  driverMode?: boolean;
};

function CalClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" strokeLinecap="round" />
    </svg>
  );
}
function CalPinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 21C12 21 5 13.5 5 8.5a7 7 0 0 1 14 0C19 13.5 12 21 12 21Z" /><circle cx="12" cy="8.5" r="2.5" />
    </svg>
  );
}
function CalUserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" />
    </svg>
  );
}
function CalCarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="2" y="11" width="20" height="8" rx="2" /><path d="M5 11l2.5-5h9L19 11" /><circle cx="7" cy="19" r="1.5" fill="currentColor" /><circle cx="17" cy="19" r="1.5" fill="currentColor" />
    </svg>
  );
}
function CalEuroIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M17 6.5A7 7 0 1 0 17 17.5M5 10h9M5 14h9" strokeLinecap="round" />
    </svg>
  );
}
function CalDocIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-4-4H8Z" /><path d="M14 4v4h4M9 13h6M9 17h4" strokeLinecap="round" />
    </svg>
  );
}
function CalPhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.27 19a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91A16 16 0 0 0 14 15.91l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z" strokeLinejoin="round" />
    </svg>
  );
}
function CalMailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 7 10 7 10-7" strokeLinejoin="round" />
    </svg>
  );
}
function CalPeopleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="9" cy="7" r="3.5" /><circle cx="17" cy="8" r="2.5" />
      <path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6" strokeLinecap="round" /><path d="M17 14c2.2.5 4 2.3 4 4" strokeLinecap="round" />
    </svg>
  );
}
function CalPrintIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}
function CalClipboardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M9 12h6M9 16h4" strokeLinecap="round" />
    </svg>
  );
}

function CalDetailRow({ icon, label, value, bold = false }: { icon: ReactNode; label: string; value: ReactNode; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <span style={{ color: 'var(--color-primary, #1565c0)', marginTop: 2, flexShrink: 0, width: 18, display: 'flex', justifyContent: 'center' }}>
        {icon}
      </span>
      <div>
        <div style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary, #7f8ea3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1.2 }}>
          {label}
        </div>
        <div style={{ fontSize: '0.88rem', fontWeight: bold ? 700 : 400, marginTop: 2, lineHeight: 1.4 }}>
          {value}
        </div>
      </div>
    </div>
  );
}

const calDetailDivider = <hr style={{ border: 'none', borderTop: '1px solid #dce8f5', margin: '10px 0' }} />;

export function CalendarDashboard({ driverMode = false }: CalendarDashboardProps) {
  const [view, setView] = useState<ViewMode>('month');
  const [cursorDate, setCursorDate] = useState(() => startOfDay(new Date()));
  const [filters, setFilters] = useState<FilterState>(filtersDefault);

  const [drivers, setDrivers] = useState<DriverItem[]>([]);
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [submittingClose, setSubmittingClose] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const range = useMemo(() => {
    if (view === 'day') {
      return {
        from: startOfDay(cursorDate),
        to: endOfDayExclusive(cursorDate)
      };
    }

    if (view === 'week') {
      return {
        from: startOfWeek(cursorDate),
        to: endOfWeekExclusive(cursorDate)
      };
    }

    return {
      from: startOfMonth(cursorDate),
      to: endOfMonthExclusive(cursorDate)
    };
  }, [view, cursorDate]);

  useEffect(() => {
    if (driverMode) {
      setDrivers([]);
      return;
    }

    async function loadDrivers() {
      const response = await fetch('/api/gestionale/drivers', { cache: 'no-store' });
      const payload = (await response.json().catch(() => [])) as DriverItem[] | { message?: string };
      if (!response.ok) {
        return;
      }
      setDrivers(payload as DriverItem[]);
    }

    loadDrivers();
  }, [driverMode]);

  useEffect(() => {
    async function loadVehicles() {
      const response = await fetch('/api/fleet/vehicles', { cache: 'no-store' });
      const payload = (await response.json().catch(() => [])) as VehicleItem[] | { message?: string };
      if (!response.ok) {
        return;
      }
      setVehicles(payload as VehicleItem[]);
    }

    loadVehicles();
  }, [driverMode]);

  useEffect(() => {
    async function loadServices() {
      setLoading(true);
      setError(null);

      if (driverMode) {
        const query = new URLSearchParams({
          from: toLocalDateTimeParam(range.from),
          to: toLocalDateTimeParam(range.to)
        });

        if (filters.status) {
          query.set('status', filters.status);
        }
        if (filters.type) {
          query.set('type', filters.type);
        }

        // Driver mode consumes the same filtered service API, scoped by backend to current driver.
        const response = await fetch(`/api/driver/services?${query.toString()}`, { cache: 'no-store' });
        const payload = (await response.json().catch(() => [])) as ServiceItem[] | { message?: string };

        if (!response.ok) {
          setError((payload as { message?: string }).message ?? 'Errore caricamento servizi driver');
          setLoading(false);
          setServices([]);
          return;
        }

        const nextServices = payload as ServiceItem[];
        setServices(nextServices);
        setLoading(false);
        setSelectedServiceId((prev) => (prev && nextServices.some((item) => item.id === prev) ? prev : nextServices[0]?.id ?? null));
        return;
      }

      const query = new URLSearchParams({
        from: toLocalDateTimeParam(range.from),
        to: toLocalDateTimeParam(range.to)
      });

      if (filters.driverId) {
        query.set('driverId', String(filters.driverId));
      }
      if (filters.status) {
        query.set('status', filters.status);
      }
      if (filters.type) {
        query.set('type', filters.type);
      }

      const response = await fetch(`/api/services?${query.toString()}`, { cache: 'no-store' });
      const payload = (await response.json().catch(() => [])) as ServiceItem[] | { message?: string };

      if (!response.ok) {
        setError((payload as { message?: string }).message ?? 'Errore caricamento servizi calendario');
        setLoading(false);
        setServices([]);
        return;
      }

      const nextServices = payload as ServiceItem[];
      setServices(nextServices);
      setLoading(false);
      setSelectedServiceId((prev) => (prev && nextServices.some((item) => item.id === prev) ? prev : nextServices[0]?.id ?? null));
    }

    loadServices();
  }, [driverMode, range.from, range.to, filters.driverId, filters.status, filters.type]);

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId) ?? null,
    [services, selectedServiceId]
  );

  const canDriverCloseSelectedService = useMemo(() => {
    if (!driverMode || !selectedService || selectedService.status !== 'ASSIGNED') {
      return false;
    }

    const startAt = new Date(selectedService.startAt);
    if (Number.isNaN(startAt.getTime())) {
      return false;
    }

    return startAt.getTime() <= Date.now();
  }, [driverMode, selectedService]);

  const selectedServiceDriverLabel = useMemo(() => {
    if (!selectedService || !selectedService.assignedDriverId) {
      return 'Non Assegnato a Driver';
    }

    if (driverMode) {
      return 'Assegnato a te';
    }

    const driver = drivers.find((item) => item.id === selectedService.assignedDriverId);
    if (!driver) {
      return `#${selectedService.assignedDriverId}`;
    }

    const fullName = [driver.firstName, driver.lastName].filter(Boolean).join(' ').trim();
    if (fullName) {
      return fullName;
    }
    return driver.email;
  }, [driverMode, selectedService, drivers]);

  const servicesByDay = useMemo(() => {
    const map = new Map<string, ServiceItem[]>();
    services.forEach((service) => {
      const date = new Date(service.startAt);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const current = map.get(key) ?? [];
      current.push(service);
      map.set(key, current);
    });
    return map;
  }, [services]);

  const monthGridDays = useMemo(() => {
    const monthStart = startOfMonth(cursorDate);
    const gridStart = startOfWeek(monthStart);
    const days: Date[] = [];

    for (let index = 0; index < 42; index += 1) {
      const day = cloneDate(gridStart);
      day.setDate(gridStart.getDate() + index);
      days.push(day);
    }

    return days;
  }, [cursorDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursorDate);
    const days: Date[] = [];

    for (let index = 0; index < 7; index += 1) {
      const day = cloneDate(start);
      day.setDate(start.getDate() + index);
      days.push(day);
    }

    return days;
  }, [cursorDate]);

  function dayKey(date: Date) {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  function getServicesForDate(date: Date) {
    return servicesByDay.get(dayKey(date)) ?? [];
  }

  function gotoToday() {
    setCursorDate(startOfDay(new Date()));
  }

  function statusLabel(status: ServiceStatus) {
    if (status === 'OPEN') return 'Aperto';
    if (status === 'ASSIGNED') return 'Assegnato';
    if (status === 'EXECUTED') return 'Eseguito';
    return 'Chiuso';
  }

  function statusClass(status: ServiceStatus) {
    if (status === 'OPEN') return 'open';
    if (status === 'ASSIGNED') return 'assigned';
    if (status === 'EXECUTED') return 'executed';
    return 'closed';
  }

  function typeLabel(type: ServiceType) {
    if (type === 'TRANSFER') return 'Transfer';
    if (type === 'DISPOSIZIONE') return 'Disposizione';
    return 'Tour';
  }

  function vehicleLabel(vehicleId: number | null) {
    if (!vehicleId) return '—';
    const found = vehicles.find((v) => v.id === vehicleId);
    if (!found) return `#${vehicleId}`;
    const description = found.notes?.trim() || found.type || null;
    return description ? `${found.plate} - ${description}` : found.plate;
  }

  function moveRange(direction: -1 | 1) {
    setCursorDate((prev) => {
      const next = cloneDate(prev);
      if (view === 'day') {
        next.setDate(next.getDate() + direction);
      } else if (view === 'week') {
        next.setDate(next.getDate() + direction * 7);
      } else {
        next.setMonth(next.getMonth() + direction);
      }
      return next;
    });
  }

  function viewTitle() {
    if (view === 'day') {
      return cursorDate.toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    }

    if (view === 'week') {
      const from = weekDays[0];
      const to = weekDays[6];
      return `${from.toLocaleDateString('it-IT')} - ${to.toLocaleDateString('it-IT')}`;
    }

    return cursorDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  }

  function renderServiceChip(service: ServiceItem) {
    const isSelected = selectedServiceId === service.id;
    return (
      <button
        key={service.id}
        type="button"
        onClick={() => setSelectedServiceId(service.id)}
        className="logout-button"
        style={{
          width: '100%',
          textAlign: 'left',
          marginTop: 4,
          background: isSelected ? '#d7eafe' : '#e8f2fd',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-start'
        }}
      >
        <span className="button-icon" aria-hidden="true" style={{ flexShrink: 0 }}><SelectIcon /></span>
        <span style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <strong>{new Date(service.startAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</strong>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85em', color: 'var(--muted)' }}>{service.pickupLocation}</span>
        </span>
      </button>
    );
  }

  function renderMonthView() {
    return (
      <div>
        <div className="calendar-grid-weekdays" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6, marginBottom: 6 }}>
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} style={{ fontWeight: 700, color: 'var(--muted)', padding: '0 4px' }}>
              {label}
            </div>
          ))}
        </div>
        <div className="calendar-grid-month" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
          {monthGridDays.map((day) => {
            const outOfMonth = day.getMonth() !== cursorDate.getMonth();
            const dayServices = getServicesForDate(day);
            return (
              <div
                key={day.toISOString()}
                style={{
                  border: '1px solid #dce8f5',
                  borderRadius: 10,
                  padding: 6,
                  height: 120,
                  overflow: 'hidden',
                  background: outOfMonth ? '#f5f8fc' : 'white',
                  opacity: outOfMonth ? 0.75 : 1
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{day.getDate()}</div>
                {dayServices.slice(0, 3).map(renderServiceChip)}
                {dayServices.length > 3 && <small style={{ color: 'var(--muted)' }}>+{dayServices.length - 3} altri</small>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderWeekView() {
    return (
      <div className="calendar-grid-week" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 8 }}>
        {weekDays.map((day, index) => {
          const dayServices = getServicesForDate(day);
          return (
            <div key={day.toISOString()} style={{ border: '1px solid #dce8f5', borderRadius: 10, padding: 8, height: 180, overflow: 'hidden' }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                {WEEKDAY_LABELS[index]} {day.getDate()}
              </div>
              {dayServices.length === 0 && <small style={{ color: 'var(--muted)' }}>Nessun servizio</small>}
              {dayServices.map(renderServiceChip)}
            </div>
          );
        })}
      </div>
    );
  }

  function renderDayView() {
    const dayServices = getServicesForDate(cursorDate);
    return (
      <div style={{ display: 'grid', gap: 8 }}>
        {dayServices.length === 0 && <p>Nessun servizio per il giorno selezionato.</p>}
        {dayServices.map((service) => (
          <article key={service.id} className="dashboard-card" style={{ padding: 10 }}>
            {renderServiceChip(service)}
            <div style={{ marginTop: 6, color: 'var(--muted)' }}>
              {service.destination}
            </div>
          </article>
        ))}
      </div>
    );
  }

  async function onDriverClose(serviceId: number) {
    setSubmittingClose(true);
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/driver/services/${serviceId}/close`, { method: 'PATCH' });
    const payload = (await response.json().catch(() => ({}))) as { message?: string };

    if (!response.ok) {
      setError(payload.message ?? 'Aggiornamento stato servizio fallito');
      setSubmittingClose(false);
      return;
    }

    setSuccess('Servizio segnato come ESEGUITO');

    const query = new URLSearchParams({
      from: toLocalDateTimeParam(range.from),
      to: toLocalDateTimeParam(range.to)
    });
    if (filters.status) {
      query.set('status', filters.status);
    }
    if (filters.type) {
      query.set('type', filters.type);
    }

    const reloadResponse = await fetch(`/api/driver/services?${query.toString()}`, { cache: 'no-store' });
    const reloadPayload = (await reloadResponse.json().catch(() => [])) as ServiceItem[] | { message?: string };
    setSubmittingClose(false);

    if (!reloadResponse.ok) {
      setError((reloadPayload as { message?: string }).message ?? 'Errore aggiornamento servizi driver');
      return;
    }

    const nextServices = reloadPayload as ServiceItem[];
    setServices(nextServices);
    setSelectedServiceId((prev) => (prev && nextServices.some((item) => item.id === prev) ? prev : nextServices[0]?.id ?? null));
  }

  return (
    <section className="responsive-panel calendar-dashboard" style={{ display: 'grid', gap: 16 }}>
      <article className="dashboard-card">
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div className="panel-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="logout-button" onClick={() => moveRange(-1)}><ButtonContent icon={<ArrowLeftIcon />}>Prec.</ButtonContent></button>
            <button type="button" className="logout-button" onClick={gotoToday}><ButtonContent icon={<TodayIcon />}>Oggi</ButtonContent></button>
            <button type="button" className="logout-button" onClick={() => moveRange(1)}><ButtonContent icon={<ArrowRightIcon />}>Succ.</ButtonContent></button>
            <strong style={{ marginLeft: 4 }}>{viewTitle()}</strong>
          </div>

          <div className="panel-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className={view === 'month' ? 'primary-button' : 'logout-button'} onClick={() => setView('month')}><ButtonContent icon={<TodayIcon />}>Mese</ButtonContent></button>
            <button type="button" className={view === 'week' ? 'primary-button' : 'logout-button'} onClick={() => setView('week')}><ButtonContent icon={<TodayIcon />}>Settimana</ButtonContent></button>
            <button type="button" className={view === 'day' ? 'primary-button' : 'logout-button'} onClick={() => setView('day')}><ButtonContent icon={<TodayIcon />}>Giorno</ButtonContent></button>
          </div>
        </div>

        <div className="responsive-filters-grid portal-filters-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginTop: 12 }}>
          {!driverMode && (
            <label>
              Driver
              <select
                className="form-input"
                value={filters.driverId}
                onChange={(event) => setFilters((prev) => ({ ...prev, driverId: event.target.value ? Number(event.target.value) : '' }))}
              >
                <option value="">Tutti</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>{driver.userId}</option>
                ))}
              </select>
            </label>
          )}

          <label>
            Stato
            <select
              className="form-input"
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: (event.target.value as ServiceStatus | '') }))}
            >
              <option value="">Tutti</option>
              <option value="OPEN">OPEN</option>
              <option value="ASSIGNED">ASSIGNED</option>
              <option value="EXECUTED">EXECUTED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </label>

          <label>
            Tipologia
            <select
              className="form-input"
              value={filters.type}
              onChange={(event) => setFilters((prev) => ({ ...prev, type: (event.target.value as ServiceType | '') }))}
            >
              <option value="">Tutte</option>
              <option value="TRANSFER">TRANSFER</option>
              <option value="TOUR">TOUR</option>
              <option value="DISPOSIZIONE">DISPOSIZIONE</option>
            </select>
          </label>
        </div>
      </article>

      {error && <StatusNotice tone="error">{error}</StatusNotice>}
      {success && <StatusNotice tone="success">{success}</StatusNotice>}
      {loading && <p>Caricamento calendario...</p>}

      {!loading && !error && (
        <div className="calendar-layout" style={{ display: 'grid', gap: 12 }}>
          <article className="dashboard-card calendar-main" style={{ overflowX: 'auto' }}>
            {view === 'month' && renderMonthView()}
            {view === 'week' && renderWeekView()}
            {view === 'day' && renderDayView()}
          </article>

          <article className="dashboard-card calendar-detail">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ color: 'var(--color-primary, #1565c0)', display: 'flex' }}><CalClipboardIcon /></span>
              <strong style={{ fontSize: '1.05rem' }}>Dettaglio servizio</strong>
            </div>

            {!selectedService && (
              <p style={{ color: 'var(--color-text-secondary, #7f8ea3)', fontSize: '0.88rem' }}>
                Seleziona un servizio dal calendario.
              </p>
            )}

            {selectedService && (
              <div>
                {/* Chips stato / tipo / rif */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                  <span className={`services-selected-chip services-selected-chip-status ${statusClass(selectedService.status)}`}>
                    {statusLabel(selectedService.status)}
                  </span>
                  <span className="services-selected-chip services-selected-chip-type">
                    {typeLabel(selectedService.type)}
                  </span>
                  {selectedService.internalBookingReference && (
                    <span className="services-selected-chip" style={{ background: '#f0f4f9', color: '#4a5568', border: '1px solid #dce8f5' }}>
                      {selectedService.internalBookingReference}
                    </span>
                  )}
                </div>

                {/* Sezione logistica */}
                <div style={{ display: 'grid', gap: 10, marginBottom: 4 }}>
                  <CalDetailRow icon={<CalClockIcon />} label="Quando" value={new Date(selectedService.startAt).toLocaleString('it-IT')} />
                  <CalDetailRow icon={<CalPinIcon />} label="Pickup" value={selectedService.pickupLocation} />
                  <CalDetailRow icon={<CalPinIcon />} label="Destinazione" value={selectedService.destination} />
                </div>

                {calDetailDivider}

                {/* Sezione assegnazione */}
                <div style={{ display: 'grid', gap: 10, marginBottom: 4 }}>
                  <CalDetailRow icon={<CalUserIcon />} label="Driver" value={selectedServiceDriverLabel} />
                  <CalDetailRow icon={<CalCarIcon />} label="Veicolo" value={vehicleLabel(selectedService.assignedVehicleId)} />
                  <CalDetailRow icon={<CalEuroIcon />} label="Prezzo" value={formatCurrencyEUR(selectedService.price)} bold />
                </div>

                {calDetailDivider}

                {/* Sezione riferimenti */}
                <div style={{ display: 'grid', gap: 10, marginBottom: 4 }}>
                  <CalDetailRow icon={<CalDocIcon />} label="Rif. interno" value={selectedService.internalBookingReference ?? '—'} />
                  <CalDetailRow icon={<CalDocIcon />} label="Rif. esterno" value={selectedService.externalBookingReference ?? '—'} />
                </div>

                {calDetailDivider}

                {/* Sezione cliente */}
                <div style={{ display: 'grid', gap: 10, marginBottom: 4 }}>
                  <CalDetailRow icon={<CalUserIcon />} label="Cliente" value={selectedService.clientName ?? '—'} />
                  <CalDetailRow icon={<CalPhoneIcon />} label="Telefono" value={selectedService.clientPhone ?? '—'} />
                  <CalDetailRow icon={<CalMailIcon />} label="Email" value={selectedService.clientEmail ?? '—'} />
                  <CalDetailRow icon={<CalPeopleIcon />} label="Passeggeri" value={selectedService.passengersCount != null ? String(selectedService.passengersCount) : '—'} />
                </div>

                {calDetailDivider}

                {/* Azioni */}
                <div style={{ display: 'grid', gap: 8 }}>
                  <Link
                    className="logout-button"
                    href={`/services/${selectedService.id}/print`}
                    target="_blank"
                    style={{ display: 'flex', justifyContent: 'center' }}
                  >
                    <ButtonContent icon={<CalPrintIcon />}>Apri dettaglio stampa</ButtonContent>
                  </Link>
                  {driverMode && canDriverCloseSelectedService && (
                    <button
                      type="button"
                      className="primary-button compact-button"
                      style={{ background: '#ef6c00' }}
                      onClick={() => onDriverClose(selectedService.id)}
                      disabled={submittingClose}
                    >
                      <ButtonContent icon={<LockIcon />}>{submittingClose ? 'Salvataggio...' : 'Segna Eseguito'}</ButtonContent>
                    </button>
                  )}
                </div>
              </div>
            )}
          </article>
        </div>
      )}
    </section>
  );
}
