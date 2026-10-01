"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { StatusNotice } from './status-notice';
import type {
  NuovaRichiestaAssenzaPayload,
  RichiestaAssenza,
  StatoRichiestaAssenza,
  TipoAssenza
} from '../types/absences';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [tipiResponse, richiesteResponse] = await Promise.all([
        fetch('/api/tipi-assenza', { cache: 'no-store' }),
        fetch('/api/richieste-assenza', { cache: 'no-store' })
      ]);
      const tipiPayload = await tipiResponse.json().catch(() => []);
      const richiestePayload = await richiesteResponse.json().catch(() => []);
      if (!tipiResponse.ok) {
        throw new Error(tipiPayload?.message ?? 'Impossibile caricare i tipi di assenza');
      }
      if (!richiesteResponse.ok) {
        throw new Error(richiestePayload?.message ?? 'Impossibile caricare le richieste');
      }
      setTipiAssenza(tipiPayload);
      setRichieste(richiestePayload);
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
        throw new Error(responsePayload?.message ?? 'Impossibile creare la richiesta');
      }
      setSuccess('Richiesta inviata con successo');
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

      <section className="assenza-section" aria-labelledby="driver-assenze-list-title">
        <div className="assenza-section-heading">
          <div>
            <h2 id="driver-assenze-list-title">Le tue richieste</h2>
            <p>Consulta lo stato e il periodo delle tue assenze.</p>
          </div>
          <span className="assenza-section-count">{richieste.length}</span>
        </div>

      {loading ? (
        <div className="assenza-empty-state" role="status">Caricamento in corso...</div>
      ) : richieste.length === 0 ? (
        <div className="assenza-empty-state">
          <span className="assenza-empty-icon" aria-hidden="true">▣</span>
          <strong>Nessuna richiesta di assenza presente.</strong>
          <span>Quando invierai una richiesta, la troverai qui.</span>
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
              </div>
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
