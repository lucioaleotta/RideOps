"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { StatusNotice } from './status-notice';
import { ResetIcon, SaveIcon, UserIcon } from './action-icons';
import { CalendarStatIcon } from './absences-icons';
import type {
  AssenzaSessionUser,
  ConfigurazioneAssenza,
  ConfigurazioneAssenzaValues,
  DriverConfigurazioneAssenza,
  RegoleGeneraliAssenza,
  RettificaSaldo
} from '../types/absences';

type DriverOption = { driverId: number; firstName: string | null; lastName: string | null };
type ConfigurationInput = ConfigurazioneAssenzaValues;
type ConfigurationField = keyof ConfigurationInput;

const editableFields: ConfigurationField[] = [
  'abilitato',
  'richiedeDocumento',
  'monteOreAbilitato',
  'numeroGiorniAnnui',
  'numeroGiorniMalattiaAnnui',
  'scadenzaFerieMesi',
  'preavvisoMinimoGiorni',
  'noteConfigurazione'
];

const fieldLabels: Record<ConfigurationField, string> = {
  abilitato: 'Tipo abilitato',
  richiedeDocumento: 'Richiede documento',
  monteOreAbilitato: 'Scala dal monte ore',
  numeroGiorniAnnui: 'Giorni/ore annui spettanti',
  numeroGiorniMalattiaAnnui: 'Comporto malattia (giorni)',
  scadenzaFerieMesi: 'Scadenza saldo (mesi)',
  preavvisoMinimoGiorni: 'Preavviso minimo richiesto (giorni)',
  noteConfigurazione: 'Motivo / note'
};

function displayValue(field: ConfigurationField, value: ConfigurationInput[ConfigurationField]) {
  if (field === 'abilitato' || field === 'richiedeDocumento' || field === 'monteOreAbilitato') {
    return value ? 'Sì' : 'No';
  }
  if (value === null || value === '') return '—';
  if (field === 'numeroGiorniAnnui' && typeof value === 'number') return String(value);
  return String(value);
}

function editableValues(configuration: ConfigurazioneAssenza): ConfigurationInput {
  return {
    abilitato: configuration.abilitato,
    richiedeDocumento: configuration.richiedeDocumento,
    monteOreAbilitato: configuration.monteOreAbilitato,
    numeroGiorniAnnui: configuration.numeroGiorniAnnui,
    numeroGiorniMalattiaAnnui: configuration.numeroGiorniMalattiaAnnui,
    scadenzaFerieMesi: configuration.scadenzaFerieMesi,
    preavvisoMinimoGiorni: configuration.preavvisoMinimoGiorni,
    noteConfigurazione: configuration.noteConfigurazione
  };
}

function driverFullName(driver: Pick<DriverOption, 'firstName' | 'lastName'>) {
  return [driver.firstName, driver.lastName].filter(Boolean).join(' ') || 'Driver';
}

function initials(driver: Pick<DriverOption, 'firstName' | 'lastName'>) {
  return [driver.firstName, driver.lastName]
    .filter(Boolean)
    .map((part) => part?.[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'DR';
}

async function readPayload<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload?.message === 'string' ? payload.message : 'Operazione non riuscita');
  }
  return payload as T;
}

export function ConfigurazioneAssenzePanel() {
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [configurations, setConfigurations] = useState<ConfigurazioneAssenza[]>([]);
  const [rules, setRules] = useState<RegoleGeneraliAssenza | null>(null);
  const [ruleDraft, setRuleDraft] = useState<RegoleGeneraliAssenza['comportamentoConflittoTurni']>('SEGNALA');
  const [driverRows, setDriverRows] = useState<DriverConfigurazioneAssenza[]>([]);
  const [activeTypeId, setActiveTypeId] = useState<number | null>(null);
  const [tenantDraft, setTenantDraft] = useState<ConfigurationInput | null>(null);
  const [driverDraft, setDriverDraft] = useState<ConfigurationInput | null>(null);
  const [driverTarget, setDriverTarget] = useState<DriverConfigurazioneAssenza | null>(null);
  const [selectedDrivers, setSelectedDrivers] = useState<number[]>([]);
  const [driverSearch, setDriverSearch] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [balancePreview, setBalancePreview] = useState<RettificaSaldo | null>(null);
  const [balancePreviewOpen, setBalancePreviewOpen] = useState(false);
  const [balanceSaving, setBalanceSaving] = useState(false);
  const [rulesSaving, setRulesSaving] = useState(false);
  const [tenantSaving, setTenantSaving] = useState(false);
  const [driverSaving, setDriverSaving] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const activeConfiguration = useMemo(
    () => configurations.find((configuration) => configuration.tipoAssenzaId === activeTypeId) ?? null,
    [activeTypeId, configurations]
  );

  const visibleDrivers = useMemo(() => {
    const query = driverSearch.trim().toLocaleLowerCase('it-IT');
    if (!query) return driverRows;
    return driverRows.filter((driver) => driverFullName(driver).toLocaleLowerCase('it-IT').includes(query));
  }, [driverRows, driverSearch]);

  const selectedDriverRows = useMemo(
    () => driverRows.filter((driver) => selectedDrivers.includes(driver.driverId)),
    [driverRows, selectedDrivers]
  );

  const loadDriverRows = useCallback(async (typeId: number, tenant: number) => {
    const rows = await readPayload<DriverConfigurazioneAssenza[]>(
      await fetch(`/api/tenant/${tenant}/configurazione-assenze/drivers?tipoAssenzaId=${typeId}`, { cache: 'no-store' })
    );
    setDriverRows(rows);
    setSelectedDrivers((current) => current.filter((id) => rows.some((row) => row.driverId === id)));
  }, []);

  const loadPage = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const me = await readPayload<AssenzaSessionUser>(await fetch('/api/auth/me', { cache: 'no-store' }));
      if (!me.tenantId || me.role !== 'GESTIONALE') {
        throw new Error('Questa schermata è disponibile solo per gli utenti Gestionali');
      }
      setTenantId(me.tenantId);
      const [nextConfigurations, nextRules] = await Promise.all([
        readPayload<ConfigurazioneAssenza[]>(
          await fetch(`/api/tenant/${me.tenantId}/configurazione-assenze`, { cache: 'no-store' })
        ),
        readPayload<RegoleGeneraliAssenza>(
          await fetch(`/api/tenant/${me.tenantId}/regole-generali`, { cache: 'no-store' })
        )
      ]);
      setConfigurations(nextConfigurations);
      setRules(nextRules);
      setRuleDraft(nextRules.comportamentoConflittoTurni);
      const selectedTypeId = nextConfigurations[0]?.tipoAssenzaId ?? null;
      setActiveTypeId(selectedTypeId);
      const currentType = nextConfigurations.find((item) => item.tipoAssenzaId === selectedTypeId);
      setTenantDraft(currentType ? editableValues(currentType) : null);
      if (selectedTypeId) await loadDriverRows(selectedTypeId, me.tenantId);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Impossibile caricare le configurazioni');
    } finally {
      setBusy(false);
    }
  }, [loadDriverRows]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  async function selectType(typeId: number) {
    setActiveTypeId(typeId);
    setSelectedDrivers([]);
    const configuration = configurations.find((item) => item.tipoAssenzaId === typeId);
    setTenantDraft(configuration ? editableValues(configuration) : null);
    if (tenantId) {
      try {
        await loadDriverRows(typeId, tenantId);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Impossibile caricare i driver');
      }
    }
  }

  async function saveRules() {
    if (!tenantId) return;
    setRulesSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const saved = await readPayload<RegoleGeneraliAssenza>(await fetch(`/api/tenant/${tenantId}/regole-generali`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comportamentoConflittoTurni: ruleDraft })
      }));
      setRules(saved);
      setRuleDraft(saved.comportamentoConflittoTurni);
      setSuccess('Regole generali salvate');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Impossibile salvare le regole');
    } finally {
      setRulesSaving(false);
    }
  }

  async function saveTenantConfiguration() {
    if (!tenantId || !activeConfiguration || !tenantDraft) return;
    setTenantSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const saved = await readPayload<ConfigurazioneAssenza>(await fetch(
        `/api/tenant/${tenantId}/configurazione-assenze/${activeConfiguration.tipoAssenzaId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tenantDraft)
        }
      ));
      setConfigurations((current) => current.map((item) => item.tipoAssenzaId === saved.tipoAssenzaId ? saved : item));
      setTenantDraft(editableValues(saved));
      await loadDriverRows(saved.tipoAssenzaId, tenantId);
      setSuccess(`Configurazione ${saved.nome} salvata. Il saldo già maturato non cambia: la nuova quota vale dall'anno successivo o dopo una rettifica esplicita.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Impossibile salvare la configurazione');
    } finally {
      setTenantSaving(false);
    }
  }

  async function resetTenantConfiguration() {
    if (!tenantId || !activeConfiguration) return;
    setTenantSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/tenant/${tenantId}/configurazione-assenze/${activeConfiguration.tipoAssenzaId}`, {
        method: 'DELETE'
      });
      if (!response.ok) await readPayload(response);
      await loadPage();
      setSuccess(`Ripristinato il default di piattaforma per ${activeConfiguration.nome}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Impossibile ripristinare il default');
    } finally {
      setTenantSaving(false);
    }
  }

  function toggleDriver(driverId: number) {
    setSelectedDrivers((current) => current.includes(driverId)
      ? current.filter((id) => id !== driverId)
      : [...current, driverId]);
  }

  function openDriverEditor(driver: DriverConfigurazioneAssenza) {
    setDriverTarget(driver);
    setDriverDraft(editableValues(driver.configurazioneEffettiva));
  }

  async function openBalanceCorrection(driver: DriverConfigurazioneAssenza) {
    if (!tenantId || !activeConfiguration) return;
    setError(null);
    setBalancePreview(null);
    try {
      const preview = await readPayload<RettificaSaldo>(await fetch(
        `/api/tenant/${tenantId}/driver/${driver.driverId}/saldi/${activeConfiguration.tipoAssenzaId}/rettifica`,
        { cache: 'no-store' }
      ));
      setBalancePreview(preview);
      setBalancePreviewOpen(true);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : 'Impossibile caricare la preview saldo');
    }
  }

  async function confirmBalanceCorrection() {
    if (!tenantId || !balancePreview) return;
    setBalanceSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await readPayload<RettificaSaldo>(await fetch(
        `/api/tenant/${tenantId}/driver/${balancePreview.driverId}/saldi/${balancePreview.tipoAssenzaId}/rettifica`,
        { method: 'PATCH' }
      ));
      setBalancePreview(updated);
      setBalancePreviewOpen(false);
      setSuccess(`Saldo ${updated.nome} ${updated.anno} rettificato: maturato ${updated.maturatoDopoRettifica}, già utilizzato ${updated.giaUtilizzato}.`);
    } catch (correctionError) {
      setError(correctionError instanceof Error ? correctionError.message : 'Impossibile rettificare il saldo');
    } finally {
      setBalanceSaving(false);
    }
  }

  async function saveDriverConfiguration() {
    if (!tenantId || !activeConfiguration || !driverTarget || !driverDraft) return;
    setDriverSaving(true);
    setError(null);
    try {
      await readPayload<DriverConfigurazioneAssenza>(await fetch(
        `/api/tenant/${tenantId}/driver/${driverTarget.driverId}/configurazione-assenze/${activeConfiguration.tipoAssenzaId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(driverDraft)
        }
      ));
      await loadDriverRows(activeConfiguration.tipoAssenzaId, tenantId);
      setDriverTarget(null);
      setDriverDraft(null);
      setSuccess(`Configurazione aggiornata per ${driverFullName(driverTarget)}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Impossibile salvare la personalizzazione');
    } finally {
      setDriverSaving(false);
    }
  }

  async function resetDriverConfiguration(driver: DriverConfigurazioneAssenza) {
    if (!tenantId || !activeConfiguration) return;
    setDriverSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/tenant/${tenantId}/driver/${driver.driverId}/configurazione-assenze/${activeConfiguration.tipoAssenzaId}`,
        { method: 'DELETE' }
      );
      if (!response.ok) await readPayload(response);
      await loadDriverRows(activeConfiguration.tipoAssenzaId, tenantId);
      setDriverTarget(null);
      setDriverDraft(null);
      setSuccess(`Ripristinata la configurazione standard per ${driverFullName(driver)}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Impossibile ripristinare la configurazione');
    } finally {
      setDriverSaving(false);
    }
  }

  async function applyToSelectedDrivers() {
    if (!activeConfiguration || !tenantDraft || selectedDrivers.length === 0) return;
    setDriverSaving(true);
    setError(null);
    try {
      await readPayload<DriverConfigurazioneAssenza[]>(await fetch(
        `/api/driver/configurazione-assenze/${activeConfiguration.tipoAssenzaId}/bulk-applica`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ driverIds: selectedDrivers, configurazione: tenantDraft })
        }
      ));
      if (tenantId) await loadDriverRows(activeConfiguration.tipoAssenzaId, tenantId);
      setPreviewOpen(false);
      setSelectedDrivers([]);
      setSuccess(`Configurazione applicata a ${selectedDriverRows.length} driver`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Impossibile applicare la configurazione');
    } finally {
      setDriverSaving(false);
    }
  }

  async function resetSelectedDrivers() {
    if (!activeConfiguration || selectedDrivers.length === 0) return;
    setDriverSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/driver/configurazione-assenze/${activeConfiguration.tipoAssenzaId}/bulk-ripristina`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverIds: selectedDrivers })
      });
      if (!response.ok) await readPayload(response);
      if (tenantId) await loadDriverRows(activeConfiguration.tipoAssenzaId, tenantId);
      setSuccess(`Configurazione standard ripristinata per ${selectedDrivers.length} driver`);
      setSelectedDrivers([]);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Impossibile ripristinare le configurazioni');
    } finally {
      setDriverSaving(false);
    }
  }

  if (busy) {
    return <main className="assenze-config-page"><div className="assenza-empty-state" role="status">Caricamento configurazione assenze...</div></main>;
  }

  return (
    <main className="assenze-config-page">
      <header className="assenze-config-heading">
        <div>
          <span className="assenze-config-eyebrow">GESTIONE PERSONALE</span>
          <h1>Configurazione assenze</h1>
          <p>Imposta i valori standard del tenant e le eccezioni per singolo driver.</p>
        </div>
        <span className="assenze-config-header-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h9m4 0h3M4 17h3m4 0h9" />
            <circle cx="15" cy="7" r="2" fill="currentColor" stroke="none" />
            <circle cx="9" cy="17" r="2" fill="currentColor" stroke="none" />
          </svg>
        </span>
      </header>

      {(error || success) && (
        <div className="assenze-config-notices">
          {error && <StatusNotice tone="error">{error}</StatusNotice>}
          {success && <StatusNotice tone="success">{success}</StatusNotice>}
        </div>
      )}

      <div className="assenze-config-layout">
        <section className="assenze-config-column assenze-config-column--rules">
          <article className="assenze-config-card">
            <div className="assenze-config-card-heading">
              <span className="assenze-config-card-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 7h9m4 0h3M4 17h3m4 0h9" />
                  <circle cx="15" cy="7" r="2" fill="currentColor" stroke="none" />
                  <circle cx="9" cy="17" r="2" fill="currentColor" stroke="none" />
                </svg>
              </span>
              <div>
                <h2>Regole generali</h2>
                <p>Si applicano a tutte le richieste di assenza del tenant.</p>
              </div>
            </div>
            <label className="assenze-config-field">
              <span>Approvazione richiesta</span>
              <select className="form-input" value="single" disabled>
                <option value="single">Sempre dal Gestionale — singolo livello</option>
              </select>
              <small>Non configurabile in questa fase (vedi documento, sez. 4.3).</small>
            </label>
            <label className="assenze-config-field">
              <span>Conflitti con i turni pianificati</span>
              <select
                className="form-input"
                value={ruleDraft}
                onChange={(event) => setRuleDraft(event.target.value as RegoleGeneraliAssenza['comportamentoConflittoTurni'])}
              >
                <option value="SEGNALA">Segnala soltanto (consigliato)</option>
                <option value="SEGNALA_E_BLOCCA">Segnala e blocca l&apos;approvazione</option>
              </select>
              <small>Default piattaforma: {rules?.defaultPiattaforma === 'SEGNALA' ? 'Segnala soltanto' : '—'}</small>
            </label>
            <div className="assenze-config-card-footer">
              <button type="button" className="primary-button compact-button" onClick={saveRules} disabled={rulesSaving || ruleDraft === rules?.comportamentoConflittoTurni}>
                {rulesSaving ? 'Salvataggio...' : 'Salva regole'}
              </button>
            </div>
          </article>
        </section>

        <section className="assenze-config-column assenze-config-column--tenant">
          <article className="assenze-config-card assenze-config-card--standard">
            <div className="assenze-config-card-heading">
              <span className="assenze-config-card-icon" aria-hidden="true"><CalendarStatIcon /></span>
              <div>
                <h2>Valori standard tenant</h2>
                <p>Valori indicativi da validare con il consulente del lavoro — ereditano i default di piattaforma finché non li personalizzi.</p>
              </div>
            </div>

            <div className="assenze-type-tabs" role="tablist" aria-label="Tipo di assenza">
              {configurations.map((configuration) => (
                <button
                  key={configuration.tipoAssenzaId}
                  type="button"
                  role="tab"
                  aria-selected={activeTypeId === configuration.tipoAssenzaId}
                  className={activeTypeId === configuration.tipoAssenzaId ? 'assenze-type-tab is-active' : 'assenze-type-tab'}
                  onClick={() => void selectType(configuration.tipoAssenzaId)}
                >
                  {configuration.nome}
                </button>
              ))}
            </div>

            {activeConfiguration && tenantDraft ? (
              <>
                <div className="assenze-active-type-title">
                  <span>{activeConfiguration.nome}</span>
                  <span className="assenze-type-unit">Unità: {activeConfiguration.unitaMisura.toLocaleLowerCase('it-IT')}</span>
                </div>
                <div className="assenze-config-fields">
                  {activeConfiguration.codice !== 'MAL' && activeConfiguration.codice !== 'RIP' && (
                    <label className="assenze-config-field">
                      <span>{activeConfiguration.unitaMisura === 'ORE' ? 'Ore annue spettanti' : 'Giorni annui spettanti'}</span>
                      <input className="form-input" type="number" min="0" step="0.5" value={tenantDraft.numeroGiorniAnnui ?? ''} onChange={(event) => setTenantDraft({ ...tenantDraft, numeroGiorniAnnui: event.target.value === '' ? null : Number(event.target.value) })} />
                      <small>Default piattaforma: {displayValue('numeroGiorniAnnui', activeConfiguration.defaultPiattaforma.numeroGiorniAnnui)}
                        {tenantDraft.numeroGiorniAnnui !== activeConfiguration.defaultPiattaforma.numeroGiorniAnnui && <em className="assenze-personalized-label">Personalizzato</em>}
                      </small>
                    </label>
                  )}
                  {activeConfiguration.codice === 'MAL' && (
                    <label className="assenze-config-field">
                      <span>Comporto malattia (giorni)</span>
                      <input className="form-input" type="number" min="0" step="1" value={tenantDraft.numeroGiorniMalattiaAnnui ?? ''} onChange={(event) => setTenantDraft({ ...tenantDraft, numeroGiorniMalattiaAnnui: event.target.value === '' ? null : Number(event.target.value) })} />
                      <small>Default piattaforma: {displayValue('numeroGiorniMalattiaAnnui', activeConfiguration.defaultPiattaforma.numeroGiorniMalattiaAnnui)}
                        {tenantDraft.numeroGiorniMalattiaAnnui !== activeConfiguration.defaultPiattaforma.numeroGiorniMalattiaAnnui && <em className="assenze-personalized-label">Personalizzato</em>}
                      </small>
                    </label>
                  )}
                  {activeConfiguration.codice === 'FER' && (
                      <NumberConfigurationField field="scadenzaFerieMesi" label={fieldLabels.scadenzaFerieMesi} value={tenantDraft.scadenzaFerieMesi} defaultValue={activeConfiguration.defaultPiattaforma.scadenzaFerieMesi} onChange={(value) => setTenantDraft({ ...tenantDraft, scadenzaFerieMesi: value })} />
                  )}
                  <NumberConfigurationField field="preavvisoMinimoGiorni" label={fieldLabels.preavvisoMinimoGiorni} value={tenantDraft.preavvisoMinimoGiorni} defaultValue={activeConfiguration.defaultPiattaforma.preavvisoMinimoGiorni} onChange={(value) => setTenantDraft({ ...tenantDraft, preavvisoMinimoGiorni: value ?? 0 })} />
                  <ToggleConfigurationField field="abilitato" label={fieldLabels.abilitato} checked={tenantDraft.abilitato} defaultValue={activeConfiguration.defaultPiattaforma.abilitato} onChange={(checked) => setTenantDraft({ ...tenantDraft, abilitato: checked })} />
                  <ToggleConfigurationField field="monteOreAbilitato" label={fieldLabels.monteOreAbilitato} checked={tenantDraft.monteOreAbilitato} defaultValue={activeConfiguration.defaultPiattaforma.monteOreAbilitato} onChange={(checked) => setTenantDraft({ ...tenantDraft, monteOreAbilitato: checked })} />
                  <ToggleConfigurationField field="richiedeDocumento" label={fieldLabels.richiedeDocumento} checked={tenantDraft.richiedeDocumento} defaultValue={activeConfiguration.defaultPiattaforma.richiedeDocumento} onChange={(checked) => setTenantDraft({ ...tenantDraft, richiedeDocumento: checked })} />
                  <label className="assenze-config-field">
                    <span>Note configurazione</span>
                    <textarea className="form-input" rows={2} value={tenantDraft.noteConfigurazione ?? ''} onChange={(event) => setTenantDraft({ ...tenantDraft, noteConfigurazione: event.target.value || null })} />
                    <small>Upload documenti non ancora rilasciato.</small>
                  </label>
                </div>
                <div className="assenze-config-difference">
                  {activeConfiguration.personalizzato ? 'Configurazione tenant personalizzata' : 'Il tenant eredita i default di piattaforma'}
                </div>
                <div className="assenze-config-card-footer assenze-config-card-footer--stacked">
                  {activeConfiguration.personalizzato && (
                    <button type="button" className="secondary-button compact-button" onClick={() => void resetTenantConfiguration()} disabled={tenantSaving}>
                      <span className="assenze-inline-icon"><ResetIcon /></span> Ripristina default di piattaforma
                    </button>
                  )}
                  <button type="button" className="primary-button compact-button" onClick={() => void saveTenantConfiguration()} disabled={tenantSaving}>
                    {tenantSaving ? 'Salvataggio...' : <><span className="assenze-inline-icon"><SaveIcon /></span> Salva impostazioni</>}
                  </button>
                </div>
              </>
            ) : (
              <div className="assenza-empty-state">Nessun tipo di assenza attivo.</div>
            )}
          </article>
        </section>

        <section className="assenze-config-column assenze-config-column--drivers">
          <article className="assenze-config-card assenze-config-card--drivers">
            <div className="assenze-config-card-heading">
              <span className="assenze-config-card-icon" aria-hidden="true"><UserIcon /></span>
              <div>
                <h2>Configurazioni per driver</h2>
                <p>L&apos;elenco esclude automaticamente i profili Freelancer, che non hanno accesso alla feature.</p>
              </div>
            </div>
            <label className="assenze-driver-search">
              <span className="assenze-search-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <circle cx="10.8" cy="10.8" r="6.2" />
                  <path d="m15.4 15.4 4.1 4.1" />
                </svg>
              </span>
              <input aria-label="Cerca driver" value={driverSearch} onChange={(event) => setDriverSearch(event.target.value)} placeholder="Cerca driver" />
            </label>
            <div className="assenze-driver-list">
              {visibleDrivers.map((driver) => (
                <article className="assenze-driver-row" key={driver.driverId}>
                  <label className="assenze-driver-select">
                    <input type="checkbox" checked={selectedDrivers.includes(driver.driverId)} onChange={() => toggleDriver(driver.driverId)} aria-label={`Seleziona ${driverFullName(driver)}`} />
                    <span className="assenze-driver-avatar" aria-hidden="true">{initials(driver)}</span>
                    <span className="assenze-driver-name-wrap"><strong>{driverFullName(driver)}</strong><small>Autista</small></span>
                  </label>
                  <span className={driver.personalizzato ? 'assenze-driver-status is-custom' : 'assenze-driver-status'}>
                    {driver.personalizzato ? 'Personalizzata (1)' : 'Standard'}
                  </span>
                  <div className="assenze-driver-row-footer">
                    <span>{driver.personalizzato ? 'Valori indipendenti dal tenant' : 'Segue i valori standard del tenant'}</span>
                    <button type="button" className="secondary-button compact-button" onClick={() => openDriverEditor(driver)}>
                      <span className="assenze-inline-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                          <path d="M4 7h9m4 0h3M4 17h3m4 0h9" />
                          <circle cx="15" cy="7" r="2" fill="currentColor" stroke="none" />
                          <circle cx="9" cy="17" r="2" fill="currentColor" stroke="none" />
                        </svg>
                      </span>
                      {driver.personalizzato ? 'Modifica' : 'Personalizza'}
                    </button>
                    {activeConfiguration && (activeConfiguration.codice === 'FER' || activeConfiguration.codice === 'PER') && (
                      <button type="button" className="assenze-link-button" onClick={() => void openBalanceCorrection(driver)}>
                        Rettifica saldo anno corrente
                      </button>
                    )}
                    {driver.personalizzato && (
                      <button type="button" className="assenze-link-button" onClick={() => void resetDriverConfiguration(driver)} disabled={driverSaving}>Ripristina standard</button>
                    )}
                  </div>
                </article>
              ))}
              {visibleDrivers.length === 0 && <div className="assenza-empty-state">Nessun driver trovato.</div>}
            </div>
          </article>
        </section>
      </div>

      {selectedDrivers.length > 0 && activeConfiguration && tenantDraft && (
        <aside className="assenze-bulk-bar" aria-label="Azioni driver selezionati">
          <div className="assenze-bulk-heading">
            <strong>{selectedDrivers.length} driver selezionat{selectedDrivers.length === 1 ? 'o' : 'i'}</strong>
            <span>{selectedDriverRows.map(driverFullName).join(', ')}</span>
          </div>
          <button type="button" className="secondary-button compact-button" onClick={() => void resetSelectedDrivers()} disabled={driverSaving}>
            <span className="assenze-inline-icon"><ResetIcon /></span> Ripristina standard per selezionati
          </button>
          <button type="button" className="primary-button compact-button" onClick={() => setPreviewOpen(true)} disabled={driverSaving}>
            Applica configurazione a selezionati
          </button>
        </aside>
      )}

      {driverTarget && driverDraft && activeConfiguration && (
        <div className="tenant-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="assenze-driver-modal-title">
          <article className="tenant-modal-card assenze-driver-modal">
            <div className="tenant-modal-header">
              <div>
                <h3 id="assenze-driver-modal-title">{driverTarget.personalizzato ? 'Modifica eccezione driver' : 'Personalizza driver'} — {driverFullName(driverTarget)}</h3>
                <p>La configurazione viene salvata come riga indipendente dai valori tenant.</p>
              </div>
              <button type="button" className="tenant-modal-close" aria-label="Chiudi modifica driver" onClick={() => setDriverTarget(null)}>×</button>
            </div>
            <ConfigurationEditor configuration={activeConfiguration} values={driverDraft} onChange={setDriverDraft} />
            <div className="form-actions">
              <button type="button" className="secondary-button" onClick={() => setDriverTarget(null)} disabled={driverSaving}>Annulla</button>
              <button type="button" className="primary-button" onClick={() => void saveDriverConfiguration()} disabled={driverSaving}>{driverSaving ? 'Salvataggio...' : 'Salva personalizzazione'}</button>
            </div>
          </article>
        </div>
      )}

      {balancePreviewOpen && balancePreview && (
        <div className="tenant-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="assenze-balance-preview-title">
          <article className="tenant-modal-card assenze-preview-modal">
            <div className="tenant-modal-header">
              <div>
                <h3 id="assenze-balance-preview-title">Rettifica saldo anno corrente</h3>
                <p>Conferma esplicitamente la quota effettiva configurata per questo driver.</p>
              </div>
              <button type="button" className="tenant-modal-close" aria-label="Chiudi preview rettifica" onClick={() => setBalancePreviewOpen(false)} disabled={balanceSaving}>×</button>
            </div>
            <dl className="assenze-balance-preview">
              <div><dt>Driver</dt><dd>{driverFullName(driverRows.find((row) => row.driverId === balancePreview.driverId) ?? { firstName: null, lastName: null })}</dd></div>
              <div><dt>Tipo / anno</dt><dd>{balancePreview.nome} · {balancePreview.anno}</dd></div>
              <div><dt>Maturato attuale</dt><dd>{balancePreview.maturatoAttuale}</dd></div>
              <div><dt>Già utilizzato</dt><dd>{balancePreview.giaUtilizzato}</dd></div>
              <div><dt>Quota configurata</dt><dd>{balancePreview.quotaConfigurata}</dd></div>
              <div><dt>Maturato dopo rettifica</dt><dd>{balancePreview.maturatoDopoRettifica}</dd></div>
              <div><dt>Variazione</dt><dd>{balancePreview.differenza > 0 ? '+' : ''}{balancePreview.differenza}</dd></div>
            </dl>
            {!balancePreview.applicabile && (
              <StatusNotice tone="error">Rettifica non applicabile: il tipo non ha quota annua attiva oppure la quota configurata è inferiore al già utilizzato.</StatusNotice>
            )}
            {balancePreview.applicabile && balancePreview.differenza === 0 && (
              <StatusNotice tone="info">Il saldo dell&apos;anno corrente è già allineato alla quota configurata.</StatusNotice>
            )}
            <div className="form-actions">
              <button type="button" className="secondary-button" onClick={() => setBalancePreviewOpen(false)} disabled={balanceSaving}>Annulla</button>
              <button type="button" className="primary-button" onClick={() => void confirmBalanceCorrection()} disabled={balanceSaving || !balancePreview.applicabile || balancePreview.differenza === 0}>
                {balanceSaving ? 'Rettifica...' : 'Conferma rettifica'}
              </button>
            </div>
          </article>
        </div>
      )}

      {previewOpen && activeConfiguration && tenantDraft && (
        <div className="tenant-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="assenze-preview-title">
          <article className="tenant-modal-card assenze-preview-modal">
            <div className="tenant-modal-header">
              <div>
                <h3 id="assenze-preview-title">Anteprima applicazione</h3>
                <p>Verifica i valori prima di creare le configurazioni indipendenti.</p>
              </div>
              <button type="button" className="tenant-modal-close" aria-label="Chiudi anteprima" onClick={() => setPreviewOpen(false)}>×</button>
            </div>
            <div className="assenze-preview-summary">
              {selectedDrivers.length} driver selezionat{selectedDrivers.length === 1 ? 'o' : 'i'} — {selectedDriverRows.map(driverFullName).join(', ')}
            </div>
            <div className="assenze-preview-table-wrap">
              <table className="assenze-preview-table">
                <thead><tr><th>Driver</th><th>Campo</th><th>Valore attuale</th><th>Nuovo valore</th></tr></thead>
                <tbody>
                  {selectedDriverRows.flatMap((driver) => editableFields.map((field) => (
                    <tr key={`${driver.driverId}-${field}`}>
                      <td>{driverFullName(driver)}</td>
                      <td>{fieldLabels[field]}</td>
                      <td>{displayValue(field, editableValues(driver.configurazioneEffettiva)[field])}</td>
                      <td>{displayValue(field, tenantDraft[field])}</td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
            <div className="form-actions">
              <button type="button" className="secondary-button" onClick={() => setPreviewOpen(false)} disabled={driverSaving}>Annulla</button>
              <button type="button" className="primary-button" onClick={() => void applyToSelectedDrivers()} disabled={driverSaving}>{driverSaving ? 'Applicazione...' : `Conferma applicazione a ${selectedDrivers.length} driver`}</button>
            </div>
          </article>
        </div>
      )}
    </main>
  );
}

function NumberConfigurationField({
  field,
  label,
  value,
  defaultValue,
  onChange
}: {
  field: ConfigurationField;
  label: string;
  value: number | null;
  defaultValue: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="assenze-config-field">
      <span>{label}</span>
      <input className="form-input" type="number" min="0" step="1" value={value ?? ''} onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))} />
      <small>Default piattaforma: {displayValue(field, defaultValue)}{value !== defaultValue && <em className="assenze-personalized-label">Personalizzato</em>}</small>
    </label>
  );
}

function ToggleConfigurationField({ field, label, checked, defaultValue, onChange }: { field: ConfigurationField; label: string; checked: boolean; defaultValue: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="assenze-config-toggle">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="assenze-toggle-track" aria-hidden="true" />
      <small className="assenze-toggle-default">Default piattaforma: {displayValue(field, defaultValue)}{checked !== defaultValue && <em className="assenze-personalized-label">Personalizzato</em>}</small>
    </label>
  );
}

function ConfigurationEditor({
  configuration,
  values,
  onChange
}: {
  configuration: ConfigurazioneAssenza;
  values: ConfigurationInput;
  onChange: (values: ConfigurationInput) => void;
}) {
  return (
    <div className="assenze-config-fields assenze-config-fields--modal">
      {configuration.codice !== 'MAL' && configuration.codice !== 'RIP' && (
        <label className="assenze-config-field">
          <span>{configuration.unitaMisura === 'ORE' ? 'Ore annue spettanti' : 'Giorni annui spettanti'}</span>
          <input className="form-input" type="number" min="0" step="0.5" value={values.numeroGiorniAnnui ?? ''} onChange={(event) => onChange({ ...values, numeroGiorniAnnui: event.target.value === '' ? null : Number(event.target.value) })} />
        </label>
      )}
      {configuration.codice === 'MAL' && (
        <label className="assenze-config-field">
          <span>Comporto malattia (giorni)</span>
          <input className="form-input" type="number" min="0" value={values.numeroGiorniMalattiaAnnui ?? ''} onChange={(event) => onChange({ ...values, numeroGiorniMalattiaAnnui: event.target.value === '' ? null : Number(event.target.value) })} />
        </label>
      )}
      {configuration.codice === 'FER' && <NumberConfigurationField field="scadenzaFerieMesi" label="Scadenza saldo (mesi)" value={values.scadenzaFerieMesi} defaultValue={configuration.defaultPiattaforma.scadenzaFerieMesi} onChange={(value) => onChange({ ...values, scadenzaFerieMesi: value })} />}
      <NumberConfigurationField field="preavvisoMinimoGiorni" label="Preavviso minimo (giorni)" value={values.preavvisoMinimoGiorni} defaultValue={configuration.defaultPiattaforma.preavvisoMinimoGiorni} onChange={(value) => onChange({ ...values, preavvisoMinimoGiorni: value ?? 0 })} />
      <ToggleConfigurationField field="abilitato" label="Tipo abilitato" checked={values.abilitato} defaultValue={configuration.defaultPiattaforma.abilitato} onChange={(checked) => onChange({ ...values, abilitato: checked })} />
      <ToggleConfigurationField field="monteOreAbilitato" label="Scala dal monte ore" checked={values.monteOreAbilitato} defaultValue={configuration.defaultPiattaforma.monteOreAbilitato} onChange={(checked) => onChange({ ...values, monteOreAbilitato: checked })} />
      <ToggleConfigurationField field="richiedeDocumento" label="Richiede documento" checked={values.richiedeDocumento} defaultValue={configuration.defaultPiattaforma.richiedeDocumento} onChange={(checked) => onChange({ ...values, richiedeDocumento: checked })} />
      <label className="assenze-config-field">
        <span>Motivo dell&apos;eccezione</span>
        <textarea className="form-input" rows={2} value={values.noteConfigurazione ?? ''} onChange={(event) => onChange({ ...values, noteConfigurazione: event.target.value || null })} />
      </label>
    </div>
  );
}
