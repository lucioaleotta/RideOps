"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { StatusNotice } from './status-notice';
import { absenceTimeRange } from '../lib/absence-time';
import type {
  AssenzaSessionUser,
  NuovaRichiestaAssenzaPayload,
  RichiestaAssenza,
  SaldoAssenza,
  StatoRichiestaAssenza,
  TipoAssenza
} from '../types/absences';

type AssenzeViewMode = 'calendario' | 'elenco';

type FormState = {
  tipoAssenzaId: string;
  giornataIntera: boolean;
  dataInizio: string;
  dataFine: string;
  oraInizio: string;
  oraFine: string;
  motivazione: string;
};

const defaultForm: FormState = {
  tipoAssenzaId: '',
  giornataIntera: true,
  dataInizio: '',
  dataFine: '',
  oraInizio: '',
  oraFine: '',
  motivazione: ''
};

const statoLabels: Record<StatoRichiestaAssenza, string> = {
  BOZZA: 'Bozza',
  IN_ATTESA: 'In attesa',
  APPROVATA: 'Approvata',
  RIFIUTATA: 'Rifiutata',
  ANNULLATA: 'Annullata'
};

const driverDuplicateRequestMessage = 'Hai già inserito una richiesta di assenza nello stesso periodo.';
const calendarWeekdays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calendarMonthDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const weekdayOffset = (firstDay.getDay() + 6) % 7;
  const dayCount = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cellCount = Math.ceil((weekdayOffset + dayCount) / 7) * 7;
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - weekdayOffset);
  return Array.from({ length: cellCount }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

function formatCalendarMonth(date: Date) {
  const label = date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  return label.charAt(0).toLocaleUpperCase('it-IT') + label.slice(1);
}

function calendarCategoryClass(code: string | null) {
  switch (code) {
    case 'FER': return 'assenza-calendar-event--fer';
    case 'MAL': return 'assenza-calendar-event--mal';
    case 'PER': return 'assenza-calendar-event--per';
    case 'RIP': return 'assenza-calendar-event--rip';
    case 'CON': return 'assenza-calendar-event--con';
    case 'SGA': return 'assenza-calendar-event--sga';
    default: return 'assenza-calendar-event--default';
  }
}

function calendarTimeLabel(richiesta: RichiestaAssenza) {
  const range = absenceTimeRange(richiesta);
  if (range) return ` ${range}`;
  if (richiesta.giornataIntera) return '';
  return ' · parziale';
}

function StatoBadge({ stato }: { stato: StatoRichiestaAssenza }) {
  return (
    <span
      className={`assenza-status-badge assenza-status-badge--${stato.toLowerCase().replace('_', '-')}`}
    >
      {statoLabels[stato]}
    </span>
  );
}

function formatDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString('it-IT');
}

function canDriverCancel(richiesta: RichiestaAssenza) {
  if (richiesta.origine === 'GESTIONALE') {
    return false;
  }
  if (richiesta.stato !== 'IN_ATTESA' && richiesta.stato !== 'APPROVATA') {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dataInizio = new Date(`${richiesta.dataInizio}T00:00:00`);
  return today.getTime() <= dataInizio.getTime();
}

export function LeMieAssenzePanel() {
  const [tipiAssenza, setTipiAssenza] = useState<TipoAssenza[]>([]);
  const [richieste, setRichieste] = useState<RichiestaAssenza[]>([]);
  const [saldi, setSaldi] = useState<SaldoAssenza[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<AssenzeViewMode>('calendario');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const meResponse = await fetch('/api/auth/me', { cache: 'no-store' });
      const mePayload = await meResponse.json().catch(() => ({})) as AssenzaSessionUser;
      if (!meResponse.ok || !mePayload.id) {
        throw new Error('Impossibile identificare il driver per caricare i saldi');
      }
      const [tipiResponse, richiesteResponse, saldiResponse] = await Promise.all([
        fetch('/api/tipi-assenza', { cache: 'no-store' }),
        fetch('/api/richieste-assenza', { cache: 'no-store' }),
        fetch(`/api/driver/${mePayload.id}/saldi`, { cache: 'no-store' })
      ]);
      const tipiPayload = await tipiResponse.json().catch(() => []);
      const richiestePayload = await richiesteResponse.json().catch(() => []);
      const saldiPayload = await saldiResponse.json().catch(() => ({}));
      if (!tipiResponse.ok) {
        throw new Error(tipiPayload?.message ?? 'Impossibile caricare i tipi di assenza');
      }
      if (!richiesteResponse.ok) {
        throw new Error(richiestePayload?.message ?? 'Impossibile caricare le richieste');
      }
      if (!saldiResponse.ok) {
        throw new Error(saldiPayload?.message ?? 'Impossibile caricare i saldi');
      }
      setTipiAssenza(tipiPayload);
      setRichieste(richiestePayload);
      setSaldi(saldiPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tipoSelezionato = useMemo(
    () => tipiAssenza.find((tipo) => String(tipo.id) === form.tipoAssenzaId) ?? null,
    [tipiAssenza, form.tipoAssenzaId]
  );

  const richiedeOrario = tipoSelezionato ? (tipoSelezionato.richiedeOrario || !form.giornataIntera) : !form.giornataIntera;

  const inAttesaCount = richieste.filter((r) => r.stato === 'IN_ATTESA').length;

  const prossimaAssenza = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return richieste
      .filter((r) => r.stato === 'APPROVATA' && new Date(`${r.dataInizio}T00:00:00`).getTime() >= today.getTime())
      .sort((a, b) => a.dataInizio.localeCompare(b.dataInizio))[0] ?? null;
  }, [richieste]);

  const calendarDays = useMemo(() => calendarMonthDays(calendarMonth), [calendarMonth]);
  const calendarEntries = useMemo(() => richieste.filter((richiesta) =>
    richiesta.stato === 'APPROVATA' || richiesta.stato === 'IN_ATTESA'
  ), [richieste]);
  const calendarEntriesByDay = useMemo(() => {
    const entriesByDay = new Map<string, RichiestaAssenza[]>();
    const monthStart = localDateKey(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1));
    const monthEnd = localDateKey(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0));
    calendarEntries.forEach((richiesta) => {
      if (richiesta.dataFine < monthStart || richiesta.dataInizio > monthEnd) return;
      const start = richiesta.dataInizio < monthStart ? monthStart : richiesta.dataInizio;
      const end = richiesta.dataFine > monthEnd ? monthEnd : richiesta.dataFine;
      const day = new Date(`${start}T00:00:00`);
      while (localDateKey(day) <= end) {
        const key = localDateKey(day);
        const dayEntries = entriesByDay.get(key) ?? [];
        dayEntries.push(richiesta);
        entriesByDay.set(key, dayEntries);
        day.setDate(day.getDate() + 1);
      }
    });
    entriesByDay.forEach((dayEntries) => dayEntries.sort((left, right) =>
      left.dataInizio.localeCompare(right.dataInizio) || left.id - right.id
    ));
    return entriesByDay;
  }, [calendarEntries, calendarMonth]);

  const calendarMonthEntries = useMemo(() => Array.from(
    new Map([...calendarEntriesByDay.values()].flat().map((richiesta) => [richiesta.id, richiesta])).values()
  ), [calendarEntriesByDay]);

  const calendarLegend = useMemo(() => {
    const visibleTypes = new Map<number, { codice: string | null; nome: string | null }>();
    calendarMonthEntries.forEach((richiesta) => {
      if (visibleTypes.has(richiesta.tipoAssenzaId)) return;
      visibleTypes.set(richiesta.tipoAssenzaId, {
        codice: richiesta.tipoAssenzaCodice,
        nome: richiesta.tipoAssenzaNome
      });
    });
    return [...visibleTypes.entries()].map(([id, type]) => ({ id, ...type }));
  }, [calendarMonthEntries]);

  function moveCalendarMonth(offset: number) {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function openForm() {
    setForm(defaultForm);
    setFormOpen(true);
    setError(null);
  }

  function closeForm() {
    setFormOpen(false);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.tipoAssenzaId || !form.dataInizio || !form.dataFine) {
      setError('Compila tipologia, data di inizio e data di fine');
      return;
    }
    if (richiedeOrario && (!form.oraInizio || !form.oraFine)) {
      setError('Ora di inizio e ora di fine sono obbligatorie per questa tipologia');
      return;
    }

    const payload: NuovaRichiestaAssenzaPayload = {
      tipoAssenzaId: Number(form.tipoAssenzaId),
      dataInizio: form.dataInizio,
      dataFine: form.dataFine,
      giornataIntera: form.giornataIntera,
      oraInizio: richiedeOrario ? form.oraInizio : null,
      oraFine: richiedeOrario ? form.oraFine : null,
      motivazione: form.motivazione || null
    };

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/richieste-assenza', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const responsePayload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (responsePayload?.message === 'Esiste già una richiesta di assenza nello stesso periodo per questo driver') {
          throw new Error(driverDuplicateRequestMessage);
        }
        throw new Error(responsePayload?.message ?? 'Impossibile creare la richiesta');
      }
      setSuccess(responsePayload?.richiedeApprovazioneEccezionale
        ? 'Richiesta inviata: la quota ferie scaduta richiede conferma del Gestionale'
        : 'Richiesta inviata con successo');
      setFormOpen(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAnnulla(id: number) {
    setError(null);
    try {
      const response = await fetch(`/api/richieste-assenza/${id}/annulla`, { method: 'PATCH' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message ?? 'Impossibile annullare la richiesta');
      }
      setSuccess('Richiesta annullata');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto');
    }
  }

  return (
    <div className="assenze-panel">
      <div className="services-page-header">
        <div className="services-page-header-text">
          <h1>Le mie assenze</h1>
          <p className="services-page-subtitle">Consulta richieste e giornate pianificate</p>
        </div>
        <button type="button" className="primary-button" onClick={openForm}>
          + Nuova richiesta
        </button>
      </div>

      {error && (
        <StatusNotice tone="error">{error}</StatusNotice>
      )}
      {success && (
        <StatusNotice tone="success">{success}</StatusNotice>
      )}

      <div className="assenza-stats-grid assenza-stats-grid--driver">
        <article className="assenza-stat-card">
          <span className="assenza-stat-icon assenza-stat-icon--calendar" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <rect x="5.2" y="6.2" width="13.6" height="12.6" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.9" />
              <path d="M8.4 4.8v2.8M15.6 4.8v2.8M5.2 9.4h13.6M12 13h.01" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
          </span>
          <div className="assenza-stat-label">Richieste totali</div>
          <div className="assenza-stat-value">{richieste.length}</div>
          <div className="assenza-stat-caption">registrate nel sistema</div>
        </article>
        <article className="assenza-stat-card">
          <span className="assenza-stat-icon" aria-hidden="true">◷</span>
          <div className="assenza-stat-label">In attesa</div>
          <div className="assenza-stat-value">{inAttesaCount}</div>
          <div className="assenza-stat-caption">richieste da valutare</div>
        </article>
        <article className="assenza-stat-card">
          <span className="assenza-stat-icon assenza-stat-icon--calendar" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <rect x="5.2" y="6.2" width="13.6" height="12.6" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.9" />
              <path d="M8.4 4.8v2.8M15.6 4.8v2.8M5.2 9.4h13.6M12 13h.01" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
          </span>
          <div className="assenza-stat-label">Prossima assenza</div>
          <div className="assenza-stat-value">{prossimaAssenza ? formatDate(prossimaAssenza.dataInizio) : '—'}</div>
          <div className="assenza-stat-caption">
            {prossimaAssenza ? prossimaAssenza.tipoAssenzaNome : 'nessuna in programma'}
          </div>
        </article>
      </div>

      <section className="assenza-section assenza-saldi-section" aria-labelledby="driver-saldi-title">
        <div className="assenza-section-heading">
          <div>
            <h2 id="driver-saldi-title">I tuoi saldi</h2>
            <p>Residuo disponibile per tipologia; le ferie scadute sono indicate separatamente.</p>
          </div>
        </div>
        {saldi.length === 0 ? (
          <div className="assenza-empty-state assenza-saldi-empty">
            <strong>Saldi non disponibili</strong>
            <span>Contatta il Gestionale per verificare i tipi di assenza configurati.</span>
          </div>
        ) : (
          <div className="assenza-saldi-grid">
            {saldi.map((saldo) => (
              <article className="assenza-saldo-card" key={saldo.tipoAssenzaId}>
                <div className="assenza-saldo-heading">
                  <span className="assenza-saldo-type-mark" aria-hidden="true">{saldo.codice.slice(0, 2)}</span>
                  <div><strong>{saldo.nome}</strong><small>{saldo.unitaMisura === 'ORE' ? 'Saldo in ore' : 'Saldo in giorni'}</small></div>
                </div>
                <div className="assenza-saldo-value">
                  <strong>{saldo.saldoAnnuale ? saldo.residuoValido.toLocaleString('it-IT') : '—'}</strong>
                  <span>{saldo.saldoAnnuale ? (saldo.unitaMisura === 'ORE' ? 'ore disponibili' : 'giorni disponibili') : 'nessun monte annuale'}</span>
                </div>
                {saldo.codice === 'FER' && saldo.saldoAnnuale && (
                  <div className={saldo.residuoScaduto > 0 ? 'assenza-saldo-expired is-expired' : 'assenza-saldo-expired'}>
                    <span>Quota scaduta</span>
                    <strong>{saldo.residuoScaduto.toLocaleString('it-IT')} giorni</strong>
                  </div>
                )}
                <div className="assenza-saldo-progress" aria-hidden="true">
                  <span style={{ width: `${saldo.saldoCaricato && saldo.quantitaMaturata > 0 ? Math.min(100, (saldo.residuoValido / saldo.quantitaMaturata) * 100) : 0}%` }} />
                </div>
                <small className="assenza-saldo-footnote">
                  {!saldo.saldoAnnuale
                    ? 'Questa tipologia non prevede una quota annuale automatica.'
                    : saldo.saldoCaricato
                    ? `Maturato ${saldo.quantitaMaturata.toLocaleString('it-IT')} · utilizzato ${saldo.quantitaUtilizzata.toLocaleString('it-IT')}`
                    : `Saldo annuale ${new Date().getFullYear()}: residuo ${saldo.residuoValido.toLocaleString('it-IT')}.`}
                </small>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="assenza-section" aria-labelledby="driver-assenze-list-title">
        <div className="assenza-section-heading">
          <div>
            <h2 id="driver-assenze-list-title">Le tue assenze</h2>
            <p>Consulta a calendario le assenze approvate e le richieste in attesa, oppure visualizza l’elenco completo.</p>
          </div>
          <div className="assenza-view-switch" role="group" aria-label="Vista delle assenze">
            <button type="button" className={viewMode === 'calendario' ? 'is-active' : ''} aria-pressed={viewMode === 'calendario'} onClick={() => setViewMode('calendario')}>Calendario</button>
            <button type="button" className={viewMode === 'elenco' ? 'is-active' : ''} aria-pressed={viewMode === 'elenco'} onClick={() => setViewMode('elenco')}>Elenco</button>
          </div>
        </div>

      {loading ? (
        <div className="assenza-empty-state" role="status">Caricamento in corso...</div>
      ) : richieste.length === 0 ? (
        <div className="assenza-empty-state">
          <span className="assenza-empty-icon" aria-hidden="true">▣</span>
          <strong>Nessuna richiesta di assenza presente.</strong>
          <span>Quando invierai una richiesta, la troverai qui.</span>
        </div>
      ) : viewMode === 'calendario' ? (
        <div className="assenza-calendar" aria-label="Calendario delle tue assenze">
          <div className="assenza-calendar-toolbar">
            <button type="button" className="assenza-calendar-nav" aria-label="Mese precedente" onClick={() => moveCalendarMonth(-1)}>‹</button>
            <h3>{formatCalendarMonth(calendarMonth)}</h3>
            <button type="button" className="assenza-calendar-nav" aria-label="Mese successivo" onClick={() => moveCalendarMonth(1)}>›</button>
          </div>
          <div className="assenza-calendar-grid-scroll">
            <div className="assenza-calendar-weekdays" aria-hidden="true">
              {calendarWeekdays.map((day) => <span key={day}>{day}</span>)}
            </div>
            <div className="assenza-calendar-grid">
              {calendarDays.map((day) => {
                const key = localDateKey(day);
                const dayEntries = calendarEntriesByDay.get(key) ?? [];
                const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
                return (
                  <article key={key} className={`assenza-calendar-day${isCurrentMonth ? '' : ' is-outside'}`}>
                    <span className="assenza-calendar-day-number">{day.getDate()}</span>
                    <div className="assenza-calendar-events">
                      {dayEntries.slice(0, 3).map((richiesta) => (
                        <div
                          key={richiesta.id}
                          className={`assenza-calendar-event ${calendarCategoryClass(richiesta.tipoAssenzaCodice)}`}
                          title={`${richiesta.tipoAssenzaNome ?? richiesta.tipoAssenzaCodice ?? 'Assenza'} · ${statoLabels[richiesta.stato]}${calendarTimeLabel(richiesta)}`}
                        >
                          <span>{richiesta.tipoAssenzaNome ?? richiesta.tipoAssenzaCodice ?? 'Assenza'}{calendarTimeLabel(richiesta)}</span>
                          {richiesta.stato === 'IN_ATTESA' && <small>In attesa</small>}
                        </div>
                      ))}
                      {dayEntries.length > 3 && <span className="assenza-calendar-more">+{dayEntries.length - 3} altre</span>}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
          <div className="assenza-calendar-legend" aria-label="Legenda tipologie di assenza">
            {calendarLegend.map((type) => (
              <span key={type.id}><i className={`assenza-calendar-legend-dot ${calendarCategoryClass(type.codice)}`} />{type.nome ?? type.codice ?? 'Assenza'}</span>
            ))}
            <span><i className="assenza-calendar-legend-dot assenza-calendar-legend-dot--pending" />Richiesta in attesa</span>
          </div>
          {calendarMonthEntries.length === 0 && (
            <p className="assenza-calendar-empty">In questo mese non ci sono assenze approvate o richieste in attesa.</p>
          )}
        </div>
      ) : (
        <ul className="assenza-request-list assenza-request-list--driver">
          {richieste.map((richiesta) => (
            <li key={richiesta.id} className="assenza-request-card">
              <div className="assenza-request-card-header">
                <div className="assenza-request-title-wrap">
                  <span className="assenza-request-avatar" aria-hidden="true">{richiesta.tipoAssenzaCodice?.slice(0, 2) ?? 'AS'}</span>
                  <div>
                    <strong className="assenza-request-title">{richiesta.tipoAssenzaNome ?? richiesta.tipoAssenzaCodice}</strong>
                    <span className="assenza-request-reference">ASS-{String(richiesta.id).padStart(3, '0')}</span>
                  </div>
                </div>
                <StatoBadge stato={richiesta.stato} />
              </div>
              <div className="assenza-request-details">
                <div>
                  <span className="assenza-detail-label">Tipologia</span>
                  <strong>{richiesta.tipoAssenzaNome ?? richiesta.tipoAssenzaCodice}</strong>
                </div>
                <div>
                  <span className="assenza-detail-label">Periodo</span>
                  <strong>{formatDate(richiesta.dataInizio)} — {formatDate(richiesta.dataFine)}</strong>
                </div>
                {absenceTimeRange(richiesta) && (
                  <div>
                    <span className="assenza-detail-label">Orario</span>
                    <strong>{absenceTimeRange(richiesta)}</strong>
                  </div>
                )}
              </div>
              {richiesta.richiedeApprovazioneEccezionale && (
                <StatusNotice tone="warning">
                  La richiesta usa quota ferie scaduta e richiede una conferma esplicita del Gestionale.
                </StatusNotice>
              )}
              {richiesta.motivazione && (
                <p className="assenza-request-note">{richiesta.motivazione}</p>
              )}
              {richiesta.stato === 'RIFIUTATA' && richiesta.motivoRifiuto && (
                <p className="assenza-request-rejection">Motivo rifiuto: {richiesta.motivoRifiuto}</p>
              )}
              {richiesta.origine === 'GESTIONALE' && (
                <span className="assenza-origin-label">Inserita dal Gestionale</span>
              )}
              {canDriverCancel(richiesta) && (
                <button
                  type="button"
                  className="secondary-button compact-button assenza-cancel-button"
                  onClick={() => handleAnnulla(richiesta.id)}
                >
                  Annulla richiesta
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      </section>

      {formOpen && (
        <div className="tenant-modal-overlay" role="dialog" aria-modal="true" aria-label="Nuova richiesta di assenza">
          <article className="tenant-modal-card" style={{ width: 'min(480px, 100%)' }}>
            <div className="tenant-modal-header">
              <div>
                <h3>Nuova richiesta di assenza</h3>
                <p>I campi richiesti dipendono dalla tipologia selezionata.</p>
              </div>
              <button
                type="button"
                className="tenant-modal-close"
                aria-label="Chiudi finestra nuova richiesta"
                onClick={closeForm}
              >
                ×
              </button>
            </div>

            <form className="driver-form-modal" onSubmit={handleSubmit}>
              <div className="driver-form-grid driver-form-grid--two-col">
                <label className="driver-form-field driver-form-field--full-width">
                  <span>Tipologia</span>
                  <select
                    className="form-input"
                    value={form.tipoAssenzaId}
                    onChange={(event) => setForm((prev) => ({ ...prev, tipoAssenzaId: event.target.value }))}
                    required
                  >
                    <option value="">Seleziona...</option>
                    {tipiAssenza
                      .filter((tipo) => tipo.origineDriverConsentita)
                      .map((tipo) => (
                        <option key={tipo.id} value={tipo.id}>
                          {tipo.nome}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="driver-form-field driver-form-field--full-width">
                  <span>Durata</span>
                  <select
                    className="form-input"
                    value={form.giornataIntera ? 'intera' : 'parziale'}
                    onChange={(event) => setForm((prev) => ({ ...prev, giornataIntera: event.target.value === 'intera' }))}
                  >
                    <option value="intera">Giornata intera</option>
                    <option value="parziale">Parziale (con orario)</option>
                  </select>
                </label>

                <label className="driver-form-field">
                  <span>Dal</span>
                  <input
                    className="form-input"
                    type="date"
                    value={form.dataInizio}
                    onChange={(event) => setForm((prev) => ({ ...prev, dataInizio: event.target.value }))}
                    required
                  />
                </label>

                <label className="driver-form-field">
                  <span>Al</span>
                  <input
                    className="form-input"
                    type="date"
                    value={form.dataFine}
                    onChange={(event) => setForm((prev) => ({ ...prev, dataFine: event.target.value }))}
                    required
                  />
                </label>

                {richiedeOrario && (
                  <>
                    <label className="driver-form-field">
                      <span>Ora inizio</span>
                      <input
                        className="form-input"
                        type="time"
                        value={form.oraInizio}
                        onChange={(event) => setForm((prev) => ({ ...prev, oraInizio: event.target.value }))}
                        required
                      />
                    </label>
                    <label className="driver-form-field">
                      <span>Ora fine</span>
                      <input
                        className="form-input"
                        type="time"
                        value={form.oraFine}
                        onChange={(event) => setForm((prev) => ({ ...prev, oraFine: event.target.value }))}
                        required
                      />
                    </label>
                  </>
                )}

                <label className="driver-form-field driver-form-field--full-width">
                  <span>Motivazione (facoltativa)</span>
                  <textarea
                    className="form-input"
                    value={form.motivazione}
                    onChange={(event) => setForm((prev) => ({ ...prev, motivazione: event.target.value }))}
                    rows={3}
                  />
                </label>
              </div>

              <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="secondary-button" onClick={closeForm} disabled={submitting}>
                  Annulla
                </button>
                <button type="submit" className="primary-button" disabled={submitting}>
                  Invia richiesta
                </button>
              </div>
            </form>
          </article>
        </div>
      )}
    </div>
  );
}
