"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { FilterDropdown } from './filter-dropdown';
import { StatusNotice } from './status-notice';
import { absenceTimeRange } from '../lib/absence-time';
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
  giornataIntera: boolean;
  oraInizio: string;
  oraFine: string;
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
  giornataIntera: true,
  oraInizio: '',
  oraFine: '',
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

const statoFilterOptions = [
  { value: '', label: 'Tutte' },
  ...Object.entries(statoLabels).map(([value, label]) => ({ value, label }))
];

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
  const [statoFilter, setStatoFilter] = useState<StatoRichiestaAssenza | ''>('');

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

  const inserimentoTipo = tipiAssenza.find((tipo) => String(tipo.id) === inserimentoForm.tipoAssenzaId);
  const inserimentoRichiedeOrario = Boolean(inserimentoTipo?.richiedeOrario) || !inserimentoForm.giornataIntera;

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
    if (inserimentoRichiedeOrario && (!inserimentoForm.oraInizio || !inserimentoForm.oraFine)) {
      setError('Ora di inizio e ora di fine sono obbligatorie per questa tipologia');
      return;
    }
    const payload: InserimentoGestionalePayload = {
      driverId: Number(inserimentoForm.driverId),
      tipoAssenzaId: Number(inserimentoForm.tipoAssenzaId),
      dataInizio: inserimentoForm.dataInizio,
      dataFine: inserimentoForm.dataFine,
      giornataIntera: inserimentoForm.giornataIntera,
      oraInizio: inserimentoRichiedeOrario ? inserimentoForm.oraInizio : null,
      oraFine: inserimentoRichiedeOrario ? inserimentoForm.oraFine : null,
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
      setSuccess(responsePayload?.richiedeApprovazioneEccezionale
        ? 'Richiesta inserita in attesa di conferma: utilizza quota maturata oltre la scadenza configurata'
        : successMessage);
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
        <div className="assenza-header-actions">
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

      <div className="assenza-stats-grid assenza-stats-grid--manager">
        <article className="assenza-stat-card">
          <span className="assenza-stat-icon" aria-hidden="true">◷</span>
          <div className="assenza-stat-label">Da approvare</div>
          <div className="assenza-stat-value">{daApprovareCount}</div>
          <div className="assenza-stat-caption">richieste in attesa</div>
        </article>
        <article className="assenza-stat-card">
          <span className="assenza-stat-icon" aria-hidden="true">●</span>
          <div className="assenza-stat-label">Assenti oggi</div>
          <div className="assenza-stat-value">{assentiOggiCount}</div>
          <div className="assenza-stat-caption">assenze approvate</div>
        </article>
        <article className="assenza-stat-card">
          <span className="assenza-stat-icon" aria-hidden="true">↔</span>
          <div className="assenza-stat-label">Sganciamenti</div>
          <div className="assenza-stat-value">{sganciamentiCount}</div>
          <div className="assenza-stat-caption">approvati</div>
        </article>
      </div>

      <div className="assenza-filter-bar">
        <div className="assenza-filter-field">
          <span className="services-filter-label">Stato richiesta</span>
          <FilterDropdown
            label="Filtra per stato"
            value={statoFilter}
            options={statoFilterOptions}
            onChange={(nextValue) => setStatoFilter(nextValue as StatoRichiestaAssenza | '')}
          />
        </div>
      </div>

      {loading ? (
        <div className="assenza-empty-state" role="status">Caricamento in corso...</div>
      ) : filteredRichieste.length === 0 ? (
        <div className="assenza-empty-state">
          <span className="assenza-empty-icon" aria-hidden="true">▣</span>
          <strong>Nessuna richiesta trovata.</strong>
          <span>Le richieste del team compariranno qui.</span>
        </div>
      ) : (
        <ul className="assenza-request-list assenza-request-list--manager">
          {filteredRichieste.map((richiesta) => (
            <li key={richiesta.id} className="assenza-request-card">
              <div className="assenza-request-card-header">
                <div className="assenza-request-title-wrap">
                  <span className="assenza-request-avatar" aria-hidden="true">
                    {driverName(driverById.get(richiesta.driverId)).split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <strong className="assenza-request-title">{driverName(driverById.get(richiesta.driverId))}</strong>
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
                  <strong>{formatDate(richiesta.dataInizio)}{richiesta.dataInizio !== richiesta.dataFine ? ` — ${formatDate(richiesta.dataFine)}` : ''}</strong>
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
                  Richiesta eccezionale: utilizza quota maturata oltre la scadenza configurata e richiede conferma esplicita.
                </StatusNotice>
              )}
              {(richiesta.conflittiTurno?.length ?? 0) > 0 && (
                <div className="assenza-conflict-notice" role="status">
                  <strong>Conflitto con {richiesta.conflittiTurno?.length} servizio/i assegnato/i</strong>
                  <ul>
                    {richiesta.conflittiTurno?.map((conflitto) => (
                      <li key={conflitto.servizioId}>
                        {formatDate(conflitto.inizio.slice(0, 10))} · {conflitto.inizio.slice(11, 16)} · {conflitto.partenza} → {conflitto.destinazione}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {richiesta.motivazione && (
                <p className="assenza-request-note">{richiesta.motivazione}</p>
              )}
              {richiesta.stato === 'IN_ATTESA' && (
                <div className="assenza-request-actions">
                  <button type="button" className="primary-button compact-button" onClick={() => handleApprova(richiesta.id)}>
                    Approva
                  </button>
                  <button type="button" className="secondary-button compact-button" onClick={() => openRifiuto(richiesta.id)}>
                    Rifiuta
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {rifiutoTargetId !== null && (
        <div className="tenant-modal-overlay" role="dialog" aria-modal="true" aria-label="Rifiuta richiesta">
          <article className="tenant-modal-card" style={{ width: 'min(420px, 100%)' }}>
            <div className="tenant-modal-header">
              <div>
                <h3>Rifiuta richiesta</h3>
                <p>La motivazione sarà comunicata al dipendente.</p>
              </div>
              <button
                type="button"
                className="tenant-modal-close"
                aria-label="Chiudi finestra rifiuto"
                onClick={() => setRifiutoTargetId(null)}
              >
                ×
              </button>
            </div>
            <label className="driver-form-field">
              <span>Motivo del rifiuto</span>
              <textarea
                className="form-input"
                value={motivoRifiuto}
                onChange={(event) => setMotivoRifiuto(event.target.value)}
                placeholder="Motivo del rifiuto (obbligatorio)"
                rows={4}
              />
            </label>
            <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="secondary-button" onClick={() => setRifiutoTargetId(null)}>
                Annulla
              </button>
              <button type="button" className="primary-button" onClick={confirmRifiuto}>
                Conferma
              </button>
            </div>
          </article>
        </div>
      )}

      {inserimentoOpen && (
        <div className="tenant-modal-overlay" role="dialog" aria-modal="true" aria-label="Inserisci assenza per dipendente">
          <article className="tenant-modal-card" style={{ width: 'min(520px, 100%)' }}>
            <div className="tenant-modal-header">
              <div>
                <h3>Inserisci assenza per dipendente</h3>
                <p>L&apos;assenza sarà registrata come già approvata.</p>
              </div>
              <button
                type="button"
                className="tenant-modal-close"
                aria-label="Chiudi finestra inserimento assenza"
                onClick={() => setInserimentoOpen(false)}
              >
                ×
              </button>
            </div>

            <form className="driver-form-modal" onSubmit={handleInserimentoSubmit}>
              <div className="driver-form-grid driver-form-grid--two-col">
                <label className="driver-form-field driver-form-field--full-width">
                  <span>Driver</span>
                  <select
                    className="form-input"
                    value={inserimentoForm.driverId}
                    onChange={(event) => setInserimentoForm((prev) => ({ ...prev, driverId: event.target.value }))}
                    required
                  >
                    <option value="">Seleziona...</option>
                    {driverOptions.map((driver) => (
                      <option key={driver.driverId} value={driver.driverId}>
                        {driverName(driver)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="driver-form-field driver-form-field--full-width">
                  <span>Tipologia</span>
                  <select
                    className="form-input"
                    value={inserimentoForm.tipoAssenzaId}
                    onChange={(event) => setInserimentoForm((prev) => ({ ...prev, tipoAssenzaId: event.target.value }))}
                    required
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

                <label className="driver-form-field">
                  <span>Dal</span>
                  <input
                    className="form-input"
                    type="date"
                    value={inserimentoForm.dataInizio}
                    onChange={(event) => setInserimentoForm((prev) => ({ ...prev, dataInizio: event.target.value }))}
                    required
                  />
                </label>

                <label className="driver-form-field">
                  <span>Al</span>
                  <input
                    className="form-input"
                    type="date"
                    value={inserimentoForm.dataFine}
                    onChange={(event) => setInserimentoForm((prev) => ({ ...prev, dataFine: event.target.value }))}
                    required
                  />
                </label>

                <label className="driver-form-field driver-form-field--full-width">
                  <span>Durata</span>
                  <select
                    className="form-input"
                    value={inserimentoForm.giornataIntera ? 'intera' : 'parziale'}
                    onChange={(event) => setInserimentoForm((prev) => ({ ...prev, giornataIntera: event.target.value === 'intera' }))}
                  >
                    <option value="intera">Giornata intera</option>
                    <option value="parziale">Orario specifico</option>
                  </select>
                </label>

                {inserimentoRichiedeOrario && (
                  <>
                    <label className="driver-form-field">
                      <span>Ora inizio</span>
                      <input
                        className="form-input"
                        type="time"
                        value={inserimentoForm.oraInizio}
                        onChange={(event) => setInserimentoForm((prev) => ({ ...prev, oraInizio: event.target.value }))}
                        required
                      />
                    </label>
                    <label className="driver-form-field">
                      <span>Ora fine</span>
                      <input
                        className="form-input"
                        type="time"
                        value={inserimentoForm.oraFine}
                        onChange={(event) => setInserimentoForm((prev) => ({ ...prev, oraFine: event.target.value }))}
                        required
                      />
                    </label>
                  </>
                )}

                <label className="driver-form-field driver-form-field--full-width">
                  <span>Motivazione (facoltativa)</span>
                  <textarea
                    className="form-input"
                    value={inserimentoForm.motivazione}
                    onChange={(event) => setInserimentoForm((prev) => ({ ...prev, motivazione: event.target.value }))}
                    rows={3}
                  />
                </label>
              </div>

              <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="secondary-button" onClick={() => setInserimentoOpen(false)} disabled={submitting}>
                  Annulla
                </button>
                <button type="submit" className="primary-button" disabled={submitting}>
                  Conferma
                </button>
              </div>
            </form>
          </article>
        </div>
      )}

      {sganciamentoOpen && (
        <div className="tenant-modal-overlay" role="dialog" aria-modal="true" aria-label="Crea sganciamento">
          <article className="tenant-modal-card" style={{ width: 'min(520px, 100%)' }}>
            <div className="tenant-modal-header">
              <div>
                <h3>Crea sganciamento</h3>
                <p>Programma una sospensione aziendale senza flusso di approvazione.</p>
              </div>
              <button
                type="button"
                className="tenant-modal-close"
                aria-label="Chiudi finestra sganciamento"
                onClick={() => setSganciamentoOpen(false)}
              >
                ×
              </button>
            </div>

            <form className="driver-form-modal" onSubmit={handleSganciamentoSubmit}>
              <div className="driver-form-grid driver-form-grid--two-col">
                <label className="driver-form-field driver-form-field--full-width">
                  <span>Driver</span>
                  <select
                    className="form-input"
                    value={sganciamentoForm.driverId}
                    onChange={(event) => setSganciamentoForm((prev) => ({ ...prev, driverId: event.target.value }))}
                    required
                  >
                    <option value="">Seleziona...</option>
                    {driverOptions.map((driver) => (
                      <option key={driver.driverId} value={driver.driverId}>
                        {driverName(driver)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="driver-form-field">
                  <span>Dal</span>
                  <input
                    className="form-input"
                    type="date"
                    value={sganciamentoForm.dataInizio}
                    onChange={(event) => setSganciamentoForm((prev) => ({ ...prev, dataInizio: event.target.value }))}
                    required
                  />
                </label>

                <label className="driver-form-field">
                  <span>Al</span>
                  <input
                    className="form-input"
                    type="date"
                    value={sganciamentoForm.dataFine}
                    onChange={(event) => setSganciamentoForm((prev) => ({ ...prev, dataFine: event.target.value }))}
                    required
                  />
                </label>

                <label className="driver-form-field driver-form-field--full-width">
                  <span>Motivazione (facoltativa)</span>
                  <textarea
                    className="form-input"
                    value={sganciamentoForm.motivazione}
                    onChange={(event) => setSganciamentoForm((prev) => ({ ...prev, motivazione: event.target.value }))}
                    rows={3}
                  />
                </label>
              </div>

              <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="secondary-button" onClick={() => setSganciamentoOpen(false)} disabled={submitting}>
                  Annulla
                </button>
                <button type="submit" className="primary-button" disabled={submitting}>
                  Conferma
                </button>
              </div>
            </form>
          </article>
        </div>
      )}
    </div>
  );
}
