"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AddIcon, ButtonContent, CancelIcon, DeleteIcon, EditIcon, ResetIcon, SaveIcon, SearchIcon, SelectIcon } from './action-icons';
import { PasswordInput } from './password-input';

type LicenseType = 'AM' | 'A1' | 'A2' | 'A' | 'B' | 'BE' | 'C' | 'CE' | 'D' | 'DE' | 'CQC';

type DriverItem = {
  id: number;
  userId: string;
  email: string;
  role: string;
  enabled: boolean;
  createdAt: string;
  firstName: string | null;
  lastName: string | null;
  birthDate: string | null;
  licenseNumber: string | null;
  licenseTypes: string[];
  residentialAddresses: string[];
  mobilePhone: string | null;
  licenseExpiryDate: string | null;
};

type DriverFormState = {
  userId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  licenseNumber: string;
  licenseTypes: LicenseType[];
  residentialAddresses: string[];
  mobilePhone: string;
  licenseExpiryDate: string;
};

const licenseTypeOptions: LicenseType[] = ['AM', 'A1', 'A2', 'A', 'B', 'BE', 'C', 'CE', 'D', 'DE', 'CQC'];

const defaultForm: DriverFormState = {
  userId: '',
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  birthDate: '',
  licenseNumber: '',
  licenseTypes: ['B'],
  residentialAddresses: [''],
  mobilePhone: '',
  licenseExpiryDate: ''
};

function formatDate(value: string | null) {
  if (!value) {
    return '-';
  }
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString('it-IT');
}

function daysToDate(value: string | null) {
  if (!value) {
    return null;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${value}T00:00:00`);
  if (Number.isNaN(due.getTime())) {
    return null;
  }
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function GestionaleDriversPanel() {
  const [drivers, setDrivers] = useState<DriverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [driverQuery, setDriverQuery] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [editingDriverId, setEditingDriverId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newButtonPortalTarget, setNewButtonPortalTarget] = useState<HTMLElement | null>(null);
  const [form, setForm] = useState<DriverFormState>(defaultForm);

  const selectedDriver = useMemo(
    () => drivers.find((item) => item.id === selectedDriverId) ?? null,
    [drivers, selectedDriverId]
  );

  const filteredDrivers = useMemo(() => {
    const query = driverQuery.trim().toLowerCase();
    if (!query) {
      return drivers;
    }

    return drivers.filter((driver) => {
      const searchableParts = [
        driver.firstName ?? '',
        driver.lastName ?? '',
        driver.licenseNumber ?? '',
        driver.userId ?? '',
        driver.email ?? '',
        (driver.licenseTypes ?? []).join(' ')
      ];

      return searchableParts.join(' ').toLowerCase().includes(query);
    });
  }, [drivers, driverQuery]);

  async function loadDrivers(nextIncludeDeleted = includeDeleted) {
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/gestionale/drivers?includeDeleted=${nextIncludeDeleted ? 'true' : 'false'}`, {
      cache: 'no-store'
    });
    const payload = (await response.json().catch(() => [])) as DriverItem[] | { message?: string };

    if (!response.ok) {
      setError((payload as { message?: string }).message ?? 'Errore caricamento driver');
      setLoading(false);
      return;
    }

    const nextDrivers = payload as DriverItem[];
    setDrivers(nextDrivers);
    setLoading(false);

    if (selectedDriverId && !nextDrivers.some((driver) => driver.id === selectedDriverId)) {
      setSelectedDriverId(null);
      setEditingDriverId(null);
      setIsFormOpen(false);
      setForm(defaultForm);
    }
  }

  useEffect(() => {
    loadDrivers();
  }, []);

  useEffect(() => {
    setNewButtonPortalTarget(document.getElementById('gestionale-driver-new-button-portal'));
  }, []);

  async function onToggleIncludeDeleted(checked: boolean) {
    setIncludeDeleted(checked);
    await loadDrivers(checked);
  }

  function resetForm() {
    setForm(defaultForm);
    setEditingDriverId(null);
  }

  function openCreateForm() {
    resetForm();
    setIsFormOpen(true);
  }

  function mapDriverToForm(driver: DriverItem): DriverFormState {
    const normalizedLicenseTypes = (driver.licenseTypes?.length ? driver.licenseTypes : ['B'])
      .filter((value): value is LicenseType => licenseTypeOptions.includes(value as LicenseType));

    return {
      userId: driver.userId,
      email: driver.email,
      password: '',
      firstName: driver.firstName ?? '',
      lastName: driver.lastName ?? '',
      birthDate: driver.birthDate ?? '',
      licenseNumber: driver.licenseNumber ?? '',
      licenseTypes: normalizedLicenseTypes.length > 0 ? normalizedLicenseTypes : ['B'],
      residentialAddresses: driver.residentialAddresses?.length ? driver.residentialAddresses : [''],
      mobilePhone: driver.mobilePhone ?? '',
      licenseExpiryDate: driver.licenseExpiryDate ?? ''
    };
  }

  function onSelectDriver(driver: DriverItem) {
    setSelectedDriverId(driver.id);
  }

  function onEditDriver(driver: DriverItem) {
    setSelectedDriverId(driver.id);
    setEditingDriverId(driver.id);
    setForm(mapDriverToForm(driver));
    setIsFormOpen(true);
    setError(null);
    setSuccess(null);
  }

  function toggleLicenseType(type: LicenseType) {
    setForm((prev) => {
      const exists = prev.licenseTypes.includes(type);
      if (exists) {
        const next = prev.licenseTypes.filter((item) => item !== type);
        return { ...prev, licenseTypes: next.length > 0 ? next : prev.licenseTypes };
      }
      return { ...prev, licenseTypes: [...prev.licenseTypes, type] };
    });
  }

  function updateAddress(index: number, value: string) {
    setForm((prev) => ({
      ...prev,
      residentialAddresses: prev.residentialAddresses.map((item, itemIndex) => (itemIndex === index ? value : item))
    }));
  }

  function addAddress() {
    setForm((prev) => ({
      ...prev,
      residentialAddresses: [...prev.residentialAddresses, '']
    }));
  }

  function removeAddress(index: number) {
    setForm((prev) => {
      if (prev.residentialAddresses.length <= 1) {
        return prev;
      }
      return {
        ...prev,
        residentialAddresses: prev.residentialAddresses.filter((_, itemIndex) => itemIndex !== index)
      };
    });
  }

  async function onDeleteDriver(driverId: number) {
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/gestionale/drivers/${driverId}`, { method: 'DELETE' });
    const payload = (await response.json().catch(() => ({}))) as { message?: string };

    if (!response.ok) {
      setError(payload.message ?? 'Cancellazione driver fallita');
      return;
    }

    setSuccess('Driver disattivato (cancellazione logica)');
    if (selectedDriverId === driverId) {
      setSelectedDriverId(null);
      setEditingDriverId(null);
      setIsFormOpen(false);
    }
    await loadDrivers();
  }

  async function onRestoreDriver(driverId: number) {
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/gestionale/drivers/${driverId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true })
    });
    const payload = (await response.json().catch(() => ({}))) as { message?: string };

    if (!response.ok) {
      setError(payload.message ?? 'Ripristino driver fallito');
      return;
    }

    setSuccess('Driver ripristinato');
    await loadDrivers();
  }

  async function onCreateDriver(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const normalizedAddresses = form.residentialAddresses
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    const payloadToSend = {
      firstName: form.firstName,
      lastName: form.lastName,
      birthDate: form.birthDate,
      licenseNumber: form.licenseNumber,
      licenseTypes: form.licenseTypes,
      residentialAddresses: normalizedAddresses,
      mobilePhone: form.mobilePhone,
      licenseExpiryDate: form.licenseExpiryDate
    };

    const targetUrl = editingDriverId ? `/api/gestionale/drivers/${editingDriverId}` : '/api/gestionale/drivers';
    const method = editingDriverId ? 'PUT' : 'POST';

    const requestBody = editingDriverId
      ? payloadToSend
      : {
        userId: form.userId,
        email: form.email,
        password: form.password,
        ...payloadToSend
      };

    const response = await fetch(targetUrl, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const payload = (await response.json().catch(() => ({}))) as { message?: string; userId?: string };

    setSubmitting(false);

    if (!response.ok) {
      setError(payload.message ?? 'Salvataggio driver fallito');
      return;
    }

    if (editingDriverId) {
      setSuccess('Driver aggiornato');
    } else {
      setSuccess(`Driver creato: ${payload.userId ?? form.userId}`);
      resetForm();
    }
    await loadDrivers();
  }

  const createDriverButton = (
    <button
      type="button"
      className="primary-button compact-button"
      onClick={openCreateForm}
    >
      <ButtonContent icon={<AddIcon />}>Nuovo driver</ButtonContent>
    </button>
  );

  return (
    <section className="responsive-panel gestionale-panel" style={{ display: 'grid', gap: 16 }}>
      {newButtonPortalTarget ? createPortal(createDriverButton, newButtonPortalTarget) : null}
      <article className="dashboard-card gestionale-driver-list-card">
        <div className="panel-header gestionale-driver-toolbar">
          <h3>Driver</h3>
          <div className="panel-actions gestionale-driver-toolbar-actions">
            <label className="gestionale-driver-search" aria-label="Ricerca driver">
              <span className="gestionale-driver-search-icon" aria-hidden="true"><SearchIcon /></span>
              <input
                type="search"
                className="gestionale-driver-search-input"
                value={driverQuery}
                onChange={(event) => setDriverQuery(event.target.value)}
                placeholder="Cerca per nome, cognome o patente"
              />
            </label>
            <label className="gestionale-driver-include-toggle">
              <input
                type="checkbox"
                checked={includeDeleted}
                onChange={(event) => onToggleIncludeDeleted(event.target.checked)}
              />
              Includi cancellati
            </label>
          </div>
        </div>

        <div className="table-scroll gestionale-driver-table-wrap">
          <table className="responsive-table driver-table gestionale-driver-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Cognome</th>
                <th>Nascita</th>
                <th>Patente</th>
                <th>Scadenza</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map((driver) => {
                const isSelected = selectedDriverId === driver.id;
                const daysLeft = daysToDate(driver.licenseExpiryDate);
                const isExpirySoon = driver.enabled && daysLeft !== null && daysLeft >= 0 && daysLeft <= 15;

                return (
                  <tr
                    key={driver.id}
                    className={`gestionale-driver-row ${isSelected ? 'is-selected' : ''} ${driver.enabled ? '' : 'is-disabled'}`}
                  >
                    <td>{driver.firstName ?? '-'}</td>
                    <td>{driver.lastName ?? '-'}</td>
                    <td>{formatDate(driver.birthDate)}</td>
                    <td>
                      <div className="gestionale-driver-license">
                        <span className="gestionale-driver-license-number">{driver.licenseNumber ?? '-'}</span>
                        {!!driver.licenseTypes?.length && (
                          <div className="driver-license-badges">
                            {driver.licenseTypes.map((licenseType) => (
                              <span key={`${driver.id}-${licenseType}`} className="driver-license-badge">
                                {licenseType}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div>{formatDate(driver.licenseExpiryDate)}</div>
                      {isExpirySoon && <small className="warning-text">Scade tra {daysLeft} gg</small>}
                    </td>
                    <td>
                      <div className="table-actions gestionale-driver-table-actions">
                        <button type="button" className="primary-button compact-button" onClick={() => onSelectDriver(driver)}>
                          <ButtonContent icon={<SelectIcon />}>Seleziona</ButtonContent>
                        </button>
                        <button type="button" className="primary-button compact-button" onClick={() => onEditDriver(driver)}>
                          <ButtonContent icon={<EditIcon />}>Modifica</ButtonContent>
                        </button>
                        {driver.enabled ? (
                          <button
                            type="button"
                            className="primary-button compact-button"
                            style={{ background: '#d32f2f' }}
                            onClick={() => onDeleteDriver(driver.id)}
                          >
                            <ButtonContent icon={<DeleteIcon />}>Cancella</ButtonContent>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="primary-button compact-button"
                            style={{ background: '#7cb342' }}
                            onClick={() => onRestoreDriver(driver.id)}
                          >
                            <ButtonContent icon={<ResetIcon />}>Ripristina</ButtonContent>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {loading && <p className="gestionale-driver-table-empty">Caricamento driver...</p>}
          {!loading && filteredDrivers.length === 0 && <p className="gestionale-driver-table-empty">Nessun driver trovato.</p>}
        </div>
      </article>

      {selectedDriver && (
        <article className="dashboard-card">
          <h4>Driver selezionato</h4>
          <p>
            <strong>{selectedDriver.firstName ?? '-'} {selectedDriver.lastName ?? '-'}</strong>
            {' - '}
            {selectedDriver.userId}
            {' - '}
            {selectedDriver.mobilePhone ?? '-'}
          </p>
          <p style={{ marginTop: 6 }}>
            Residenza: {(selectedDriver.residentialAddresses ?? []).join(' | ') || '-'}
          </p>
        </article>
      )}

      {isFormOpen && (
        <div
          className="tenant-modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsFormOpen(false);
              resetForm();
            }
          }}
        >
          <article className="tenant-modal-card driver-edit-modal" onClick={(event) => event.stopPropagation()}>
            <div className="tenant-modal-header">
              <div>
                <h3>{editingDriverId ? 'Modifica driver' : 'Nuovo driver'}</h3>
                <p>{editingDriverId ? 'Aggiorna i dati anagrafici e patente del driver.' : 'Inserisci un nuovo driver e le credenziali iniziali.'}</p>
              </div>
              <button
                type="button"
                className="tenant-modal-close"
                aria-label="Chiudi modale driver"
                onClick={() => {
                  setIsFormOpen(false);
                  resetForm();
                }}
              >
                ×
              </button>
            </div>

            <form className="form-grid" onSubmit={onCreateDriver}>
              {!editingDriverId && (
                <div className="dashboard-card" style={{ background: '#eef6ff' }}>
                  <strong>Credenziali iniziali</strong>
                  <div className="responsive-form-grid" style={{ display: 'grid', gap: 12, marginTop: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
                    <label>
                      User ID driver
                      <input
                        className="form-input"
                        value={form.userId}
                        onChange={(event) => setForm((prev) => ({ ...prev, userId: event.target.value }))}
                        required
                      />
                    </label>
                    <label>
                      Email driver
                      <input
                        className="form-input"
                        type="email"
                        value={form.email}
                        onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                        required
                      />
                    </label>
                    <label>
                      Password iniziale
                      <PasswordInput
                        className="form-input"
                        minLength={8}
                        value={form.password}
                        onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                        required
                        autoComplete="new-password"
                      />
                    </label>
                  </div>
                </div>
              )}

              <div className="responsive-form-grid" style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                <label>
                  Nome
                  <input
                    className="form-input"
                    value={form.firstName}
                    onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  Cognome
                  <input
                    className="form-input"
                    value={form.lastName}
                    onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  Data di nascita
                  <input
                    className="form-input"
                    type="date"
                    value={form.birthDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, birthDate: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  Numero patente
                  <input
                    className="form-input"
                    value={form.licenseNumber}
                    onChange={(event) => setForm((prev) => ({ ...prev, licenseNumber: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  Cellulare
                  <input
                    className="form-input"
                    value={form.mobilePhone}
                    onChange={(event) => setForm((prev) => ({ ...prev, mobilePhone: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  Scadenza patente
                  <input
                    className="form-input"
                    type="date"
                    value={form.licenseExpiryDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, licenseExpiryDate: event.target.value }))}
                    required
                  />
                </label>
              </div>

              <div className="dashboard-card" style={{ background: '#f4f9ff' }}>
                <strong>Tipo patente (uno o piu)</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
                  {licenseTypeOptions.map((type) => (
                    <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="checkbox"
                        checked={form.licenseTypes.includes(type)}
                        onChange={() => toggleLicenseType(type)}
                      />
                      {type}
                    </label>
                  ))}
                </div>
              </div>

              <div className="dashboard-card" style={{ background: '#f4f9ff' }}>
                <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <strong>Indirizzi di residenza</strong>
                  <button type="button" className="primary-button compact-button" onClick={addAddress}><ButtonContent icon={<AddIcon />}>Aggiungi indirizzo</ButtonContent></button>
                </div>
                <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                  {form.residentialAddresses.map((address, index) => (
                    <div key={`address-${index}`} className="address-row" style={{ display: 'flex', gap: 8 }}>
                      <input
                        className="form-input"
                        value={address}
                        onChange={(event) => updateAddress(index, event.target.value)}
                        placeholder={`Indirizzo ${index + 1}`}
                        required
                      />
                      <button
                        type="button"
                        className="primary-button compact-button"
                        style={{ background: '#d32f2f' }}
                        onClick={() => removeAddress(index)}
                        disabled={form.residentialAddresses.length <= 1}
                      >
                        <ButtonContent icon={<DeleteIcon />}>Rimuovi</ButtonContent>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-actions sticky-mobile" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="submit" className="primary-button compact-button" disabled={submitting}>
                  <ButtonContent icon={<SaveIcon />}>{submitting ? 'Salvataggio...' : editingDriverId ? 'Aggiorna driver' : 'Crea driver'}</ButtonContent>
                </button>
                <button
                  type="button"
                  className="primary-button compact-button"
                  style={{ background: '#607d8b' }}
                  onClick={() => {
                    setIsFormOpen(false);
                    resetForm();
                  }}
                >
                  <ButtonContent icon={<CancelIcon />}>Annulla</ButtonContent>
                </button>
              </div>
            </form>
          </article>
        </div>
      )}

      {error && <p className="error-text">{error}</p>}
      {success && <p className="success-text">{success}</p>}
    </section>
  );
}