"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';

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
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [editingDriverId, setEditingDriverId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<DriverFormState>(defaultForm);

  const selectedDriver = useMemo(
    () => drivers.find((item) => item.id === selectedDriverId) ?? null,
    [drivers, selectedDriverId]
  );

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

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <article className="dashboard-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h3>Driver</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={includeDeleted}
                onChange={(event) => onToggleIncludeDeleted(event.target.checked)}
              />
              Includi cancellati
            </label>
            <button
              type="button"
              className="primary-button compact-button"
              onClick={() => {
                if (isFormOpen && !editingDriverId) {
                  setIsFormOpen(false);
                } else {
                  openCreateForm();
                }
              }}
            >
              {isFormOpen && !editingDriverId ? 'Chiudi form' : 'Nuovo driver'}
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto', marginTop: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '0 10px 10px 0', borderBottom: '1px solid #dce8f5' }}>Nome</th>
                <th style={{ textAlign: 'left', padding: '0 10px 10px 0', borderBottom: '1px solid #dce8f5' }}>Cognome</th>
                <th style={{ textAlign: 'left', padding: '0 10px 10px 0', borderBottom: '1px solid #dce8f5' }}>Nascita</th>
                <th style={{ textAlign: 'left', padding: '0 10px 10px 0', borderBottom: '1px solid #dce8f5' }}>Patente</th>
                <th style={{ textAlign: 'left', padding: '0 10px 10px 0', borderBottom: '1px solid #dce8f5' }}>Scadenza</th>
                <th style={{ textAlign: 'left', padding: '0 10px 10px 0', borderBottom: '1px solid #dce8f5' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver) => {
                const isSelected = selectedDriverId === driver.id;
                const daysLeft = daysToDate(driver.licenseExpiryDate);
                const isExpirySoon = driver.enabled && daysLeft !== null && daysLeft >= 0 && daysLeft <= 15;

                return (
                  <tr
                    key={driver.id}
                    style={{
                      background: isSelected ? '#eaf4ff' : 'transparent',
                      color: driver.enabled ? 'inherit' : '#7f8ea3'
                    }}
                  >
                    <td style={{ padding: '10px 10px 10px 0', borderBottom: '1px solid #eaf1f9' }}>{driver.firstName ?? '-'}</td>
                    <td style={{ padding: '10px 10px 10px 0', borderBottom: '1px solid #eaf1f9' }}>{driver.lastName ?? '-'}</td>
                    <td style={{ padding: '10px 10px 10px 0', borderBottom: '1px solid #eaf1f9' }}>{formatDate(driver.birthDate)}</td>
                    <td style={{ padding: '10px 10px 10px 0', borderBottom: '1px solid #eaf1f9' }}>
                      {driver.licenseNumber ?? '-'}
                      {driver.licenseTypes?.length ? ` (${driver.licenseTypes.join(', ')})` : ''}
                    </td>
                    <td style={{ padding: '10px 10px 10px 0', borderBottom: '1px solid #eaf1f9' }}>
                      <div>{formatDate(driver.licenseExpiryDate)}</div>
                      {isExpirySoon && <small className="warning-text">Scade tra {daysLeft} gg</small>}
                    </td>
                    <td style={{ padding: '10px 0 10px 0', borderBottom: '1px solid #eaf1f9' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button type="button" className="primary-button compact-button" onClick={() => onSelectDriver(driver)}>
                          Seleziona
                        </button>
                        <button type="button" className="primary-button compact-button" onClick={() => onEditDriver(driver)}>
                          Modifica
                        </button>
                        {driver.enabled ? (
                          <button
                            type="button"
                            className="primary-button compact-button"
                            style={{ background: '#d32f2f' }}
                            onClick={() => onDeleteDriver(driver.id)}
                          >
                            Cancella
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="primary-button compact-button"
                            style={{ background: '#7cb342' }}
                            onClick={() => onRestoreDriver(driver.id)}
                          >
                            Ripristina
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {loading && <p>Caricamento driver...</p>}
          {!loading && drivers.length === 0 && <p>Nessun driver trovato.</p>}
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
        <article className="dashboard-card">
          <h4>{editingDriverId ? 'Modifica driver' : 'Nuovo driver'}</h4>
          <form className="form-grid" onSubmit={onCreateDriver}>
            {!editingDriverId && (
              <div className="dashboard-card" style={{ background: '#eef6ff' }}>
                <strong>Credenziali iniziali</strong>
                <div style={{ display: 'grid', gap: 12, marginTop: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
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
                    <input
                      className="form-input"
                      type="password"
                      minLength={8}
                      value={form.password}
                      onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                      required
                    />
                  </label>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <strong>Indirizzi di residenza</strong>
                <button type="button" className="primary-button compact-button" onClick={addAddress}>Aggiungi indirizzo</button>
              </div>
              <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                {form.residentialAddresses.map((address, index) => (
                  <div key={`address-${index}`} style={{ display: 'flex', gap: 8 }}>
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
                      Rimuovi
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="submit" className="primary-button compact-button" disabled={submitting}>
                {submitting ? 'Salvataggio...' : editingDriverId ? 'Aggiorna driver' : 'Crea driver'}
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
                Annulla
              </button>
            </div>
          </form>
        </article>
      )}

      {error && <p className="error-text">{error}</p>}
      {success && <p className="success-text">{success}</p>}
    </section>
  );
}