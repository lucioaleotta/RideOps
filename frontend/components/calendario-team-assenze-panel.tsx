"use client";

import { useEffect, useMemo, useState } from 'react';
import { StatusNotice } from './status-notice';
import { absenceTimeRange } from '../lib/absence-time';
import type { CalendarioAssenza } from '../types/absences';

type DriverOption = {
  id: number;
  firstName: string | null;
  lastName: string | null;
  role?: string;
};

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateFromKey(value: string) {
  return new Date(`${value}T00:00:00`);
}

function monthRange(date: Date) {
  const from = new Date(date.getFullYear(), date.getMonth(), 1);
  const to = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { from: dateKey(from), to: dateKey(to) };
}

function buildCalendarDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (firstDay.getDay() + 6) % 7;
  const dayCount = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cellCount = Math.ceil((offset + dayCount) / 7) * 7;
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - offset);
  return Array.from({ length: cellCount }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

function formatMonth(date: Date) {
  const label = date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  return label.charAt(0).toLocaleUpperCase('it-IT') + label.slice(1);
}

function formatLongDate(value: string) {
  return dateFromKey(value).toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

function getDriverName(driverId: number, drivers: DriverOption[]) {
  const driver = drivers.find((item) => item.id === driverId);
  const name = driver ? [driver.firstName, driver.lastName].filter(Boolean).join(' ').trim() : '';
  return name || `Driver #${driverId}`;
}

function formatTimeRange(entry: CalendarioAssenza) {
  const range = absenceTimeRange(entry);
  if (range) return range;
  if (entry.giornataIntera) return 'Intera giornata';
  return 'Orario non specificato';
}

export function CalendarioTeamAssenzePanel() {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [entries, setEntries] = useState<CalendarioAssenza[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [driverFilter, setDriverFilter] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => monthRange(visibleMonth), [visibleMonth]);
  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const monthTitle = useMemo(() => formatMonth(visibleMonth), [visibleMonth]);

  useEffect(() => {
    let active = true;

    async function loadCalendar() {
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams(range);
        const [calendarResponse, driversResponse] = await Promise.all([
          fetch(`/api/calendario-assenze?${query.toString()}`, { cache: 'no-store' }),
          fetch('/api/gestionale/drivers?includeDeleted=true', { cache: 'no-store' })
        ]);
        const [calendarPayload, driversPayload] = await Promise.all([
          calendarResponse.json().catch(() => []),
          driversResponse.json().catch(() => [])
        ]);
        if (!calendarResponse.ok) {
          throw new Error(calendarPayload?.message ?? 'Impossibile caricare il calendario assenze');
        }
        if (!Array.isArray(calendarPayload)) {
          throw new Error('Risposta calendario non valida');
        }
        if (!active) return;
        setEntries(calendarPayload as CalendarioAssenza[]);
        setDrivers(Array.isArray(driversPayload)
          ? (driversPayload as DriverOption[]).filter((driver) => driver.role !== 'DRIVER_FREELANCER')
          : []);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Errore imprevisto durante il caricamento');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadCalendar();
    return () => { active = false; };
  }, [range]);

  const visibleEntries = useMemo(() => entries
    .filter((entry) => driverFilter === '' || entry.driverId === driverFilter)
    .sort((left, right) => left.dataInizio.localeCompare(right.dataInizio)
      || getDriverName(left.driverId, drivers).localeCompare(getDriverName(right.driverId, drivers), 'it')),
  [driverFilter, drivers, entries]);

  const entriesByDate = useMemo(() => {
    const byDate = new Map<string, CalendarioAssenza[]>();
    visibleEntries.forEach((entry) => {
      const start = entry.dataInizio < range.from ? range.from : entry.dataInizio;
      const end = entry.dataFine > range.to ? range.to : entry.dataFine;
      for (let day = dateFromKey(start); dateKey(day) <= end; day.setDate(day.getDate() + 1)) {
        const key = dateKey(day);
        const current = byDate.get(key) ?? [];
        current.push(entry);
        byDate.set(key, current);
      }
    });
    return byDate;
  }, [range.from, range.to, visibleEntries]);

  const selectedEntries = useMemo(() => entriesByDate.get(selectedDate) ?? [], [entriesByDate, selectedDate]);
  const driverOptions = useMemo(() => drivers
    .filter((driver) => entries.some((entry) => entry.driverId === driver.id))
    .sort((left, right) => getDriverName(left.id, drivers).localeCompare(getDriverName(right.id, drivers), 'it')),
  [drivers, entries]);

  function moveMonth(offset: number) {
    const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1);
    setVisibleMonth(next);
    setSelectedDate(dateKey(next));
  }

  function goToToday() {
    const today = new Date();
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(dateKey(today));
  }

  return (
    <main className="assenze-panel calendario-team-panel">
      <header className="services-page-header calendario-team-header">
        <div>
          <span className="calendario-team-eyebrow">GESTIONE PERSONALE</span>
          <h1>Calendario team</h1>
          <p className="services-page-subtitle">Assenze approvate e sganciamenti, con orari quando la richiesta non copre l’intera giornata.</p>
        </div>
        <div className="calendario-team-controls" aria-label="Navigazione calendario">
          <button type="button" className="secondary-button" onClick={() => moveMonth(-1)} aria-label="Mese precedente">‹</button>
          <button type="button" className="secondary-button calendario-team-today" onClick={goToToday}>Oggi</button>
          <button type="button" className="secondary-button" onClick={() => moveMonth(1)} aria-label="Mese successivo">›</button>
        </div>
      </header>

      {error && <StatusNotice tone="error">{error}</StatusNotice>}

      <section className="calendario-team-card" aria-label="Calendario mensile assenze">
        <div className="calendario-team-toolbar">
          <div>
            <h2>{monthTitle}</h2>
            <p>{visibleEntries.length} {visibleEntries.length === 1 ? 'assenza approvata' : 'assenze approvate'} nel mese</p>
          </div>
          <label className="calendario-team-driver-filter">
            <span>Driver</span>
            <select className="form-input" value={driverFilter} onChange={(event) => setDriverFilter(event.target.value ? Number(event.target.value) : '')}>
              <option value="">Tutti i driver</option>
              {driverOptions.map((driver) => <option key={driver.id} value={driver.id}>{getDriverName(driver.id, drivers)}</option>)}
            </select>
          </label>
        </div>

        {loading ? <div className="calendario-team-loading" role="status">Caricamento calendario...</div> : (
          <>
            <div className="calendario-team-grid-scroll">
              <div className="calendario-team-weekdays" aria-hidden="true">
                {WEEKDAYS.map((day) => <div key={day}>{day}</div>)}
              </div>
              <div className="calendario-team-grid">
                {calendarDays.map((day) => {
                  const key = dateKey(day);
                  const dayEntries = entriesByDate.get(key) ?? [];
                  const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();
                  return (
                    <article key={key} className={`calendario-team-day${isCurrentMonth ? '' : ' is-outside'}${key === selectedDate ? ' is-selected' : ''}`}>
                      <button
                        type="button"
                        className="calendario-team-day-number"
                        aria-label={`${formatLongDate(key)}, ${dayEntries.length} ${dayEntries.length === 1 ? 'assenza' : 'assenze'}`}
                        aria-pressed={key === selectedDate}
                        onClick={() => setSelectedDate(key)}
                      >
                        <span>{day.getDate()}</span>
                        {dayEntries.length > 0 && <span className="calendario-team-day-count">{dayEntries.length}</span>}
                      </button>
                      <div className="calendario-team-day-events">
                        {dayEntries.slice(0, 3).map((entry) => (
                          <button
                            type="button"
                            key={entry.richiestaId}
                            className={`calendario-team-event${entry.tipoAssenzaCodice === 'SGA' ? ' is-sganciamento' : ''}`}
                            title={`${getDriverName(entry.driverId, drivers)} · ${entry.tipoAssenzaNome ?? entry.tipoAssenzaCodice ?? 'Assenza'} · ${formatTimeRange(entry)}`}
                            onClick={() => setSelectedDate(key)}
                          >
                            <strong>{getDriverName(entry.driverId, drivers)}</strong>
                            <span>{entry.tipoAssenzaCodice ?? 'Assenza'} · {formatTimeRange(entry)}</span>
                          </button>
                        ))}
                        {dayEntries.length > 3 && <span className="calendario-team-more">+{dayEntries.length - 3} altre</span>}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
            <div className="calendario-team-legend" aria-label="Legenda">
              <span><i className="calendario-team-legend-dot" /> Assenza approvata</span>
              <span><i className="calendario-team-legend-dot is-sganciamento" /> Sganciamento</span>
            </div>
          </>
        )}
      </section>

      <section className="calendario-team-detail" aria-label="Dettagli della data selezionata" aria-live="polite">
        <div className="assenza-section-heading">
          <div>
            <h2>{formatLongDate(selectedDate)}</h2>
            <p>{selectedEntries.length === 1 ? '1 voce programmata' : `${selectedEntries.length} voci programmate`}</p>
          </div>
        </div>
        {loading ? <div className="calendario-team-loading">Aggiornamento dettagli...</div> : selectedEntries.length === 0 ? (
          <div className="calendario-team-empty">Nessuna assenza approvata o sganciamento per questa data.</div>
        ) : (
          <div className="calendario-team-entry-list">
            {selectedEntries.map((entry) => (
              <article className={`calendario-team-entry${entry.tipoAssenzaCodice === 'SGA' ? ' is-sganciamento' : ''}`} key={entry.richiestaId}>
                <span className="calendario-team-entry-mark" aria-hidden="true">{entry.tipoAssenzaCodice === 'SGA' ? 'S' : 'A'}</span>
                <div className="calendario-team-entry-main">
                  <div className="calendario-team-entry-title">
                    <strong>{getDriverName(entry.driverId, drivers)}</strong>
                    <span>{entry.tipoAssenzaNome ?? entry.tipoAssenzaCodice ?? 'Assenza'}</span>
                  </div>
                  <p>{formatTimeRange(entry)} · {entry.dataInizio === entry.dataFine
                    ? '1 giorno'
                    : `${dateFromKey(entry.dataInizio).toLocaleDateString('it-IT')} – ${dateFromKey(entry.dataFine).toLocaleDateString('it-IT')}`}</p>
                </div>
                <span className={`calendario-team-origin origin-${entry.origine.toLowerCase()}`}>
                  {entry.tipoAssenzaCodice === 'SGA' ? 'Sganciamento' : entry.origine === 'GESTIONALE' ? 'Inserita dal Gestionale' : 'Richiesta Driver'}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
