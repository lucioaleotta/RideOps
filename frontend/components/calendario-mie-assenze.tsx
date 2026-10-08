"use client";

import { useEffect, useMemo, useState } from 'react';
import { StatusNotice } from './status-notice';
import type { RichiestaAssenza } from '../types/absences';

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
  return {
    dataInizio: dateKey(new Date(date.getFullYear(), date.getMonth(), 1)),
    dataFine: dateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0))
  };
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

function formatTimeRange(request: RichiestaAssenza) {
  if (request.oraInizio && request.oraFine) {
    return `${request.oraInizio.slice(0, 5)}–${request.oraFine.slice(0, 5)}`;
  }
  return request.giornataIntera ? 'Intera giornata' : 'Orario non specificato';
}

export function CalendarioMieAssenze() {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [requests, setRequests] = useState<RichiestaAssenza[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const range = useMemo(() => monthRange(visibleMonth), [visibleMonth]);
  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);

  useEffect(() => {
    let active = true;

    async function loadMonth() {
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams({
          stato: 'APPROVATA',
          dataInizio: range.dataInizio,
          dataFine: range.dataFine
        });
        const response = await fetch(`/api/richieste-assenza?${query.toString()}`, { cache: 'no-store' });
        const payload = await response.json().catch(() => []);
        if (!response.ok) {
          throw new Error(payload?.message ?? 'Impossibile caricare il calendario delle assenze');
        }
        if (!Array.isArray(payload)) {
          throw new Error('Risposta calendario non valida');
        }
        if (active) {
          setRequests((payload as RichiestaAssenza[]).filter((request) => request.stato === 'APPROVATA'));
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Errore imprevisto durante il caricamento');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadMonth();
    return () => { active = false; };
  }, [range]);

  const requestsForDate = useMemo(() => requests.filter((request) =>
    request.dataInizio <= selectedDate && request.dataFine >= selectedDate
  ), [requests, selectedDate]);

  function moveMonth(offset: number) {
    const nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1);
    setVisibleMonth(nextMonth);
    setSelectedDate(dateKey(nextMonth));
  }

  function goToToday() {
    const today = new Date();
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(dateKey(today));
  }

  return (
    <section className="assenza-personal-calendar" aria-label="Calendario personale delle assenze">
      <div className="assenza-personal-calendar-toolbar">
        <div>
          <h2>{formatMonth(visibleMonth)}</h2>
          <p>Le tue assenze approvate</p>
        </div>
        <div className="assenza-personal-calendar-controls" aria-label="Navigazione calendario">
          <button type="button" className="secondary-button" onClick={() => moveMonth(-1)} aria-label="Mese precedente">‹</button>
          <button type="button" className="secondary-button" onClick={goToToday}>Oggi</button>
          <button type="button" className="secondary-button" onClick={() => moveMonth(1)} aria-label="Mese successivo">›</button>
        </div>
      </div>

      {error && <StatusNotice tone="error">{error}</StatusNotice>}
      {loading ? <div className="assenza-calendar-loading" role="status">Caricamento calendario...</div> : (
        <>
          <div className="assenza-calendar-grid-scroll">
            <div className="assenza-calendar-weekdays" aria-hidden="true">
              {WEEKDAYS.map((weekday) => <div key={weekday}>{weekday}</div>)}
            </div>
            <div className="assenza-calendar-grid">
              {calendarDays.map((day) => {
                const key = dateKey(day);
                const dayRequests = requests.filter((request) => request.dataInizio <= key && request.dataFine >= key);
                const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();
                return (
                  <article key={key} className={`assenza-calendar-day${isCurrentMonth ? '' : ' is-outside'}${key === selectedDate ? ' is-selected' : ''}`}>
                    <button
                      type="button"
                      className="assenza-calendar-day-number"
                      aria-label={`${formatLongDate(key)}, ${dayRequests.length} ${dayRequests.length === 1 ? 'assenza' : 'assenze'}`}
                      aria-pressed={key === selectedDate}
                      onClick={() => setSelectedDate(key)}
                    >
                      <span>{day.getDate()}</span>
                      {dayRequests.length > 0 && <span className="assenza-calendar-day-count">{dayRequests.length}</span>}
                    </button>
                    <div className="assenza-calendar-day-events">
                      {dayRequests.slice(0, 2).map((request) => (
                        <span className="assenza-calendar-event" key={request.id} title={`${request.tipoAssenzaNome ?? request.tipoAssenzaCodice ?? 'Assenza'} · ${formatTimeRange(request)}`}>
                          {request.tipoAssenzaCodice ?? 'Assenza'} · {formatTimeRange(request)}
                        </span>
                      ))}
                      {dayRequests.length > 2 && <span className="assenza-calendar-more">+{dayRequests.length - 2} altre</span>}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
          <section className="assenza-calendar-detail" aria-label="Dettagli della data selezionata" aria-live="polite">
            <h3>{formatLongDate(selectedDate)}</h3>
            {requestsForDate.length === 0 ? (
              <p>Nessuna assenza approvata per questa data.</p>
            ) : (
              <ul>
                {requestsForDate.map((request) => (
                  <li key={request.id}>
                    <strong>{request.tipoAssenzaNome ?? request.tipoAssenzaCodice ?? 'Assenza'}</strong>
                    <span>{formatDateRange(request.dataInizio, request.dataFine)}</span>
                    <span>{formatTimeRange(request)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </section>
  );
}

function formatDateRange(from: string, to: string) {
  const start = dateFromKey(from).toLocaleDateString('it-IT');
  const end = dateFromKey(to).toLocaleDateString('it-IT');
  return from === to ? start : `${start} — ${end}`;
}
