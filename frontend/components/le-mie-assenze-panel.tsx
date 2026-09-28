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

const statoColors: Record<StatoRichiestaAssenza, { background: string; color: string }> = {
  BOZZA: { background: '#eceff1', color: '#455a64' },
  IN_ATTESA: { background: '#fff3e0', color: '#e65100' },
  APPROVATA: { background: '#e8f5e9', color: '#2e7d32' },
  RIFIUTATA: { background: '#ffebee', color: '#c62828' },
  ANNULLATA: { background: '#eceff1', color: '#616161' }
};

function StatoBadge({ stato }: { stato: StatoRichiestaAssenza }) {
  const style = statoColors[stato];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 12,
        fontSize: '0.75rem',
        fontWeight: 600,
        background: style.background,
        color: style.color
      }}
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

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', margin: '16px 0' }}>
        <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 12, minWidth: 160 }}>
          <div style={{ fontSize: '0.8rem', color: '#616161' }}>In attesa</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{inAttesaCount}</div>
          <div style={{ fontSize: '0.75rem', color: '#9e9e9e' }}>richieste da valutare</div>
        </div>
        <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 12, minWidth: 160 }}>
          <div style={{ fontSize: '0.8rem', color: '#616161' }}>Prossima assenza</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {prossimaAssenza ? formatDate(prossimaAssenza.dataInizio) : '-'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#9e9e9e' }}>
            {prossimaAssenza ? prossimaAssenza.tipoAssenzaNome : 'nessuna in programma'}
          </div>
        </div>
      </div>

      {loading ? (
        <p>Caricamento in corso...</p>
      ) : richieste.length === 0 ? (
        <p>Nessuna richiesta di assenza presente.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {richieste.map((richiesta) => (
            <li key={richiesta.id} style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{richiesta.tipoAssenzaNome ?? richiesta.tipoAssenzaCodice}</strong>
                <StatoBadge stato={richiesta.stato} />
              </div>
              <div style={{ fontSize: '0.85rem', color: '#616161', marginTop: 4 }}>
                {formatDate(richiesta.dataInizio)} — {formatDate(richiesta.dataFine)}
              </div>
              {richiesta.motivazione && (
                <div style={{ fontSize: '0.85rem', color: '#757575', marginTop: 4 }}>{richiesta.motivazione}</div>
              )}
              {richiesta.stato === 'RIFIUTATA' && richiesta.motivoRifiuto && (
                <div style={{ fontSize: '0.85rem', color: '#c62828', marginTop: 4 }}>
                  Motivo rifiuto: {richiesta.motivoRifiuto}
                </div>
              )}
              {richiesta.origine === 'GESTIONALE' && (
                <div style={{ fontSize: '0.75rem', color: '#1565c0', marginTop: 4 }}>Inserita dal Gestionale</div>
              )}
              {canDriverCancel(richiesta) && (
                <button
                  type="button"
                  className="secondary-button"
                  style={{ marginTop: 8 }}
                  onClick={() => handleAnnulla(richiesta.id)}
                >
                  Annulla richiesta
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {formOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{ background: '#fff', borderRadius: 8, padding: 24, width: 420, maxWidth: '90vw' }}
          >
            <h2 style={{ marginTop: 0 }}>Nuova richiesta di assenza</h2>
            <p style={{ fontSize: '0.85rem', color: '#757575' }}>
              I campi richiesti dipendono dalla tipologia selezionata.
            </p>

            <label style={{ display: 'block', marginTop: 12 }}>
              Tipologia
              <select
                value={form.tipoAssenzaId}
                onChange={(event) => setForm((prev) => ({ ...prev, tipoAssenzaId: event.target.value }))}
                required
                style={{ display: 'block', width: '100%', marginTop: 4 }}
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

            <label style={{ display: 'block', marginTop: 12 }}>
              Durata
              <select
                value={form.giornataIntera ? 'intera' : 'parziale'}
                onChange={(event) => setForm((prev) => ({ ...prev, giornataIntera: event.target.value === 'intera' }))}
                style={{ display: 'block', width: '100%', marginTop: 4 }}
              >
                <option value="intera">Giornata intera</option>
                <option value="parziale">Parziale (con orario)</option>
              </select>
            </label>

            <label style={{ display: 'block', marginTop: 12 }}>
              Dal
              <input
                type="date"
                value={form.dataInizio}
                onChange={(event) => setForm((prev) => ({ ...prev, dataInizio: event.target.value }))}
                required
                style={{ display: 'block', width: '100%', marginTop: 4 }}
              />
            </label>

            <label style={{ display: 'block', marginTop: 12 }}>
              Al
              <input
                type="date"
                value={form.dataFine}
                onChange={(event) => setForm((prev) => ({ ...prev, dataFine: event.target.value }))}
                required
                style={{ display: 'block', width: '100%', marginTop: 4 }}
              />
            </label>

            {richiedeOrario && (
              <>
                <label style={{ display: 'block', marginTop: 12 }}>
                  Ora inizio
                  <input
                    type="time"
                    value={form.oraInizio}
                    onChange={(event) => setForm((prev) => ({ ...prev, oraInizio: event.target.value }))}
                    required
                    style={{ display: 'block', width: '100%', marginTop: 4 }}
                  />
                </label>
                <label style={{ display: 'block', marginTop: 12 }}>
                  Ora fine
                  <input
                    type="time"
                    value={form.oraFine}
                    onChange={(event) => setForm((prev) => ({ ...prev, oraFine: event.target.value }))}
                    required
                    style={{ display: 'block', width: '100%', marginTop: 4 }}
                  />
                </label>
              </>
            )}

            <label style={{ display: 'block', marginTop: 12 }}>
              Motivazione (facoltativa)
              <textarea
                value={form.motivazione}
                onChange={(event) => setForm((prev) => ({ ...prev, motivazione: event.target.value }))}
                style={{ display: 'block', width: '100%', marginTop: 4 }}
              />
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button type="button" className="secondary-button" onClick={closeForm} disabled={submitting}>
                Annulla
              </button>
              <button type="submit" className="primary-button" disabled={submitting}>
                Invia richiesta
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
