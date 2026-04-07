"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AddIcon, ButtonContent, CancelIcon, CopyIcon, SaveIcon, SearchIcon } from './action-icons';

type TenantOperationalStatus = 'ACTIVE' | 'SUSPENDED';
type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
type SubscriptionPlan = 'STARTER' | 'PRO' | 'ENTERPRISE';

type TenantItem = {
  id: number;
  businessName: string;
  vatNumber: string | null;
  taxCode: string | null;
  sdiCode: string | null;
  pecEmail: string | null;
  contactEmail: string;
  contactPhone: string | null;
  contactPerson: string | null;
  addressLine: string | null;
  addressCity: string | null;
  addressProvince: string | null;
  addressPostalCode: string | null;
  addressCountry: string | null;
  timezone: string;
  currency: string;
  language: string;
  notifyEmailEnabled: boolean;
  notifySmsEnabled: boolean;
  notifyPushEnabled: boolean;
  status: TenantOperationalStatus;
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlan: SubscriptionPlan;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  createdAt: string;
};

type ProvisioningPayload = {
  tenant: TenantItem;
  provisionedAdminUserId: string;
  provisionedAdminEmail: string;
  temporaryAdminPassword: string;
};

type FormState = {
  businessName: string;
  vatNumber: string;
  taxCode: string;
  sdiCode: string;
  pecEmail: string;
  contactEmail: string;
  contactPhone: string;
  contactPerson: string;
  addressLine: string;
  addressCity: string;
  addressProvince: string;
  addressPostalCode: string;
  addressCountry: string;
  timezone: string;
  currency: string;
  language: string;
  notifyEmailEnabled: boolean;
  notifySmsEnabled: boolean;
  notifyPushEnabled: boolean;
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlan: SubscriptionPlan;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
};

type FormTab = 'azienda' | 'indirizzo' | 'config' | 'notifiche' | 'brand';

type FormErrors = {
  businessName?: string;
  contactEmail?: string;
};

function tenantToForm(t: TenantItem): FormState {
  return {
    businessName: t.businessName,
    vatNumber: t.vatNumber ?? '',
    taxCode: t.taxCode ?? '',
    sdiCode: t.sdiCode ?? '',
    pecEmail: t.pecEmail ?? '',
    contactEmail: t.contactEmail,
    contactPhone: t.contactPhone ?? '',
    contactPerson: t.contactPerson ?? '',
    addressLine: t.addressLine ?? '',
    addressCity: t.addressCity ?? '',
    addressProvince: t.addressProvince ?? '',
    addressPostalCode: t.addressPostalCode ?? '',
    addressCountry: t.addressCountry ?? '',
    timezone: t.timezone,
    currency: t.currency,
    language: t.language,
    notifyEmailEnabled: t.notifyEmailEnabled,
    notifySmsEnabled: t.notifySmsEnabled,
    notifyPushEnabled: t.notifyPushEnabled,
    subscriptionStatus: t.subscriptionStatus,
    subscriptionPlan: t.subscriptionPlan,
    logoUrl: t.logoUrl ?? '',
    primaryColor: t.primaryColor ?? '#1e88e5',
    secondaryColor: t.secondaryColor ?? '#0f4c81',
  };
}

function NotifyBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span className={`tenant-notify-badge${active ? ' is-on' : ''}`}>
      {label} {active ? '✓' : '✕'}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="tenant-detail-info-row">
      <span className="tenant-detail-info-label">{label}</span>
      <span className="tenant-detail-info-value">{value ?? '—'}</span>
    </div>
  );
}

function TenantDetailView({
  tenant,
  onClose,
  onEdit,
}: {
  tenant: TenantItem;
  onClose: () => void;
  onEdit: () => void;
}) {
  const address = [
    tenant.addressLine,
    tenant.addressCity,
    tenant.addressProvince,
    tenant.addressPostalCode,
    tenant.addressCountry,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <article className="tenant-detail-card">
      <header className="tenant-detail-header">
        <div className="tenant-detail-title-wrap">
          <span className="tenant-detail-icon" aria-hidden="true">🏢</span>
          <div>
            <h3 className="tenant-detail-title">{tenant.businessName}</h3>
            <div className="tenant-detail-badges">
              <span className={`tenant-status-badge ${tenant.status === 'ACTIVE' ? 'is-active' : 'is-suspended'}`}>
                {tenant.status === 'ACTIVE' ? 'Attivo' : 'Sospeso'}
              </span>
              <span className="tenant-plan-badge">{tenant.subscriptionPlan}</span>
            </div>
          </div>
        </div>
        <div className="tenant-detail-actions">
          <button type="button" className="logout-button compact-button" onClick={onEdit}>Modifica</button>
          <button type="button" className="tenant-modal-close" onClick={onClose} aria-label="Chiudi dettaglio">✕</button>
        </div>
      </header>

      <div className="tenant-detail-body">
        <section className="tenant-detail-section">
          <h4 className="tenant-detail-section-title">🏛 DATI AZIENDALI</h4>
          <div className="tenant-detail-grid four-col">
            <InfoRow label="P.IVA" value={tenant.vatNumber} />
            <InfoRow label="Cod. Fiscale" value={tenant.taxCode} />
            <InfoRow label="SDI" value={tenant.sdiCode} />
            <InfoRow label="PEC" value={tenant.pecEmail} />
          </div>
        </section>

        <section className="tenant-detail-section">
          <h4 className="tenant-detail-section-title">✉ CONTATTI</h4>
          <div className="tenant-detail-grid three-col">
            <InfoRow label="Email" value={tenant.contactEmail} />
            <InfoRow label="Telefono" value={tenant.contactPhone} />
            <InfoRow label="Referente" value={tenant.contactPerson} />
          </div>
        </section>

        {address && (
          <section className="tenant-detail-section">
            <h4 className="tenant-detail-section-title">📍 SEDE</h4>
            <p className="tenant-detail-address">{address}</p>
          </section>
        )}

        <section className="tenant-detail-section">
          <h4 className="tenant-detail-section-title">⚙ CONFIGURAZIONE</h4>
          <div className="tenant-detail-grid three-col">
            <InfoRow label="Timezone" value={tenant.timezone} />
            <InfoRow label="Valuta" value={tenant.currency} />
            <InfoRow label="Lingua" value={tenant.language} />
          </div>
        </section>

        <section className="tenant-detail-section">
          <h4 className="tenant-detail-section-title">🔔 NOTIFICHE</h4>
          <div className="tenant-detail-notify-row">
            <NotifyBadge active={tenant.notifyEmailEnabled} label="Email" />
            <NotifyBadge active={tenant.notifySmsEnabled} label="SMS" />
            <NotifyBadge active={tenant.notifyPushEnabled} label="Push" />
          </div>
        </section>

        {(tenant.primaryColor || tenant.secondaryColor) && (
          <section className="tenant-detail-section">
            <h4 className="tenant-detail-section-title">⚡ BRANDING</h4>
            <div className="tenant-detail-colors">
              {tenant.primaryColor && <span className="tenant-color-swatch" style={{ background: tenant.primaryColor }} title={tenant.primaryColor} />}
              {tenant.secondaryColor && <span className="tenant-color-swatch" style={{ background: tenant.secondaryColor }} title={tenant.secondaryColor} />}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}

const defaultFormState: FormState = {
  businessName: '',
  vatNumber: '',
  taxCode: '',
  sdiCode: '',
  pecEmail: '',
  contactEmail: '',
  contactPhone: '',
  contactPerson: '',
  addressLine: '',
  addressCity: '',
  addressProvince: '',
  addressPostalCode: '',
  addressCountry: 'Italia',
  timezone: 'Europe/Rome',
  currency: 'EUR',
  language: 'it',
  notifyEmailEnabled: true,
  notifySmsEnabled: false,
  notifyPushEnabled: false,
  subscriptionStatus: 'TRIAL',
  subscriptionPlan: 'STARTER',
  logoUrl: '',
  primaryColor: '#1e88e5',
  secondaryColor: '#0f4c81'
};

export function AdminTenantsPanel() {
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenantId, setEditingTenantId] = useState<number | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<TenantItem | null>(null);
  const [activeTab, setActiveTab] = useState<FormTab>('azienda');
  const [form, setForm] = useState<FormState>(defaultFormState);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [lastProvisioning, setLastProvisioning] = useState<ProvisioningPayload | null>(null);

  const orderedTenants = useMemo(
    () => [...tenants].sort((a, b) => b.id - a.id),
    [tenants]
  );

  useEffect(() => {
    void loadTenants('');
  }, []);

  async function loadTenants(query?: string) {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    const normalizedQuery = (query ?? '').trim();
    if (normalizedQuery.length > 0) {
      params.set('q', normalizedQuery);
    }

    const response = await fetch(`/api/admin/tenants?${params.toString()}`, { cache: 'no-store' });
    const payload = (await response.json().catch(() => [])) as TenantItem[] | { message?: string };

    if (!response.ok) {
      setError((payload as { message?: string }).message ?? 'Errore caricamento tenant');
      setLoading(false);
      return;
    }

    const list = payload as TenantItem[];
    setTenants(list);
    setLoading(false);
    setSelectedTenant((prev) => {
      if (!prev) return prev;
      return list.find((t) => t.id === prev.id) ?? prev;
    });
  }

  function openCreateModal() {
    setError(null);
    setSuccess(null);
    setLastProvisioning(null);
    setForm(defaultFormState);
    setFormErrors({});
    setActiveTab('azienda');
    setEditingTenantId(null);
    setIsModalOpen(true);
  }

  function openEditModal(tenant: TenantItem) {
    setError(null);
    setSuccess(null);
    setForm(tenantToForm(tenant));
    setFormErrors({});
    setActiveTab('azienda');
    setEditingTenantId(tenant.id);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (submitting) {
      return;
    }
    setIsModalOpen(false);
  }

  async function onSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadTenants(searchText);
  }

  async function onSaveTenant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const errors: FormErrors = {};
    if (!form.businessName.trim()) errors.businessName = 'Campo obbligatorio';
    if (!form.contactEmail.trim()) errors.contactEmail = 'Campo obbligatorio';
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setActiveTab('azienda');
      return;
    }
    setFormErrors({});
    setSubmitting(true);

    const isEdit = editingTenantId !== null;
    const url = isEdit ? `/api/admin/tenants/${editingTenantId}` : '/api/admin/tenants';
    const method = isEdit ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });

    const payload = (await response.json().catch(() => ({}))) as ProvisioningPayload | TenantItem | { message?: string };
    setSubmitting(false);

    if (!response.ok) {
      setError((payload as { message?: string }).message ?? (isEdit ? 'Aggiornamento fallito' : 'Creazione tenant fallita'));
      return;
    }

    if (isEdit) {
      const updated = payload as TenantItem;
      setTenants((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setSelectedTenant(updated);
      setSuccess(`Tenant ${updated.businessName} aggiornato`);
    } else {
      const provisioning = payload as ProvisioningPayload;
      setLastProvisioning(provisioning);
      setSuccess(`Tenant ${provisioning.tenant.businessName} creato correttamente`);
    }

    setIsModalOpen(false);
    await loadTenants(searchText);
  }

  async function updateTenantStatus(tenantId: number, status: TenantOperationalStatus) {
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/admin/tenants/${tenantId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });

    const payload = (await response.json().catch(() => ({}))) as TenantItem | { message?: string };

    if (!response.ok) {
      setError((payload as { message?: string }).message ?? 'Aggiornamento stato tenant fallito');
      return;
    }

    const updated = payload as TenantItem;
    setTenants((prev) => prev.map((tenant) => (tenant.id === updated.id ? updated : tenant)));
    if (selectedTenant?.id === updated.id) setSelectedTenant(updated);
    setSuccess(`Tenant ${updated.businessName}: stato aggiornato a ${updated.status}`);
  }

  return (
    <section className="tenant-panel">
      <header className="tenant-header">
        <div className="tenant-title-wrap">
          <div className="tenant-title-icon" aria-hidden="true">🏢</div>
          <div>
            <h2 className="tenant-title">Gestione Tenant</h2>
            <p className="tenant-subtitle">{tenants.length} tenant registrati</p>
          </div>
        </div>

        <button type="button" className="primary-button" onClick={openCreateModal}>
          <ButtonContent icon={<AddIcon />}>Nuovo Tenant</ButtonContent>
        </button>
      </header>

      {lastProvisioning && (
        <article className="tenant-provisioning-card">
          <header className="tenant-provisioning-header">
            <span className="tenant-provisioning-icon" aria-hidden="true">ⓘ</span>
            <strong className="tenant-provisioning-title">Utente GESTIONALE creato automaticamente</strong>
          </header>
          <div className="tenant-provisioning-row">
            <span className="tenant-provisioning-label">User ID:</span>
            <span className="tenant-provisioning-value">{lastProvisioning.provisionedAdminUserId}</span>
            <span className="tenant-provisioning-sep">|</span>
            <span className="tenant-provisioning-label">Email:</span>
            <span className="tenant-provisioning-value">{lastProvisioning.provisionedAdminEmail}</span>
            <button
              type="button"
              className="tenant-provisioning-copy"
              aria-label="Copia User ID ed Email"
              onClick={() => void navigator.clipboard.writeText(`${lastProvisioning.provisionedAdminUserId} | ${lastProvisioning.provisionedAdminEmail}`)}
            >
              <CopyIcon />
            </button>
          </div>
          <div className="tenant-provisioning-row">
            <span className="tenant-provisioning-label">Password temporanea:</span>
            <span className="tenant-provisioning-value">{lastProvisioning.temporaryAdminPassword}</span>
            <button
              type="button"
              className="tenant-provisioning-copy"
              aria-label="Copia password temporanea"
              onClick={() => void navigator.clipboard.writeText(lastProvisioning.temporaryAdminPassword)}
            >
              <CopyIcon />
            </button>
          </div>
        </article>
      )}

      <form className="tenant-search" onSubmit={onSearchSubmit}>
        <label className="tenant-search-field" aria-label="Cerca tenant">
          <span className="tenant-search-icon" aria-hidden="true"><SearchIcon /></span>
          <input
            className="form-input"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Cerca per nome o email..."
          />
        </label>
      </form>

      {error && <p className="error-text">{error}</p>}
      {success && <p className="success-text">{success}</p>}

      {selectedTenant && (
        <TenantDetailView
          tenant={selectedTenant}
          onClose={() => setSelectedTenant(null)}
          onEdit={() => openEditModal(selectedTenant)}
        />
      )}

      <article className="dashboard-card tenant-table-card">
        {loading ? (
          <p>Caricamento tenant...</p>
        ) : orderedTenants.length === 0 ? (
          <div className="tenant-empty">Nessun tenant trovato</div>
        ) : (
          <div className="table-scroll">
            <table className="responsive-table tenant-table">
              <thead>
                <tr>
                  <th align="left">Azienda</th>
                  <th align="left">Email</th>
                  <th align="left">Citta</th>
                  <th align="left">Piano</th>
                  <th align="left">Stato</th>
                  <th align="left">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {orderedTenants.map((tenant) => {
                  const nextStatus: TenantOperationalStatus = tenant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
                  const actionLabel = tenant.status === 'ACTIVE' ? 'Sospendi' : 'Attiva';
                  const isSelected = selectedTenant?.id === tenant.id;

                  return (
                    <tr key={tenant.id} className={isSelected ? 'is-selected-row' : ''}>
                      <td>{tenant.businessName}</td>
                      <td>{tenant.contactEmail}</td>
                      <td>{tenant.addressCity ?? '-'}</td>
                      <td>{tenant.subscriptionPlan}</td>
                      <td>
                        <span className={`tenant-status-badge ${tenant.status === 'ACTIVE' ? 'is-active' : 'is-suspended'}`}>
                          {tenant.status === 'ACTIVE' ? 'Attivo' : 'Sospeso'}
                        </span>
                      </td>
                      <td className="tenant-actions-cell">
                        <button
                          type="button"
                          className="primary-button compact-button"
                          onClick={() => setSelectedTenant(isSelected ? null : tenant)}
                        >
                          {isSelected ? 'Deseleziona' : 'Seleziona'}
                        </button>
                        <button
                          type="button"
                          className="logout-button compact-button"
                          onClick={() => { void updateTenantStatus(tenant.id, nextStatus); }}
                        >
                          {actionLabel}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {isModalOpen && (
        <div className="tenant-modal-overlay" role="dialog" aria-modal="true" aria-label={editingTenantId !== null ? 'Modifica Tenant' : 'Nuovo Tenant'}>
          <article className="tenant-modal-card">
            <header className="tenant-modal-header">
              <div>
                <h3>{editingTenantId !== null ? 'Modifica Tenant' : 'Nuovo Tenant'}</h3>
                <p>{editingTenantId !== null ? 'Modifica i dati del tenant selezionato.' : 'Compila i dati per creare un nuovo tenant. Un utente gestionale verra creato automaticamente.'}</p>
              </div>
              <button type="button" className="tenant-modal-close" onClick={closeModal} aria-label="Chiudi modal">x</button>
            </header>

            <nav className="tenant-modal-tabs" aria-label="Sezioni form tenant">
              <button type="button" className={`tenant-tab ${activeTab === 'azienda' ? 'is-active' : ''}`} onClick={() => setActiveTab('azienda')}>Azienda</button>
              <button type="button" className={`tenant-tab ${activeTab === 'indirizzo' ? 'is-active' : ''}`} onClick={() => setActiveTab('indirizzo')}>Indirizzo</button>
              <button type="button" className={`tenant-tab ${activeTab === 'config' ? 'is-active' : ''}`} onClick={() => setActiveTab('config')}>Config</button>
              <button type="button" className={`tenant-tab ${activeTab === 'notifiche' ? 'is-active' : ''}`} onClick={() => setActiveTab('notifiche')}>Notifiche</button>
              <button type="button" className={`tenant-tab ${activeTab === 'brand' ? 'is-active' : ''}`} onClick={() => setActiveTab('brand')}>Brand</button>
            </nav>

            <form className="tenant-form" onSubmit={onSaveTenant}>
              {activeTab === 'azienda' && (
                <section className="tenant-form-grid two-col">
                  <label className="tenant-field full-width">
                    Ragione Sociale<span className="required-asterisk" aria-hidden="true">*</span>
                    <input
                      className={`form-input${formErrors.businessName ? ' is-invalid' : ''}`}
                      value={form.businessName}
                      onChange={(event) => setForm((prev) => ({ ...prev, businessName: event.target.value }))}
                    />
                    {formErrors.businessName && <span className="tenant-field-error">{formErrors.businessName}</span>}
                  </label>

                  <label className="tenant-field">
                    Partita IVA
                    <input className="form-input" value={form.vatNumber} onChange={(event) => setForm((prev) => ({ ...prev, vatNumber: event.target.value }))} placeholder="IT01234567890" />
                  </label>

                  <label className="tenant-field">
                    Codice Fiscale
                    <input className="form-input" value={form.taxCode} onChange={(event) => setForm((prev) => ({ ...prev, taxCode: event.target.value }))} placeholder="01234567890" />
                  </label>

                  <label className="tenant-field">
                    Codice SDI
                    <input className="form-input" value={form.sdiCode} onChange={(event) => setForm((prev) => ({ ...prev, sdiCode: event.target.value }))} placeholder="ABCDEFG" />
                  </label>

                  <label className="tenant-field">
                    PEC
                    <input className="form-input" type="email" value={form.pecEmail} onChange={(event) => setForm((prev) => ({ ...prev, pecEmail: event.target.value }))} placeholder="azienda@pec.it" />
                  </label>

                  <label className="tenant-field">
                    Email Contatto<span className="required-asterisk" aria-hidden="true">*</span>
                    <input
                      className={`form-input${formErrors.contactEmail ? ' is-invalid' : ''}`}
                      type="email"
                      value={form.contactEmail}
                      onChange={(event) => setForm((prev) => ({ ...prev, contactEmail: event.target.value }))}
                      placeholder="info@azienda.it"
                    />
                    {formErrors.contactEmail && <span className="tenant-field-error">{formErrors.contactEmail}</span>}
                  </label>

                  <label className="tenant-field">
                    Telefono
                    <input className="form-input" value={form.contactPhone} onChange={(event) => setForm((prev) => ({ ...prev, contactPhone: event.target.value }))} placeholder="+39 02 1234567" />
                  </label>

                  <label className="tenant-field full-width">
                    Referente
                    <input className="form-input" value={form.contactPerson} onChange={(event) => setForm((prev) => ({ ...prev, contactPerson: event.target.value }))} placeholder="Nome Cognome" />
                  </label>
                </section>
              )}

              {activeTab === 'indirizzo' && (
                <section className="tenant-form-grid two-col">
                  <label className="tenant-field full-width">
                    Indirizzo
                    <input className="form-input" value={form.addressLine} onChange={(event) => setForm((prev) => ({ ...prev, addressLine: event.target.value }))} placeholder="Via Roma 1" />
                  </label>

                  <label className="tenant-field">
                    Citta
                    <input className="form-input" value={form.addressCity} onChange={(event) => setForm((prev) => ({ ...prev, addressCity: event.target.value }))} />
                  </label>

                  <label className="tenant-field">
                    Provincia
                    <input className="form-input" value={form.addressProvince} onChange={(event) => setForm((prev) => ({ ...prev, addressProvince: event.target.value }))} />
                  </label>

                  <label className="tenant-field">
                    CAP
                    <input className="form-input" value={form.addressPostalCode} onChange={(event) => setForm((prev) => ({ ...prev, addressPostalCode: event.target.value }))} />
                  </label>

                  <label className="tenant-field">
                    Paese
                    <input className="form-input" value={form.addressCountry} onChange={(event) => setForm((prev) => ({ ...prev, addressCountry: event.target.value }))} />
                  </label>
                </section>
              )}

              {activeTab === 'config' && (
                <section className="tenant-form-grid two-col">
                  <label className="tenant-field">
                    Timezone
                    <input className="form-input" value={form.timezone} onChange={(event) => setForm((prev) => ({ ...prev, timezone: event.target.value }))} />
                  </label>

                  <label className="tenant-field">
                    Valuta
                    <input className="form-input" value={form.currency} onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value }))} />
                  </label>

                  <label className="tenant-field">
                    Lingua
                    <input className="form-input" value={form.language} onChange={(event) => setForm((prev) => ({ ...prev, language: event.target.value }))} />
                  </label>

                  <label className="tenant-field">
                    Stato abbonamento
                    <select className="form-input" value={form.subscriptionStatus} onChange={(event) => setForm((prev) => ({ ...prev, subscriptionStatus: event.target.value as SubscriptionStatus }))}>
                      <option value="TRIAL">TRIAL</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="PAST_DUE">PAST_DUE</option>
                      <option value="CANCELED">CANCELED</option>
                    </select>
                  </label>

                  <label className="tenant-field">
                    Piano
                    <select className="form-input" value={form.subscriptionPlan} onChange={(event) => setForm((prev) => ({ ...prev, subscriptionPlan: event.target.value as SubscriptionPlan }))}>
                      <option value="STARTER">STARTER</option>
                      <option value="PRO">PRO</option>
                      <option value="ENTERPRISE">ENTERPRISE</option>
                    </select>
                  </label>
                </section>
              )}

              {activeTab === 'notifiche' && (
                <section className="tenant-form-grid one-col">
                  <label className="inline-checkbox">
                    <input type="checkbox" checked={form.notifyEmailEnabled} onChange={(event) => setForm((prev) => ({ ...prev, notifyEmailEnabled: event.target.checked }))} />
                    Notifiche email abilitate
                  </label>
                  <label className="inline-checkbox">
                    <input type="checkbox" checked={form.notifySmsEnabled} onChange={(event) => setForm((prev) => ({ ...prev, notifySmsEnabled: event.target.checked }))} />
                    Notifiche SMS abilitate
                  </label>
                  <label className="inline-checkbox">
                    <input type="checkbox" checked={form.notifyPushEnabled} onChange={(event) => setForm((prev) => ({ ...prev, notifyPushEnabled: event.target.checked }))} />
                    Notifiche push abilitate
                  </label>
                </section>
              )}

              {activeTab === 'brand' && (
                <section className="tenant-form-grid two-col">
                  <label className="tenant-field full-width">
                    URL logo
                    <input className="form-input" value={form.logoUrl} onChange={(event) => setForm((prev) => ({ ...prev, logoUrl: event.target.value }))} placeholder="https://..." />
                  </label>

                  <label className="tenant-field">
                    Colore primario
                    <input className="form-input" value={form.primaryColor} onChange={(event) => setForm((prev) => ({ ...prev, primaryColor: event.target.value }))} />
                  </label>

                  <label className="tenant-field">
                    Colore secondario
                    <input className="form-input" value={form.secondaryColor} onChange={(event) => setForm((prev) => ({ ...prev, secondaryColor: event.target.value }))} />
                  </label>
                </section>
              )}

              <footer className="tenant-modal-actions">
                <button type="button" className="logout-button" onClick={closeModal}>
                  <ButtonContent icon={<CancelIcon />}>Annulla</ButtonContent>
                </button>
                <button type="submit" className="primary-button" disabled={submitting}>
                  <ButtonContent icon={<SaveIcon />}>
                    {submitting
                      ? (editingTenantId !== null ? 'Salvataggio...' : 'Creazione...')
                      : (editingTenantId !== null ? 'Salva Modifiche' : 'Crea Tenant')}
                  </ButtonContent>
                </button>
              </footer>
            </form>
          </article>
        </div>
      )}
    </section>
  );
}
