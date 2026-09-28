"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { StatusNotice } from './status-notice';
import type {
  DriverAssenzaOption,
  InserimentoGestionalePayload,
  RichiestaAssenza,
  StatoRichiestaAssenza,
  TipoAssenza
} from '../types/absences';

type InserimentoFormState = {
  driverId: string;
  tipoAssenzaId: string;
  dataInizio: string;
  dataFine: string;
  motivazione: string;
};

type SganciamentoFormState = {
  driverId: string;
  dataInizio: string;
  dataFine: string;
  motivazione: string;
};

const defaultInserimentoForm: InserimentoFormState = {
  driverId: '',
  tipoAssenzaId: '',
  dataInizio: '',
  dataFine: '',
  motivazione: ''
};

const defaultSganciamentoForm: SganciamentoFormState = {
  driverId: '',
  dataInizio: '',
  dataFine: '',
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

function driverName(driver: DriverAssenzaOption | undefined) {
  if (!driver) {
    return 'Driver';
  }
  return [driver.firstName, driver.lastName].filter(Boolean).join(' ') || 'Driver';
}

export function RichiesteDaApprovarePanel() {
  const [richieste, setRichieste] = useState<RichiestaAssenza[]>([]);
  const [tipiAssenza, setTipiAssenza] = useState<TipoAssenza[]>([]);
  const [driverOptions, setDriverOptions] = useState<DriverAssenzaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statoFilter, setStatoFilter] = useState<StatoRichiestaAssenza | ''>('IN_ATTESA');

  const [inserimentoOpen, setInserimentoOpen] = useState(false);
  const [inserimentoForm, setInserimentoForm] = useState<InserimentoFormState>(defaultInserimentoForm);

  const [sganciamentoOpen, setSganciamentoOpen] = useState(false);
  const [sganciamentoForm, setSganciamentoForm] = useState<SganciamentoFormState>(defaultSganciamentoForm);

  const [rifiutoTargetId, setRifiutoTargetId] = useState<number | null>(null);
  const [motivoRifiuto, setMotivoRifiuto] = useState('');

  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [richiesteResponse, tipiResponse, driversResponse] = await Promise.all([
        fetch('/api/richieste-assenza', { cache: 'no-store' }),
        fetch('/api/tipi-assenza', { cache: 'no-store' }),
        fetch('/api/richieste-assenza/driver-options', { cache: 'no-store' })
      ]);
      const richiestePayload = await richiesteResponse.json().catch(() => []);
      const tipiPayload = await tipiResponse.json().catch(() => []);
      const driversPayload = await driversResponse.json().catch(() => []);
      if (!richiesteResponse.ok) {
        throw new Error(richiestePayload?.message ?? 'Impossibile caricare le richieste');
      }
      if (!tipiResponse.ok) {
        throw new Error(tipiPayload?.message ?? 'Impossibile caricare i tipi di assenza');
      }
      if (!driversResponse.ok) {
        throw new Error(driversPayload?.message ?? 'Impossibile caricare i driver');
      }
      setRichieste(richiestePayload);
      setTipiAssenza(tipiPayload);
      setDriverOptions(driversPayload);
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

  const driverById = useMemo(() => {
    const map = new Map<number, DriverAssenzaOption>();
    driverOptions.forEach((driver) => map.set(driver.driverId, driver));
    return map;
  }, [driverOptions]);

  const filteredRichieste = useMemo(
    () => (statoFilter ? richieste.filter((r) => r.stato === statoFilter) : richieste),
    [richieste, statoFilter]
  );

  const daApprovareCount = richieste.filter((r) => r.stato === 'IN_ATTESA').length;
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  const assentiOggiCount = richieste.filter((r) => {
    if (r.stato !== 'APPROVATA') return false;
    const inizio = new Date(`${r.dataInizio}T00:00:00`);
    const fine = new Date(`${r.dataFine}T00:00:00`);
    return inizio.getTime() <= oggi.getTime() && fine.getTime() >= oggi.getTime();
  }).length;
  const sganciamentiCount = richieste.filter((r) => r.tipoAssenzaCodice === 'SGA' && r.stato === 'APPROVATA').length;

  async function handleApprova(id: number) {
    setError(null);
    try {
      const response = await fetch(`/api/richieste-assenza/${id}/approva`, { method: 'PATCH' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message ?? 'Impossibile approvare la richiesta');
      }
      setSuccess('Richiesta approvata');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto');
    }
  }

  function openRifiuto(id: number) {
    setRifiutoTargetId(id);
    setMotivoRifiuto('');
  }

  async function confirmRifiuto() {
    if (!rifiutoTargetId || !motivoRifiuto.trim()) {
      setError('Il motivo del rifiuto è obbligatorio');
      return;
    }
    setError(null);
    try {
      const response = await fetch(`/api/richieste-assenza/${rifiutoTargetId}/rifiuta`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivoRifiuto })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message ?? 'Impossibile rifiutare la richiesta');
      }
      setSuccess('Richiesta rifiutata');
      setRifiutoTargetId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto');
    }
  }

  async function handleInserimentoSubmit(event: FormEvent) {
    event.preventDefault();
    if (!inserimentoForm.driverId || !inserimentoForm.tipoAssenzaId || !inserimentoForm.dataInizio || !inserimentoForm.dataFine) {
      setError('Compila tutti i campi obbligatori');
      return;
    }
    const payload: InserimentoGestionalePayload = {
      driverId: Number(inserimentoForm.driverId),
      tipoAssenzaId: Number(inserimentoForm.tipoAssenzaId),
      dataInizio: inserimentoForm.dataInizio,
      dataFine: inserimentoForm.dataFine,
      giornataIntera: true,
      motivazione: inserimentoForm.motivazione || null
    };
    await submitInserimento(payload, 'Assenza inserita per il driver');
  }

  async function handleSganciamentoSubmit(event: FormEvent) {
    event.preventDefault();
    const sganciamento = tipiAssenza.find((tipo) => tipo.codice === 'SGA');
    if (!sganciamento || !sganciamentoForm.driverId || !sganciamentoForm.dataInizio || !sganciamentoForm.dataFine) {
      setError('Compila tutti i campi obbligatori');
      return;
    }
    const payload: InserimentoGestionalePayload = {
      driverId: Number(sganciamentoForm.driverId),
      tipoAssenzaId: sganciamento.id,
      dataInizio: sganciamentoForm.dataInizio,
      dataFine: sganciamentoForm.dataFine,
      giornataIntera: true,
      motivazione: sganciamentoForm.motivazione || null
    };
    await submitInserimento(payload, 'Sganciamento creato');
  }

  async function submitInserimento(payload: InserimentoGestionalePayload, successMessage: string) {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/richieste-assenza/inserimento-gestionale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const responsePayload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(responsePayload?.message ?? 'Impossibile completare l\'operazione');
      }
      setSuccess(successMessage);
      setInserimentoOpen(false);
      setSganciamentoOpen(false);
      setInserimentoForm(defaultInserimentoForm);
      setSganciamentoForm(defaultSganciamentoForm);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="assenze-panel">
      <div className="services-page-header">
        <div className="services-page-header-text">
          <h1>Richieste da approvare</h1>
          <p className="services-page-subtitle">Valuta le richieste del team e gestisci le assenze aziendali</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="secondary-button" onClick={() => setSganciamentoOpen(true)}>
            Sganciamento
          </button>
          <button type="button" className="primary-button" onClick={() => setInserimentoOpen(true)}>
            Inserisci assenza
          </button>
        </div>
      </div>

      {error && <StatusNotice tone="error">{error}</StatusNotice>}
      {success && <StatusNotice tone="success">{success}</StatusNotice>}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', margin: '16px 0' }}>
        <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 12, minWidth: 160 }}>
          <div style={{ fontSize: '0.8rem', color: '#616161' }}>Da approvare</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{daApprovareCount}</div>
        </div>
        <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 12, minWidth: 160 }}>
          <div style={{ fontSize: '0.8rem', color: '#616161' }}>Assenti oggi</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{assentiOggiCount}</div>
        </div>
        <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 12, minWidth: 160 }}>
          <div style={{ fontSize: '0.8rem', color: '#616161' }}>Sganciamenti</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{sganciamentiCount}</div>
        </div>
      </div>

      <label style={{ display: 'block', marginBottom: 12 }}>
        Filtra per stato
        <select
          value={statoFilter}
          onChange={(event) => setStatoFilter(event.target.value as StatoRichiestaAssenza | '')}
          style={{ display: 'block', marginTop: 4 }}
        >
          <option value="">Tutte</option>
          {Object.entries(statoLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {loading ? (
        <p>Caricamento in corso...</p>
      ) : filteredRichieste.length === 0 ? (
        <p>Nessuna richiesta trovata.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredRichieste.map((richiesta) => (
            <li key={richiesta.id} style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{driverName(driverById.get(richiesta.driverId))}</strong>
                <StatoBadge stato={richiesta.stato} />
              </div>
              <div style={{ fontSize: '0.85rem', color: '#616161', marginTop: 4 }}>
                {richiesta.tipoAssenzaNome ?? richiesta.tipoAssenzaCodice} · {formatDate(richiesta.dataInizio)} — {formatDate(richiesta.dataFine)}
              </div>
              {richiesta.motivazione && (
                <div style={{ fontSize: '0.85rem', color: '#757575', marginTop: 4 }}>{richiesta.motivazione}</div>
              )}
              {richiesta.stato === 'IN_ATTESA' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button type="button" className="primary-button" onClick={() => handleApprova(richiesta.id)}>
                    Approva
                  </button>
                  <button type="button" className="secondary-button" onClick={() => openRifiuto(richiesta.id)}>
                    Rifiuta
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {rifiutoTargetId !== null && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }}
        >
          <div style={{ background: '#fff', borderRadius: 8, padding: 24, width: 380, maxWidth: '90vw' }}>
            <h2 style={{ marginTop: 0 }}>Rifiuta richiesta</h2>
            <p style={{ fontSize: '0.85rem', color: '#757575' }}>La motivazione sarà comunicata al dipendente.</p>
            <textarea
              value={motivoRifiuto}
              onChange={(event) => setMotivoRifiuto(event.target.value)}
              placeholder="Motivo del rifiuto (obbligatorio)"
              style={{ display: 'block', width: '100%', marginTop: 8 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button type="button" className="secondary-button" onClick={() => setRifiutoTargetId(null)}>
                Annulla
              </button>
              <button type="button" className="primary-button" onClick={confirmRifiuto}>
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}

      {inserimentoOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }}
        >
          <form
            onSubmit={handleInserimentoSubmit}
            style={{ background: '#fff', borderRadius: 8, padding: 24, width: 420, maxWidth: '90vw' }}
          >
            <h2 style={{ marginTop: 0 }}>Inserisci assenza per dipendente</h2>
            <p style={{ fontSize: '0.85rem', color: '#757575' }}>L&apos;assenza sarà registrata come già approvata.</p>

            <label style={{ display: 'block', marginTop: 12 }}>
              Driver
              <select
                value={inserimentoForm.driverId}
                onChange={(event) => setInserimentoForm((prev) => ({ ...prev, driverId: event.target.value }))}
                required
                style={{ display: 'block', width: '100%', marginTop: 4 }}
              >
                <option value="">Seleziona...</option>
                {driverOptions.map((driver) => (
                  <option key={driver.driverId} value={driver.driverId}>
                    {driverName(driver)}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'block', marginTop: 12 }}>
              Tipologia
              <select
                value={inserimentoForm.tipoAssenzaId}
                onChange={(event) => setInserimentoForm((prev) => ({ ...prev, tipoAssenzaId: event.target.value }))}
                required
                style={{ display: 'block', width: '100%', marginTop: 4 }}
              >
                <option value="">Seleziona...</option>
                {tipiAssenza
                  .filter((tipo) => tipo.origineGestionaleConsentita)
                  .map((tipo) => (
                    <option key={tipo.id} value={tipo.id}>
                      {tipo.nome}
                    </option>
                  ))}
              </select>
            </label>

            <label style={{ display: 'block', marginTop: 12 }}>
              Dal
              <input
                type="date"
                value={inserimentoForm.dataInizio}
                onChange={(event) => setInserimentoForm((prev) => ({ ...prev, dataInizio: event.target.value }))}
                required
                style={{ display: 'block', width: '100%', marginTop: 4 }}
              />
            </label>

            <label style={{ display: 'block', marginTop: 12 }}>
              Al
              <input
                type="date"
                value={inserimentoForm.dataFine}
                onChange={(event) => setInserimentoForm((prev) => ({ ...prev, dataFine: event.target.value }))}
                required
                style={{ display: 'block', width: '100%', marginTop: 4 }}
              />
            </label>

            <label style={{ display: 'block', marginTop: 12 }}>
              Motivazione (facoltativa)
              <textarea
                value={inserimentoForm.motivazione}
                onChange={(event) => setInserimentoForm((prev) => ({ ...prev, motivazione: event.target.value }))}
                style={{ display: 'block', width: '100%', marginTop: 4 }}
              />
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button type="button" className="secondary-button" onClick={() => setInserimentoOpen(false)} disabled={submitting}>
                Annulla
              </button>
              <button type="submit" className="primary-button" disabled={submitting}>
                Conferma
              </button>
            </div>
          </form>
        </div>
      )}

      {sganciamentoOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }}
        >
          <form
            onSubmit={handleSganciamentoSubmit}
            style={{ background: '#fff', borderRadius: 8, padding: 24, width: 420, maxWidth: '90vw' }}
          >
            <h2 style={{ marginTop: 0 }}>Crea sganciamento</h2>
            <p style={{ fontSize: '0.85rem', color: '#757575' }}>
              Programma una sospensione aziendale senza flusso di approvazione.
            </p>

            <label style={{ display: 'block', marginTop: 12 }}>
              Driver
              <select
                value={sganciamentoForm.driverId}
                onChange={(event) => setSganciamentoForm((prev) => ({ ...prev, driverId: event.target.value }))}
                required
                style={{ display: 'block', width: '100%', marginTop: 4 }}
              >
                <option value="">Seleziona...</option>
                {driverOptions.map((driver) => (
                  <option key={driver.driverId} value={driver.driverId}>
                    {driverName(driver)}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'block', marginTop: 12 }}>
              Dal
              <input
                type="date"
                value={sganciamentoForm.dataInizio}
                onChange={(event) => setSganciamentoForm((prev) => ({ ...prev, dataInizio: event.target.value }))}
                required
                style={{ display: 'block', width: '100%', marginTop: 4 }}
              />
            </label>

            <label style={{ display: 'block', marginTop: 12 }}>
              Al
              <input
                type="date"
                value={sganciamentoForm.dataFine}
                onChange={(event) => setSganciamentoForm((prev) => ({ ...prev, dataFine: event.target.value }))}
                required
                style={{ display: 'block', width: '100%', marginTop: 4 }}
              />
            </label>

            <label style={{ display: 'block', marginTop: 12 }}>
              Motivazione (facoltativa)
              <textarea
                value={sganciamentoForm.motivazione}
                onChange={(event) => setSganciamentoForm((prev) => ({ ...prev, motivazione: event.target.value }))}
                style={{ display: 'block', width: '100%', marginTop: 4 }}
              />
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button type="button" className="secondary-button" onClick={() => setSganciamentoOpen(false)} disabled={submitting}>
                Annulla
              </button>
              <button type="submit" className="primary-button" disabled={submitting}>
                Conferma
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
