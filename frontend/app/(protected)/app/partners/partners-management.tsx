"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AddIcon, ButtonContent, CursorIcon, DeleteIcon, EditIcon, LockIcon, ResetIcon, SaveIcon, SearchIcon, SelectIcon } from '../../../../components/action-icons';
import { StatusNotice } from '../../../../components/status-notice';

type PartnerType = 'AGENZIA' | 'NCC' | 'ALTRO';

type PartnerItem = {
  id: number;
  type: PartnerType;
  ragioneSociale: string;
  nomeReferente: string | null;
  cognomeReferente: string | null;
  telefono: string | null;
  email: string | null;
  citta: string | null;
  indirizzo: string | null;
  zonaOperativa: string | null;
  partitaIva: string | null;
  codiceFiscale: string | null;
  iban: string | null;
  intestatarioConto: string | null;
  notePagamenti: string | null;
  numeroServiziAffidati: number;
  numeroServiziRicevuti: number;
  totaleMarginiOutsourced: number;
  totaleRicaviIncoming: number;
  totaleGuadagni: number;
  saldoAttuale: number;
  totaleCrediti: number;
  totaleDebiti: number;
  riceveEmail: boolean;
  riceveWhatsApp: boolean;
  telefonoWhatsApp: string | null;
  noteOperative: string | null;
  deleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type PartnerFormState = {
  type: PartnerType;
  ragioneSociale: string;
  nomeReferente: string;
  cognomeReferente: string;
  telefono: string;
  email: string;
  citta: string;
  indirizzo: string;
  zonaOperativa: string;
  partitaIva: string;
  codiceFiscale: string;
  iban: string;
  intestatarioConto: string;
  notePagamenti: string;
  riceveEmail: boolean;
  riceveWhatsApp: boolean;
  telefonoWhatsApp: string;
  noteOperative: string;
};

const defaultForm: PartnerFormState = {
  type: 'AGENZIA',
  ragioneSociale: '',
  nomeReferente: '',
  cognomeReferente: '',
  telefono: '',
  email: '',
  citta: '',
  indirizzo: '',
  zonaOperativa: '',
  partitaIva: '',
  codiceFiscale: '',
  iban: '',
  intestatarioConto: '',
  notePagamenti: '',
  riceveEmail: true,
  riceveWhatsApp: false,
  telefonoWhatsApp: '',
  noteOperative: ''
};

type PartnersManagementProps = {
  userRole?: string;
};

function typeLabel(type: PartnerType) {
  if (type === 'AGENZIA') return 'Agenzia';
  if (type === 'NCC') return 'NCC';
  return 'Altro';
}

function valueOrDash(value: string | null | undefined) {
  if (!value) {
    return '—';
  }
  return value;
}

function currencyEur(value: number | null | undefined) {
  const amount = value ?? 0;
  return `€ ${amount.toFixed(2)}`;
}

function accountingMetricCard({ title, value, tone = 'default' }: { title: string; value: string; tone?: 'default' | 'positive' | 'negative' }) {
  const palette = tone === 'positive'
    ? { background: '#edf8f1', border: '#cde9d6', value: '#1d6f42' }
    : tone === 'negative'
      ? { background: '#fff2f0', border: '#f3cdc7', value: '#b54735' }
      : { background: '#f6faff', border: '#dce9f8', value: '#1f4f82' };

  return (
    <div
      style={{
        background: palette.background,
        border: `1px solid ${palette.border}`,
        borderRadius: 14,
        padding: '14px 16px',
        display: 'grid',
        gap: 6
      }}
    >
      <span style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6c7a89', fontWeight: 700 }}>{title}</span>
      <strong style={{ fontSize: 24, lineHeight: 1.1, color: palette.value }}>{value}</strong>
    </div>
  );
}

type DetailRow = {
  label: string;
  value: string;
};

function DetailRows({ rows }: { rows: DetailRow[] }) {
  return (
    <div style={{ display: 'grid' }}>
      {rows.map((row, index) => (
        <div
          key={`${row.label}-${index}`}
          style={{
            display: 'grid',
            gridTemplateColumns: '180px minmax(0, 1fr)',
            columnGap: 14,
            padding: '10px 0',
            borderBottom: index === rows.length - 1 ? 'none' : '1px solid #e6edf5'
          }}
        >
          <div style={{ fontWeight: 700, color: '#2b4b6f' }}>{row.label}</div>
          <div style={{ color: '#455b73' }}>{row.value}</div>
        </div>
      ))}
    </div>
  );
}

export function PartnersManagement({ userRole = 'UNKNOWN' }: PartnersManagementProps) {
  const isAllowed = userRole.toUpperCase() === 'ADMIN' || userRole.toUpperCase() === 'GESTIONALE';

  const [partners, setPartners] = useState<PartnerItem[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | ''>('');
  const [selectedPartnerDetail, setSelectedPartnerDetail] = useState<PartnerItem | null>(null);

  const [partnerQuery, setPartnerQuery] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingPartnerId, setEditingPartnerId] = useState<number | null>(null);
  const [form, setForm] = useState<PartnerFormState>(defaultForm);
  const [newButtonPortalTarget, setNewButtonPortalTarget] = useState<HTMLElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadPartners = useCallback(async function loadPartners() {
    setLoading(true);
    setError(null);

    const query = new URLSearchParams();
    if (showDeleted) {
      query.set('includeDeleted', 'true');
    }

    const targetUrl = query.size > 0 ? `/api/partners?${query.toString()}` : '/api/partners';
    const response = await fetch(targetUrl, { cache: 'no-store' });
    const payload = (await response.json().catch(() => [])) as PartnerItem[] | { message?: string };

    if (!response.ok) {
      setError((payload as { message?: string }).message ?? 'Errore caricamento partner');
      setPartners([]);
      setLoading(false);
      return;
    }

    setPartners(payload as PartnerItem[]);
    setLoading(false);
  }, [showDeleted]);

  async function loadPartnerDetail(partnerId: number) {
    const response = await fetch(`/api/partners/${partnerId}`, { cache: 'no-store' });
    const payload = (await response.json().catch(() => ({}))) as PartnerItem | { message?: string };

    if (!response.ok) {
      setError((payload as { message?: string }).message ?? 'Errore caricamento dettaglio partner');
      setSelectedPartnerDetail(null);
      return;
    }

    const partner = payload as PartnerItem;
    setSelectedPartnerDetail(partner);
    setForm({
      type: partner.type,
      ragioneSociale: partner.ragioneSociale,
      nomeReferente: partner.nomeReferente ?? '',
      cognomeReferente: partner.cognomeReferente ?? '',
      telefono: partner.telefono ?? '',
      email: partner.email ?? '',
      citta: partner.citta ?? '',
      indirizzo: partner.indirizzo ?? '',
      zonaOperativa: partner.zonaOperativa ?? '',
      partitaIva: partner.partitaIva ?? '',
      codiceFiscale: partner.codiceFiscale ?? '',
      iban: partner.iban ?? '',
      intestatarioConto: partner.intestatarioConto ?? '',
      notePagamenti: partner.notePagamenti ?? '',
      riceveEmail: partner.riceveEmail,
      riceveWhatsApp: partner.riceveWhatsApp,
      telefonoWhatsApp: partner.telefonoWhatsApp ?? '',
      noteOperative: partner.noteOperative ?? ''
    });
  }

  useEffect(() => {
    if (!isAllowed) {
      return;
    }

    loadPartners();
  }, [isAllowed, loadPartners]);

  useEffect(() => {
    if (!selectedPartnerId) {
      setSelectedPartnerDetail(null);
      return;
    }

    loadPartnerDetail(selectedPartnerId);
  }, [selectedPartnerId]);

  useEffect(() => {
    setNewButtonPortalTarget(document.getElementById('partners-new-button-portal'));
  }, []);

  const visiblePartners = useMemo(() => {
    // Safety fallback: if API ignores includeDeleted, still hide deleted by default.
    if (!showDeleted) {
      return partners.filter((partner) => !partner.deleted);
    }
    return partners;
  }, [partners, showDeleted]);

  const filteredPartners = useMemo(() => {
    const query = partnerQuery.trim().toLowerCase();
    if (!query) {
      return visiblePartners;
    }

    return visiblePartners.filter((partner) => {
      const searchableParts = [
        partner.ragioneSociale,
        partner.nomeReferente ?? '',
        partner.cognomeReferente ?? '',
        partner.telefono ?? '',
        partner.email ?? '',
        typeLabel(partner.type)
      ];

      return searchableParts.join(' ').toLowerCase().includes(query);
    });
  }, [partnerQuery, visiblePartners]);

  function toPayload(current: PartnerFormState) {
    return {
      type: current.type,
      ragioneSociale: current.ragioneSociale,
      nomeReferente: current.nomeReferente || null,
      cognomeReferente: current.cognomeReferente || null,
      telefono: current.telefono || null,
      email: current.email || null,
      citta: current.citta || null,
      indirizzo: current.indirizzo || null,
      zonaOperativa: current.zonaOperativa || null,
      partitaIva: current.partitaIva || null,
      codiceFiscale: current.codiceFiscale || null,
      iban: current.iban || null,
      intestatarioConto: current.intestatarioConto || null,
      notePagamenti: current.notePagamenti || null,
      riceveEmail: current.riceveEmail,
      riceveWhatsApp: current.riceveWhatsApp,
      telefonoWhatsApp: current.telefonoWhatsApp || null,
      noteOperative: current.noteOperative || null
    };
  }

  async function createPartner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const response = await fetch('/api/partners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toPayload(form))
    });

    const payload = (await response.json().catch(() => ({}))) as PartnerItem & { message?: string };
    if (!response.ok) {
      setError(payload.message ?? 'Creazione partner fallita');
      return;
    }

    const created = payload as PartnerItem;
    setSuccess('Partner creato');
    setIsFormModalOpen(false);
    setEditingPartnerId(null);
    setForm(defaultForm);
    setSelectedPartnerId(created.id);
    await loadPartners();
  }

  async function updatePartner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPartnerId) {
      return;
    }

    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/partners/${selectedPartnerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toPayload(form))
    });

    const payload = (await response.json().catch(() => ({}))) as PartnerItem & { message?: string };
    if (!response.ok) {
      setError(payload.message ?? 'Aggiornamento partner fallito');
      return;
    }

    setSuccess('Partner aggiornato');
    setIsFormModalOpen(false);
    setEditingPartnerId(null);
    await loadPartners();
    await loadPartnerDetail(selectedPartnerId);
  }

  async function deactivateSelectedPartner() {
    if (!selectedPartnerId) {
      return;
    }

    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/partners/${selectedPartnerId}/deactivate`, {
      method: 'PATCH'
    });

    const payload = (await response.json().catch(() => ({}))) as PartnerItem & { message?: string };
    if (!response.ok) {
      setError(payload.message ?? 'Cancellazione logica fallita');
      return;
    }

    setSuccess('Partner cancellato logicamente');
    setSelectedPartnerId('');
    setSelectedPartnerDetail(null);
    await loadPartners();
  }

  function selectPartner(partnerId: number) {
    setSelectedPartnerId(partnerId);
  }

  function deselectPartner() {
    setSelectedPartnerId('');
    setSelectedPartnerDetail(null);
  }

  function openCreateModal() {
    setError(null);
    setSuccess(null);
    setEditingPartnerId(null);
    setForm(defaultForm);
    setIsFormModalOpen(true);
  }

  async function openEditModal(partnerId: number) {
    setError(null);
    setSuccess(null);
    setEditingPartnerId(partnerId);
    setSelectedPartnerId(partnerId);
    await loadPartnerDetail(partnerId);
    setIsFormModalOpen(true);
  }

  function closeFormModal() {
    setIsFormModalOpen(false);
    setEditingPartnerId(null);
    setForm(defaultForm);
  }

  if (!isAllowed) {
    return (
      <article className="dashboard-card">
        <p>Accesso negato: solo ADMIN o GESTIONALE possono gestire i partner.</p>
      </article>
    );
  }

  const createPartnerButton = (
    <button
      type="button"
      className="primary-button compact-button"
      onClick={() => {
        if (isFormModalOpen && editingPartnerId === null) {
          closeFormModal();
        } else {
          openCreateModal();
        }
        setSelectedPartnerId('');
      }}
    >
      <ButtonContent icon={isFormModalOpen && editingPartnerId === null ? <LockIcon /> : <AddIcon />}>
        {isFormModalOpen && editingPartnerId === null ? 'Chiudi nuovo partner' : 'Nuovo partner'}
      </ButtonContent>
    </button>
  );

  return (
    <section className="responsive-panel partners-management-panel" style={{ display: 'grid', gap: 16 }}>
      {newButtonPortalTarget ? createPortal(createPartnerButton, newButtonPortalTarget) : null}

      <article className="dashboard-card gestionale-partner-list-card">
        <div className="panel-header gestionale-partner-toolbar">
          <h3>Partner</h3>
          <div className="panel-actions gestionale-partner-toolbar-actions">
            <label className="gestionale-partner-search" aria-label="Ricerca partner">
              <span className="gestionale-partner-search-icon" aria-hidden="true"><SearchIcon /></span>
              <input
                type="search"
                className="gestionale-partner-search-input"
                value={partnerQuery}
                onChange={(event) => setPartnerQuery(event.target.value)}
                placeholder="Cerca per ragione sociale, referente, telefono o email"
              />
            </label>
            <label className="gestionale-partner-include-toggle">
              <input
                type="checkbox"
                checked={showDeleted}
                onChange={(e) => setShowDeleted(e.target.checked)}
              />
              Includi cancellati
            </label>
          </div>
        </div>

        <div className="table-scroll gestionale-partner-table-wrap">
          <table className="responsive-table partner-table gestionale-partner-table">
            <thead>
              <tr>
                <th>Ragione Sociale</th>
                <th>Telefono</th>
                <th>Email</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredPartners.map((partner) => {
                const isSelected = selectedPartnerId === partner.id;
                return (
                  <tr
                    key={partner.id}
                    className={`gestionale-partner-row ${isSelected ? 'is-selected' : ''} ${partner.deleted ? 'is-deleted' : ''}`}
                  >
                    <td>{partner.ragioneSociale}</td>
                    <td>{partner.telefono ?? '-'}</td>
                    <td>{partner.email ?? '-'}</td>
                    <td>
                      <div className="table-actions gestionale-partner-table-actions">
                        <button type="button" className="primary-button compact-button" onClick={() => selectPartner(partner.id)}>
                          <ButtonContent icon={<SelectIcon />}>Seleziona</ButtonContent>
                        </button>
                        <button
                          type="button"
                          className="primary-button compact-button"
                          onClick={() => openEditModal(partner.id)}
                          disabled={partner.deleted}
                        >
                          <ButtonContent icon={<EditIcon />}>Modifica</ButtonContent>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {loading && <p className="gestionale-partner-table-empty">Caricamento partner...</p>}
          {!loading && filteredPartners.length === 0 && <p className="gestionale-partner-table-empty">Nessun partner trovato.</p>}
        </div>

        <div className="gestionale-partner-mobile-list-wrap">
          <div className="gestionale-partner-mobile-list">
            {filteredPartners.map((partner) => {
              const isSelected = selectedPartnerId === partner.id;
              return (
                <button
                  key={`mobile-${partner.id}`}
                  type="button"
                  className={`gestionale-partner-mobile-item ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => {
                    if (isSelected) {
                      deselectPartner();
                    } else {
                      selectPartner(partner.id);
                    }
                  }}
                >
                  <span className="gestionale-partner-mobile-icon" aria-hidden="true">{typeLabel(partner.type).charAt(0)}</span>

                  <span className="gestionale-partner-mobile-main">
                    <span className="gestionale-partner-mobile-name">{partner.ragioneSociale}</span>
                    <span className="gestionale-partner-mobile-type">{typeLabel(partner.type)}</span>
                  </span>

                  <span className="gestionale-partner-mobile-chevron" aria-hidden="true">›</span>
                </button>
              );
            })}
          </div>

          {loading && <p className="gestionale-partner-table-empty">Caricamento partner...</p>}
          {!loading && filteredPartners.length === 0 && <p className="gestionale-partner-table-empty">Nessun partner trovato.</p>}
        </div>
      </article>

      {selectedPartnerDetail && (
        <article style={{ display: 'grid', gap: 14 }}>
          <div className="dashboard-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0 }}>{selectedPartnerDetail.ragioneSociale}</h3>
              </div>
              <p style={{ margin: '4px 0 0 0', color: '#6f7e8c' }}>{typeLabel(selectedPartnerDetail.type)}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="logout-button compact-button" onClick={deselectPartner}><ButtonContent icon={<CursorIcon />}>Deseleziona</ButtonContent></button>
              <button
                type="button"
                className="primary-button compact-button"
                onClick={() => selectedPartnerId && openEditModal(selectedPartnerId)}
                disabled={selectedPartnerDetail.deleted}
              >
                <ButtonContent icon={<EditIcon />}>Modifica</ButtonContent>
              </button>
              <button
                type="button"
                className="logout-button compact-button"
                onClick={deactivateSelectedPartner}
                disabled={selectedPartnerDetail.deleted}
                style={{ background: '#d32f2f', color: '#fff', borderColor: '#d32f2f' }}
              >
                <ButtonContent icon={<DeleteIcon />}>Cancella</ButtonContent>
              </button>
            </div>
          </div>

          <section>
            <h4 style={{ margin: '0 0 10px 0', fontSize: 14, letterSpacing: '0.12em', color: '#6f7e8c' }}>ANAGRAFICA & CONTATTO</h4>
            <div className="dashboard-card" style={{ paddingTop: 8, paddingBottom: 8 }}>
              <DetailRows
                rows={[
                  { label: 'Referente', value: valueOrDash(`${selectedPartnerDetail.nomeReferente ?? ''} ${selectedPartnerDetail.cognomeReferente ?? ''}`.trim()) },
                  { label: 'Telefono', value: valueOrDash(selectedPartnerDetail.telefono) },
                  { label: 'Email', value: valueOrDash(selectedPartnerDetail.email) },
                  { label: 'Citta`', value: valueOrDash(selectedPartnerDetail.citta) },
                  { label: 'Indirizzo', value: valueOrDash(selectedPartnerDetail.indirizzo) },
                  { label: 'Zona Operativa', value: valueOrDash(selectedPartnerDetail.zonaOperativa) }
                ]}
              />
            </div>
          </section>

          <section>
            <h4 style={{ margin: '0 0 10px 0', fontSize: 14, letterSpacing: '0.12em', color: '#6f7e8c' }}>DATI FISCALI</h4>
            <div className="dashboard-card" style={{ paddingTop: 8, paddingBottom: 8 }}>
              <DetailRows
                rows={[
                  { label: 'Partita IVA', value: valueOrDash(selectedPartnerDetail.partitaIva) },
                  { label: 'Codice Fiscale', value: valueOrDash(selectedPartnerDetail.codiceFiscale) },
                  { label: 'IBAN', value: valueOrDash(selectedPartnerDetail.iban) },
                  { label: 'Intestatario Conto', value: valueOrDash(selectedPartnerDetail.intestatarioConto) }
                ]}
              />
            </div>
          </section>

          <section>
            <h4 style={{ margin: '0 0 10px 0', fontSize: 14, letterSpacing: '0.12em', color: '#6f7e8c' }}>DASHBOARD CONTABILE</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {accountingMetricCard({ title: 'Servizi affidati', value: String(selectedPartnerDetail.numeroServiziAffidati) })}
              {accountingMetricCard({ title: 'Servizi ricevuti', value: String(selectedPartnerDetail.numeroServiziRicevuti) })}
            </div>
          </section>

          <section>
            <h4 style={{ margin: '0 0 10px 0', fontSize: 14, letterSpacing: '0.12em', color: '#6f7e8c' }}>ANALISI ECONOMICA</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {accountingMetricCard({ title: 'Margini OUTSOURCED', value: currencyEur(selectedPartnerDetail.totaleMarginiOutsourced), tone: 'positive' })}
              {accountingMetricCard({ title: 'Ricavi INCOMING', value: currencyEur(selectedPartnerDetail.totaleRicaviIncoming), tone: 'positive' })}
              {accountingMetricCard({ title: 'Totale guadagni', value: currencyEur(selectedPartnerDetail.totaleGuadagni) })}
            </div>
          </section>

          <section>
            <h4 style={{ margin: '0 0 10px 0', fontSize: 14, letterSpacing: '0.12em', color: '#6f7e8c' }}>GESTIONE FINANZIARIA</h4>
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                {accountingMetricCard({ title: 'Totale crediti', value: currencyEur(selectedPartnerDetail.totaleCrediti), tone: 'positive' })}
                {accountingMetricCard({ title: 'Totale debiti', value: currencyEur(selectedPartnerDetail.totaleDebiti), tone: 'negative' })}
                {accountingMetricCard({ title: 'Saldo netto', value: currencyEur(selectedPartnerDetail.saldoAttuale), tone: selectedPartnerDetail.saldoAttuale >= 0 ? 'positive' : 'negative' })}
              </div>
              <div className="dashboard-card" style={{ paddingTop: 8, paddingBottom: 8 }}>
                <DetailRows
                  rows={[
                    { label: 'Note Pagamenti', value: valueOrDash(selectedPartnerDetail.notePagamenti) },
                    { label: 'Crediti (partner paga te)', value: currencyEur(selectedPartnerDetail.totaleCrediti) },
                    { label: 'Debiti (tu paghi il partner)', value: currencyEur(selectedPartnerDetail.totaleDebiti) },
                    { label: 'Saldo Netto', value: currencyEur(selectedPartnerDetail.saldoAttuale) }
                  ]}
                />
              </div>
            </div>
          </section>

          <section>
            <h4 style={{ margin: '0 0 10px 0', fontSize: 14, letterSpacing: '0.12em', color: '#6f7e8c' }}>PREFERENZE & NOTE</h4>
            <div className="dashboard-card" style={{ paddingTop: 8, paddingBottom: 8 }}>
              <DetailRows
                rows={[
                  { label: 'Riceve Email', value: selectedPartnerDetail.riceveEmail ? 'Si' : 'No' },
                  { label: 'Riceve WhatsApp', value: selectedPartnerDetail.riceveWhatsApp ? 'Si' : 'No' },
                  { label: 'Telefono WhatsApp', value: valueOrDash(selectedPartnerDetail.telefonoWhatsApp) },
                  { label: 'Note Operative', value: valueOrDash(selectedPartnerDetail.noteOperative) }
                ]}
              />
            </div>
          </section>

        </article>
      )}

      {isFormModalOpen && (
        <div
          className="tenant-modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeFormModal();
            }
          }}
        >
          <article className="tenant-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="tenant-modal-header">
              <div>
                <h3>{editingPartnerId ? 'Modifica partner' : 'Nuovo partner'}</h3>
                <p>{editingPartnerId ? 'Aggiorna i dati anagrafici e operativi del partner.' : 'Inserisci un nuovo partner in anagrafica.'}</p>
              </div>
              <button
                type="button"
                className="tenant-modal-close"
                aria-label="Chiudi modale partner"
                onClick={closeFormModal}
              >
                ×
              </button>
            </div>

            <form className="form-grid" onSubmit={editingPartnerId ? updatePartner : createPartner}>
              <label>
                Tipologia
                <select className="form-input" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as PartnerType }))}>
                  <option value="AGENZIA">Agenzia</option>
                  <option value="NCC">NCC</option>
                  <option value="ALTRO">Altro</option>
                </select>
              </label>
              <label>
                Ragione Sociale
                <input className="form-input" value={form.ragioneSociale} onChange={(e) => setForm((p) => ({ ...p, ragioneSociale: e.target.value }))} required />
              </label>
              <label>
                Nome Referente
                <input className="form-input" value={form.nomeReferente} onChange={(e) => setForm((p) => ({ ...p, nomeReferente: e.target.value }))} />
              </label>
              <label>
                Cognome Referente
                <input className="form-input" value={form.cognomeReferente} onChange={(e) => setForm((p) => ({ ...p, cognomeReferente: e.target.value }))} />
              </label>
              <label>
                Telefono
                <input className="form-input" value={form.telefono} onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))} />
              </label>
              <label>
                Email
                <input className="form-input" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              </label>
              <label>
                Citta`
                <input className="form-input" value={form.citta} onChange={(e) => setForm((p) => ({ ...p, citta: e.target.value }))} />
              </label>
              <label>
                Indirizzo
                <input className="form-input" value={form.indirizzo} onChange={(e) => setForm((p) => ({ ...p, indirizzo: e.target.value }))} />
              </label>
              <label>
                Zona Operativa
                <input className="form-input" value={form.zonaOperativa} onChange={(e) => setForm((p) => ({ ...p, zonaOperativa: e.target.value }))} />
              </label>
              <label>
                Partita IVA
                <input className="form-input" value={form.partitaIva} onChange={(e) => setForm((p) => ({ ...p, partitaIva: e.target.value }))} />
              </label>
              <label>
                Codice Fiscale
                <input className="form-input" value={form.codiceFiscale} onChange={(e) => setForm((p) => ({ ...p, codiceFiscale: e.target.value }))} />
              </label>
              <label>
                IBAN
                <input className="form-input" value={form.iban} onChange={(e) => setForm((p) => ({ ...p, iban: e.target.value }))} />
              </label>
              <label>
                Intestatario Conto
                <input className="form-input" value={form.intestatarioConto} onChange={(e) => setForm((p) => ({ ...p, intestatarioConto: e.target.value }))} />
              </label>
              <label>
                Note Pagamenti
                <input className="form-input" value={form.notePagamenti} onChange={(e) => setForm((p) => ({ ...p, notePagamenti: e.target.value }))} />
              </label>
              <label>
                Telefono WhatsApp
                <input className="form-input" value={form.telefonoWhatsApp} onChange={(e) => setForm((p) => ({ ...p, telefonoWhatsApp: e.target.value }))} />
              </label>
              <label>
                Note Operative
                <input className="form-input" value={form.noteOperative} onChange={(e) => setForm((p) => ({ ...p, noteOperative: e.target.value }))} />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={form.riceveEmail} onChange={(e) => setForm((p) => ({ ...p, riceveEmail: e.target.checked }))} />
                Riceve Email
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={form.riceveWhatsApp} onChange={(e) => setForm((p) => ({ ...p, riceveWhatsApp: e.target.checked }))} />
                Riceve WhatsApp
              </label>
              <div className="form-actions" style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="primary-button compact-button">
                  <ButtonContent icon={editingPartnerId ? <SaveIcon /> : <AddIcon />}>
                    {editingPartnerId ? 'Salva modifiche' : 'Crea partner'}
                  </ButtonContent>
                </button>
                <button type="button" className="logout-button compact-button" onClick={() => setForm(defaultForm)}>
                  <ButtonContent icon={<ResetIcon />}>Reset</ButtonContent>
                </button>
              </div>
            </form>
          </article>
        </div>
      )}

      {error && <StatusNotice tone="error">{error}</StatusNotice>}
      {success && <StatusNotice tone="success">{success}</StatusNotice>}
    </section>
  );
}
