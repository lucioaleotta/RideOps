"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AddIcon, ButtonContent, EditIcon, JournalIcon, SaveIcon } from './action-icons';
import { StatusNotice } from './status-notice';

type UnitaMisura = 'GIORNI' | 'ORE';
type TipoAssenza = {
  id: number;
  codice: string;
  nome: string;
  unitaMisura: UnitaMisura;
  origineDriverConsentita: boolean;
  origineGestionaleConsentita: boolean;
  richiedeOrario: boolean;
  richiedeDocumentoDefault: boolean;
  scalaDaMonteOreDefault: boolean;
  preavvisoMinimoGiorniDefault: number;
  numeroGiorniAnnuiDefault: number | null;
  numeroGiorniMalattiaAnnuiDefault: number | null;
  scadenzaFerieMesiDefault: number | null;
  attivo: boolean;
};

type AuditEntry = {
  id: number;
  adminUserId: string;
  tipoAssenzaId: number | null;
  codice: string;
  azione: 'CREATO' | 'MODIFICATO' | 'DISATTIVATO';
  valoriPrecedenti: string | null;
  valoriNuovi: string;
  creatoIl: string;
};

type FormState = Omit<TipoAssenza, 'id' | 'attivo'>;

const emptyForm: FormState = {
  codice: '',
  nome: '',
  unitaMisura: 'GIORNI',
  origineDriverConsentita: true,
  origineGestionaleConsentita: true,
  richiedeOrario: false,
  richiedeDocumentoDefault: false,
  scalaDaMonteOreDefault: false,
  preavvisoMinimoGiorniDefault: 0,
  numeroGiorniAnnuiDefault: null,
  numeroGiorniMalattiaAnnuiDefault: null,
  scadenzaFerieMesiDefault: null
};

async function payload<T>(response: Response): Promise<T> {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof result?.message === 'string' ? result.message : 'Operazione non riuscita');
  }
  return result as T;
}

function toForm(tipo: TipoAssenza): FormState {
  const { id: _id, attivo: _attivo, ...values } = tipo;
  return values;
}

function numberOrNull(value: string) {
  return value === '' ? null : Number(value);
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
}

function snapshotSummary(raw: string | null) {
  if (!raw) return '—';
  try {
    const snapshot = JSON.parse(raw) as Partial<TipoAssenza>;
    return [
      snapshot.nome,
      snapshot.numeroGiorniAnnuiDefault !== null && snapshot.numeroGiorniAnnuiDefault !== undefined
        ? `${snapshot.numeroGiorniAnnuiDefault} ${snapshot.unitaMisura === 'ORE' ? 'ore' : 'giorni'}`
        : null,
      snapshot.preavvisoMinimoGiorniDefault !== undefined ? `preavviso ${snapshot.preavvisoMinimoGiorniDefault} gg` : null,
      snapshot.attivo === false ? 'disattivo' : null
    ].filter(Boolean).join(' · ') || 'Valori piattaforma';
  } catch {
    return raw;
  }
}

function SwitchField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="admin-assenze-switch">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="admin-assenze-switch-track" aria-hidden="true" />
    </label>
  );
}

export function AdminTipiAssenzaPanel() {
  const [tipi, setTipi] = useState<TipoAssenza[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TipoAssenza | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filter, setFilter] = useState<'TUTTI' | 'ATTIVI' | 'DISATTIVI'>('TUTTI');

  const visibleTypes = useMemo(() => tipi.filter((tipo) => {
    if (filter === 'ATTIVI') return tipo.attivo;
    if (filter === 'DISATTIVI') return !tipo.attivo;
    return true;
  }), [filter, tipi]);

  async function loadTypes() {
    setLoading(true);
    try {
      setTipi(await payload<TipoAssenza[]>(await fetch('/api/tipi-assenza', { cache: 'no-store' })));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Impossibile caricare i tipi di assenza');
    } finally {
      setLoading(false);
    }
  }

  async function loadAudit() {
    setAuditLoading(true);
    try {
      setAudit(await payload<AuditEntry[]>(await fetch('/api/tipi-assenza/audit', { cache: 'no-store' })));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Impossibile caricare lo storico');
    } finally {
      setAuditLoading(false);
    }
  }

  useEffect(() => {
    void loadTypes();
  }, []);

  useEffect(() => {
    if (auditOpen) void loadAudit();
  }, [auditOpen]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setSuccess(null);
    setModalOpen(true);
  }

  function openEdit(tipo: TipoAssenza) {
    setEditing(tipo);
    setForm(toForm(tipo));
    setError(null);
    setSuccess(null);
    setModalOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    const method = editing ? 'PATCH' : 'POST';
    const url = editing ? `/api/tipi-assenza/${editing.id}` : '/api/tipi-assenza';
    const body = editing
      ? {
          nome: form.nome,
          unitaMisura: form.unitaMisura,
          richiedeOrario: form.richiedeOrario,
          richiedeDocumentoDefault: form.richiedeDocumentoDefault,
          scalaDaMonteOreDefault: form.scalaDaMonteOreDefault,
          preavvisoMinimoGiorniDefault: form.preavvisoMinimoGiorniDefault,
          numeroGiorniAnnuiDefault: form.numeroGiorniAnnuiDefault,
          numeroGiorniMalattiaAnnuiDefault: form.numeroGiorniMalattiaAnnuiDefault,
          scadenzaFerieMesiDefault: form.scadenzaFerieMesiDefault
        }
      : form;

    try {
      const saved = await payload<TipoAssenza>(await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }));
      setTipi((current) => editing
        ? current.map((item) => item.id === saved.id ? saved : item)
        : [...current, saved].sort((a, b) => a.nome.localeCompare(b.nome, 'it')));
      setModalOpen(false);
      setSuccess(editing ? `Default di ${saved.nome} aggiornati` : `Tipo ${saved.nome} creato`);
      if (auditOpen) await loadAudit();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Salvataggio non riuscito');
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(tipo: TipoAssenza) {
    if (!window.confirm(`Disattivare il tipo “${tipo.nome}”? Le richieste storiche rimarranno disponibili.`)) return;
    setBusyId(tipo.id);
    setError(null);
    setSuccess(null);
    try {
      const saved = await payload<TipoAssenza>(await fetch(`/api/tipi-assenza/${tipo.id}/disattiva`, { method: 'PATCH' }));
      setTipi((current) => current.map((item) => item.id === saved.id ? saved : item));
      setSuccess(`${saved.nome} disattivato`);
      if (auditOpen) await loadAudit();
    } catch (disableError) {
      setError(disableError instanceof Error ? disableError.message : 'Impossibile disattivare il tipo');
    } finally {
      setBusyId(null);
    }
  }

  function updateForm<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <main className="admin-page admin-assenze-page">
      <header className="admin-page-header">
        <span className="admin-page-header-icon admin-assenze-header-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="5.5" width="16" height="15" rx="2" />
            <path d="M8 3.5v4M16 3.5v4M4 9.5h16M8 13h3M8 16h6" />
          </svg>
        </span>
        <div className="admin-page-header-text">
          <span className="admin-assenze-eyebrow">CONFIGURAZIONI PIATTAFORMA</span>
          <h1 className="admin-page-title">Gestione tipi di assenza</h1>
          <p className="admin-page-subtitle">Modifica i default globali. Le personalizzazioni dei tenant e dei driver già esistenti restano invariate.</p>
        </div>
      </header>

      {error && <StatusNotice tone="error">{error}</StatusNotice>}
      {success && <StatusNotice tone="success">{success}</StatusNotice>}

      <section className="admin-assenze-summary">
        <article className="admin-assenze-summary-card">
          <span className="admin-assenze-summary-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7h16M4 12h16M4 17h16" /></svg></span>
          <span>Tipi totali</span><strong>{tipi.length}</strong>
        </article>
        <article className="admin-assenze-summary-card">
          <span className="admin-assenze-summary-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m5 12 4 4L19 6" /></svg></span>
          <span>Attivi</span><strong>{tipi.filter((tipo) => tipo.attivo).length}</strong>
        </article>
        <article className="admin-assenze-summary-card">
          <span className="admin-assenze-summary-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></svg></span>
          <span>Preavviso medio</span><strong>{tipi.length ? Math.round(tipi.reduce((sum, tipo) => sum + tipo.preavvisoMinimoGiorniDefault, 0) / tipi.length) : 0} gg</strong>
        </article>
      </section>

      <section className="dashboard-card admin-assenze-catalog">
        <div className="admin-assenze-toolbar">
          <div>
            <h2>Catalogo piattaforma</h2>
            <p>I valori vengono ereditati dai tenant solo quando non hanno una configurazione propria.</p>
          </div>
          <button type="button" className="primary-button" onClick={openCreate}>
            <ButtonContent icon={<AddIcon />}>Nuovo tipo</ButtonContent>
          </button>
        </div>

        <div className="admin-assenze-filters" role="group" aria-label="Filtra tipi di assenza">
          {(['TUTTI', 'ATTIVI', 'DISATTIVI'] as const).map((value) => (
            <button key={value} type="button" className={filter === value ? 'is-active' : ''} onClick={() => setFilter(value)}>
              {value === 'TUTTI' ? 'Tutti' : value === 'ATTIVI' ? 'Attivi' : 'Disattivi'}
            </button>
          ))}
        </div>

        {loading ? <div className="admin-assenze-empty" role="status">Caricamento catalogo...</div> : visibleTypes.length === 0 ? (
          <div className="admin-assenze-empty">Nessun tipo presente per questo filtro.</div>
        ) : (
          <div className="admin-assenze-table-wrap">
            <table className="admin-assenze-table">
              <thead><tr><th>Tipo</th><th>Unità</th><th>Valori annuali / comporto</th><th>Preavviso</th><th>Opzioni</th><th>Stato</th><th>Azioni</th></tr></thead>
              <tbody>
                {visibleTypes.map((tipo) => (
                  <tr key={tipo.id} className={!tipo.attivo ? 'is-disabled' : ''}>
                    <td><span className="admin-assenze-type-cell"><span className="admin-assenze-type-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="4" y="5.5" width="16" height="15" rx="2"/><path d="M8 3.5v4M16 3.5v4M4 9.5h16"/></svg></span><span><strong>{tipo.nome}</strong><small>{tipo.codice}</small></span></span></td>
                    <td>{tipo.unitaMisura === 'ORE' ? 'Ore' : 'Giorni'}</td>
                    <td>{tipo.numeroGiorniAnnuiDefault !== null ? `${tipo.numeroGiorniAnnuiDefault} ${tipo.unitaMisura === 'ORE' ? 'ore' : 'giorni'}` : tipo.numeroGiorniMalattiaAnnuiDefault !== null ? `${tipo.numeroGiorniMalattiaAnnuiDefault} giorni comporto` : 'Nessun tetto'}</td>
                    <td>{tipo.preavvisoMinimoGiorniDefault} {tipo.preavvisoMinimoGiorniDefault === 1 ? 'giorno' : 'giorni'}</td>
                    <td><span className="admin-assenze-chip-row">{tipo.richiedeOrario && <span>Orario</span>}{tipo.richiedeDocumentoDefault && <span>Documento</span>}{tipo.scalaDaMonteOreDefault && <span>Monte ore</span>}{!tipo.richiedeOrario && !tipo.richiedeDocumentoDefault && !tipo.scalaDaMonteOreDefault && <span>Nessuna</span>}</span></td>
                    <td><span className={tipo.attivo ? 'admin-assenze-state is-active' : 'admin-assenze-state'}>{tipo.attivo ? 'Attivo' : 'Disattivo'}</span></td>
                    <td><div className="admin-assenze-actions"><button type="button" className="secondary-button compact-button" onClick={() => openEdit(tipo)} aria-label={`Modifica ${tipo.nome}`}><EditIcon /> Modifica</button>{tipo.attivo && <button type="button" className="admin-assenze-deactivate" onClick={() => void deactivate(tipo)} disabled={busyId === tipo.id}>{busyId === tipo.id ? '...' : 'Disattiva'}</button>}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="admin-assenze-mobile-list">
          {visibleTypes.map((tipo) => (
            <article className={`admin-assenze-mobile-card${tipo.attivo ? '' : ' is-disabled'}`} key={tipo.id}>
              <header><div className="admin-assenze-type-cell"><span className="admin-assenze-type-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="4" y="5.5" width="16" height="15" rx="2"/><path d="M8 3.5v4M16 3.5v4M4 9.5h16"/></svg></span><span><strong>{tipo.nome}</strong><small>{tipo.codice} · {tipo.unitaMisura === 'ORE' ? 'Ore' : 'Giorni'}</small></span></div><span className={tipo.attivo ? 'admin-assenze-state is-active' : 'admin-assenze-state'}>{tipo.attivo ? 'Attivo' : 'Disattivo'}</span></header>
              <div className="admin-assenze-mobile-data"><span>Default annuo</span><strong>{tipo.numeroGiorniAnnuiDefault !== null ? `${tipo.numeroGiorniAnnuiDefault} ${tipo.unitaMisura === 'ORE' ? 'ore' : 'giorni'}` : tipo.numeroGiorniMalattiaAnnuiDefault !== null ? `${tipo.numeroGiorniMalattiaAnnuiDefault} gg comporto` : 'Nessun tetto'}</strong><span>Preavviso minimo</span><strong>{tipo.preavvisoMinimoGiorniDefault} gg</strong></div>
              <footer><button type="button" className="secondary-button compact-button" onClick={() => openEdit(tipo)}><EditIcon /> Modifica</button>{tipo.attivo && <button type="button" className="admin-assenze-deactivate" onClick={() => void deactivate(tipo)} disabled={busyId === tipo.id}>Disattiva</button>}</footer>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-card admin-assenze-audit">
        <button type="button" className="admin-assenze-audit-toggle" onClick={() => setAuditOpen((open) => !open)} aria-expanded={auditOpen}>
          <span><JournalIcon /><span><strong>Storico modifiche</strong><small>Audit dei default di piattaforma, con valori prima e dopo</small></span></span>
          <span aria-hidden="true">{auditOpen ? '−' : '+'}</span>
        </button>
        {auditOpen && (auditLoading ? <div className="admin-assenze-empty">Caricamento storico...</div> : audit.length === 0 ? <div className="admin-assenze-empty">Nessuna modifica registrata.</div> : (
          <div className="admin-assenze-audit-list">
            {audit.map((entry) => (
              <article key={entry.id} className="admin-assenze-audit-entry">
                <div className="admin-assenze-audit-title"><span className={`admin-assenze-audit-action action-${entry.azione.toLowerCase()}`}>{entry.azione}</span><strong>{entry.codice}</strong><span>{formatDate(entry.creatoIl)}</span></div>
                <div className="admin-assenze-audit-by">Operatore: {entry.adminUserId}</div>
                <div className="admin-assenze-audit-diff"><span><small>Prima</small>{snapshotSummary(entry.valoriPrecedenti)}</span><span><small>Dopo</small>{snapshotSummary(entry.valoriNuovi)}</span></div>
              </article>
            ))}
          </div>
        ))}
      </section>

      {modalOpen && (
        <div className="tenant-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="admin-assenze-modal-title">
          <article className="tenant-modal-card admin-assenze-modal">
            <div className="tenant-modal-header">
              <div><h3 id="admin-assenze-modal-title">{editing ? `Modifica default — ${editing.nome}` : 'Nuovo tipo di assenza'}</h3><p>Le modifiche globali non sovrascrivono le personalizzazioni tenant o driver già salvate.</p></div>
              <button type="button" className="tenant-modal-close" aria-label="Chiudi finestra" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={submit} className="admin-assenze-form">
              <div className="admin-assenze-form-grid">
                <label className="driver-form-field"><span>Codice</span><input className="form-input" value={form.codice} onChange={(event) => updateForm('codice', event.target.value.toUpperCase())} required maxLength={10} pattern="[A-Z0-9]{2,10}" disabled={Boolean(editing)} placeholder="Es. FER" /></label>
                <label className="driver-form-field"><span>Nome</span><input className="form-input" value={form.nome} onChange={(event) => updateForm('nome', event.target.value)} required maxLength={100} placeholder="Nome del tipo" /></label>
                <label className="driver-form-field"><span>Unità di misura</span><select className="form-input" value={form.unitaMisura} onChange={(event) => updateForm('unitaMisura', event.target.value as UnitaMisura)}><option value="GIORNI">Giorni</option><option value="ORE">Ore</option></select></label>
                <label className="driver-form-field"><span>Preavviso minimo (giorni)</span><input className="form-input" type="number" min="0" step="1" value={form.preavvisoMinimoGiorniDefault} onChange={(event) => updateForm('preavvisoMinimoGiorniDefault', Number(event.target.value))} required /></label>
                <label className="driver-form-field"><span>Valore annuo standard</span><input className="form-input" type="number" min="0" step="0.5" value={form.numeroGiorniAnnuiDefault ?? ''} onChange={(event) => updateForm('numeroGiorniAnnuiDefault', numberOrNull(event.target.value))} /></label>
                <label className="driver-form-field"><span>Comporto malattia (giorni)</span><input className="form-input" type="number" min="0" step="1" value={form.numeroGiorniMalattiaAnnuiDefault ?? ''} onChange={(event) => updateForm('numeroGiorniMalattiaAnnuiDefault', numberOrNull(event.target.value))} /></label>
                <label className="driver-form-field"><span>Scadenza ferie (mesi)</span><input className="form-input" type="number" min="1" step="1" value={form.scadenzaFerieMesiDefault ?? ''} onChange={(event) => updateForm('scadenzaFerieMesiDefault', numberOrNull(event.target.value))} /></label>
              </div>
              <div className="admin-assenze-toggle-grid">
                {!editing && <SwitchField label="Richiedibile dal Driver" checked={form.origineDriverConsentita} onChange={(checked) => updateForm('origineDriverConsentita', checked)} />}
                {!editing && <SwitchField label="Inseribile dal Gestionale" checked={form.origineGestionaleConsentita} onChange={(checked) => updateForm('origineGestionaleConsentita', checked)} />}
                <SwitchField label="Richiede orario" checked={form.richiedeOrario} onChange={(checked) => updateForm('richiedeOrario', checked)} />
                <SwitchField label="Documento richiesto (default)" checked={form.richiedeDocumentoDefault} onChange={(checked) => updateForm('richiedeDocumentoDefault', checked)} />
                <SwitchField label="Scala dal monte ore (default)" checked={form.scalaDaMonteOreDefault} onChange={(checked) => updateForm('scalaDaMonteOreDefault', checked)} />
              </div>
              {!editing && !form.origineDriverConsentita && !form.origineGestionaleConsentita && <p className="admin-assenze-validation">Abilita almeno una modalità di inserimento.</p>}
              <p className="admin-assenze-form-note">Il caricamento di documenti non è ancora disponibile nella piattaforma.</p>
              <div className="form-actions">
                <button type="button" className="secondary-button" onClick={() => setModalOpen(false)} disabled={saving}>Annulla</button>
                <button type="submit" className="primary-button" disabled={saving || (!editing && !form.origineDriverConsentita && !form.origineGestionaleConsentita)}>
                  <ButtonContent icon={<SaveIcon />}>{saving ? 'Salvataggio...' : editing ? 'Salva default' : 'Crea tipo'}</ButtonContent>
                </button>
              </div>
            </form>
          </article>
        </div>
      )}
    </main>
  );
}
