"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { formatCurrencyEUR } from '../lib/currency';

type ViewMode = 'month' | 'week' | 'day';
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

export function CalendarDashboard({ driverMode = false }: CalendarDashboardProps) {
  const [view, setView] = useState<ViewMode>('month');
  const [cursorDate, setCursorDate] = useState(() => startOfDay(new Date()));
  const [filters, setFilters] = useState<FilterState>(filtersDefault);

  const [drivers, setDrivers] = useState<DriverItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    async function loadServices() {
      setLoading(true);
      setError(null);

      if (driverMode) {
        const [todayResponse, upcomingResponse] = await Promise.all([
          fetch('/api/driver/services/today', { cache: 'no-store' }),
          fetch('/api/driver/services/upcoming', { cache: 'no-store' })
        ]);

        const todayPayload = (await todayResponse.json().catch(() => [])) as ServiceItem[] | { message?: string };
        const upcomingPayload = (await upcomingResponse.json().catch(() => [])) as ServiceItem[] | { message?: string };

        if (!todayResponse.ok) {
          setError((todayPayload as { message?: string }).message ?? 'Errore caricamento servizi driver');
          setLoading(false);
          setServices([]);
          return;
        }

        if (!upcomingResponse.ok) {
          setError((upcomingPayload as { message?: string }).message ?? 'Errore caricamento servizi driver');
          setLoading(false);
          setServices([]);
          return;
        }

        const byId = new Map<number, ServiceItem>();
        [...(todayPayload as ServiceItem[]), ...(upcomingPayload as ServiceItem[])].forEach((item) => {
          byId.set(item.id, item);
        });

        const filtered = Array.from(byId.values())
          .filter((service) => {
            if (filters.status && service.status !== filters.status) {
              return false;
            }
            if (filters.type && service.type !== filters.type) {
              return false;
            }

            const at = new Date(service.startAt);
            return at >= range.from && at < range.to;
          })
          .sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime());

        setServices(filtered);
        setLoading(false);
        setSelectedServiceId((prev) => (prev && filtered.some((item) => item.id === prev) ? prev : filtered[0]?.id ?? null));
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
      return `${fullName} (${driver.userId || driver.email})`;
    }
    return driver.userId || driver.email;
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
          background: isSelected ? '#d7eafe' : '#e8f2fd'
        }}
      >
        <strong>{new Date(service.startAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</strong>
        {' · '}
        {service.pickupLocation}
      </button>
    );
  }

  function renderMonthView() {
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6, marginBottom: 6 }}>
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} style={{ fontWeight: 700, color: 'var(--muted)', padding: '0 4px' }}>
              {label}
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
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
                  minHeight: 120,
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 8 }}>
        {weekDays.map((day, index) => {
          const dayServices = getServicesForDate(day);
          return (
            <div key={day.toISOString()} style={{ border: '1px solid #dce8f5', borderRadius: 10, padding: 8, minHeight: 180 }}>
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

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <article className="dashboard-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="logout-button" onClick={() => moveRange(-1)}>←</button>
            <button type="button" className="logout-button" onClick={gotoToday}>Oggi</button>
            <button type="button" className="logout-button" onClick={() => moveRange(1)}>→</button>
            <strong style={{ marginLeft: 4 }}>{viewTitle()}</strong>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className={view === 'month' ? 'primary-button' : 'logout-button'} onClick={() => setView('month')}>Mese</button>
            <button type="button" className={view === 'week' ? 'primary-button' : 'logout-button'} onClick={() => setView('week')}>Settimana</button>
            <button type="button" className={view === 'day' ? 'primary-button' : 'logout-button'} onClick={() => setView('day')}>Giorno</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginTop: 12 }}>
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
            </select>
          </label>
        </div>
      </article>

      {error && <p className="error-text">{error}</p>}
      {loading && <p>Caricamento calendario...</p>}

      {!loading && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <article className="dashboard-card" style={{ overflowX: 'auto' }}>
            {view === 'month' && renderMonthView()}
            {view === 'week' && renderWeekView()}
            {view === 'day' && renderDayView()}
          </article>

          <article className="dashboard-card">
            <h3 style={{ marginTop: 0 }}>Dettaglio servizio</h3>
            {!selectedService && <p>Seleziona un servizio dal calendario.</p>}
            {selectedService && (
              <div style={{ display: 'grid', gap: 8 }}>
                <div><strong>Quando:</strong> {new Date(selectedService.startAt).toLocaleString('it-IT')}</div>
                <div><strong>Pickup:</strong> {selectedService.pickupLocation}</div>
                <div><strong>Destinazione:</strong> {selectedService.destination}</div>
                <div><strong>Tipologia:</strong> {selectedService.type}</div>
                <div><strong>Stato:</strong> {selectedService.status}</div>
                <div>
                  <strong>Driver:</strong>{' '}
                  {selectedServiceDriverLabel === 'Non Assegnato a Driver' ? (
                    <span style={{ background: '#ffd8a8', padding: '2px 6px', borderRadius: 6 }}>
                      {selectedServiceDriverLabel}
                    </span>
                  ) : (
                    selectedServiceDriverLabel
                  )}
                </div>
                <div><strong>Prezzo:</strong> {formatCurrencyEUR(selectedService.price)}</div>
                <Link className="logout-button" href={`/services/${selectedService.id}/print`} target="_blank">Apri dettaglio stampa</Link>
              </div>
            )}
          </article>
        </div>
      )}
    </section>
  );
}
