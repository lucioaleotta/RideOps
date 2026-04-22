"use client";

import { FormEvent, useEffect, useState } from 'react';
import { AddIcon, ButtonContent, CancelIcon, DeleteIcon, EditIcon, SaveIcon } from './action-icons';

type LicenseType = 'AM' | 'A1' | 'A2' | 'A' | 'B' | 'BE' | 'C' | 'CE' | 'D' | 'DE' | 'CQC';

type DriverProfile = {
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

type ProfileForm = {
  firstName: string;
  lastName: string;
  birthDate: string;
  licenseNumber: string;
  email: string;
  mobilePhone: string;
  licenseExpiryDate: string;
  licenseTypes: LicenseType[];
  residentialAddresses: string[];
};

const licenseTypeOptions: LicenseType[] = ['AM', 'A1', 'A2', 'A', 'B', 'BE', 'C', 'CE', 'D', 'DE', 'CQC'];

function toProfileForm(profile: DriverProfile): ProfileForm {
  const normalizedLicenseTypes = (profile.licenseTypes?.length ? profile.licenseTypes : ['B'])
    .filter((value): value is LicenseType => licenseTypeOptions.includes(value as LicenseType));

  return {
    firstName: profile.firstName ?? '',
    lastName: profile.lastName ?? '',
    birthDate: profile.birthDate ?? '',
    licenseNumber: profile.licenseNumber ?? '',
    email: profile.email,
    mobilePhone: profile.mobilePhone ?? '',
    licenseExpiryDate: profile.licenseExpiryDate ?? '',
    licenseTypes: normalizedLicenseTypes.length > 0 ? normalizedLicenseTypes : ['B'],
    residentialAddresses: profile.residentialAddresses?.length ? profile.residentialAddresses : ['']
  };
}

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

export function DriverProfilePanel() {
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isEditing && !submitting) {
        onCancelEditing();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isEditing, submitting, profile]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/driver/profile', { cache: 'no-store' });
      const payload = (await response.json().catch(() => ({}))) as DriverProfile | { message?: string };

      if (!response.ok) {
        setError((payload as { message?: string }).message ?? 'Errore caricamento profilo');
        setLoading(false);
        return;
      }

      const nextProfile = payload as DriverProfile;
      setProfile(nextProfile);
      setForm(toProfileForm(nextProfile));
      setLoading(false);
    }

    load();
  }, []);

  function toggleLicenseType(type: LicenseType) {
    if (!form) {
      return;
    }
    setForm((prev) => {
      if (!prev) {
        return prev;
      }
      const exists = prev.licenseTypes.includes(type);
      if (exists) {
        const next = prev.licenseTypes.filter((item) => item !== type);
        return { ...prev, licenseTypes: next.length > 0 ? next : prev.licenseTypes };
      }
      return { ...prev, licenseTypes: [...prev.licenseTypes, type] };
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const normalizedAddresses = form.residentialAddresses
      .map((value) => value.trim())
      .filter(Boolean);

    const response = await fetch('/api/driver/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: form.firstName,
        lastName: form.lastName,
        birthDate: form.birthDate,
        licenseNumber: form.licenseNumber,
        email: form.email,
        mobilePhone: form.mobilePhone,
        licenseExpiryDate: form.licenseExpiryDate,
        licenseTypes: form.licenseTypes,
        residentialAddresses: normalizedAddresses
      })
    });

    const payload = (await response.json().catch(() => ({}))) as DriverProfile | { message?: string };
    if (!response.ok) {
      setError((payload as { message?: string }).message ?? 'Salvataggio profilo fallito');
      setSubmitting(false);
      return;
    }

    const nextProfile = payload as DriverProfile;
    setProfile(nextProfile);
    setForm(toProfileForm(nextProfile));
    setIsEditing(false);
    setSuccess('Dati personali aggiornati con successo');
    setSubmitting(false);
  }

  function onStartEditing() {
    if (!profile) {
      return;
    }
    setForm(toProfileForm(profile));
    setError(null);
    setSuccess(null);
    setIsEditing(true);
  }

  function onCancelEditing() {
    if (!profile) {
      return;
    }
    setForm(toProfileForm(profile));
    setError(null);
    setIsEditing(false);
  }

  function addAddress() {
    setForm((prev) => (prev ? { ...prev, residentialAddresses: [...prev.residentialAddresses, ''] } : prev));
  }

  function updateAddress(index: number, value: string) {
    setForm((prev) => {
      if (!prev) {
        return prev;
      }
      const next = [...prev.residentialAddresses];
      next[index] = value;
      return { ...prev, residentialAddresses: next };
    });
  }

  function removeAddress(index: number) {
    setForm((prev) => {
      if (!prev || prev.residentialAddresses.length <= 1) {
        return prev;
      }
      return {
        ...prev,
        residentialAddresses: prev.residentialAddresses.filter((_, currentIndex) => currentIndex !== index)
      };
    });
  }

  if (loading) {
    return <p>Caricamento profilo driver...</p>;
  }

  if (!profile || !form) {
    return <p className="error-text">Profilo non disponibile.</p>;
  }

  return (
    <section className="responsive-panel driver-profile-panel" style={{ display: 'grid', gap: 16 }}>
      {error && <p className="error-text">{error}</p>}
      {success && <p className="success-text">{success}</p>}

      <article className="dashboard-card">
        <h3>Informazioni personali</h3>
        <div className="driver-profile-grid" role="list">
          <div className="driver-profile-row" role="listitem"><strong>Nome</strong><span>{profile.firstName ?? '-'}</span></div>
          <div className="driver-profile-row" role="listitem"><strong>Cognome</strong><span>{profile.lastName ?? '-'}</span></div>
          <div className="driver-profile-row" role="listitem"><strong>User ID</strong><span>{profile.userId}</span></div>
          <div className="driver-profile-row" role="listitem"><strong>Data di nascita</strong><span>{formatDate(profile.birthDate)}</span></div>
          <div className="driver-profile-row" role="listitem"><strong>Numero patente</strong><span>{profile.licenseNumber ?? '-'}</span></div>
          <div className="driver-profile-row" role="listitem"><strong>Email</strong><span>{profile.email}</span></div>
          <div className="driver-profile-row" role="listitem"><strong>Cellulare</strong><span>{profile.mobilePhone ?? '-'}</span></div>
          <div className="driver-profile-row" role="listitem"><strong>Indirizzo di residenza</strong><span>{profile.residentialAddresses?.[0] ?? '-'}</span></div>
          <div className="driver-profile-row" role="listitem"><strong>Scadenza patente</strong><span>{formatDate(profile.licenseExpiryDate)}</span></div>
          <div className="driver-profile-row" role="listitem">
            <strong>Tipi patente</strong>
            <span className="driver-license-badges">
              {profile.licenseTypes?.length
                ? profile.licenseTypes.map((type) => <span key={type} className="driver-license-badge">{type}</span>)
                : <span>-</span>}
            </span>
          </div>
        </div>
        <div className="form-actions" style={{ marginTop: 12 }}>
          <button type="button" className="primary-button" onClick={onStartEditing}>
            <ButtonContent icon={<EditIcon />}>Modifica</ButtonContent>
          </button>
        </div>
      </article>

      {isEditing && (
        <div className="tenant-modal-overlay" onClick={onCancelEditing}>
          <article className="tenant-modal-card driver-edit-modal" onClick={(event) => event.stopPropagation()}>
            <div className="tenant-modal-header">
              <div>
                <h3>Modifica driver</h3>
                <p>Compila i dati anagrafici, la patente e gli indirizzi di residenza.</p>
              </div>
              <button type="button" className="tenant-modal-close" onClick={onCancelEditing} aria-label="Chiudi modale">
                ×
              </button>
            </div>

            <form onSubmit={onSubmit} className="form-grid">
              <section className="driver-edit-section">
                <h4>Anagrafica</h4>
                <div className="responsive-form-grid" style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                  <label>
                    Nome
                    <input
                      className="form-input"
                      value={form.firstName}
                      onChange={(event) => setForm((prev) => (prev ? { ...prev, firstName: event.target.value } : prev))}
                      required
                    />
                  </label>
                  <label>
                    Cognome
                    <input
                      className="form-input"
                      value={form.lastName}
                      onChange={(event) => setForm((prev) => (prev ? { ...prev, lastName: event.target.value } : prev))}
                      required
                    />
                  </label>
                  <label>
                    Data di nascita
                    <input
                      className="form-input"
                      type="date"
                      value={form.birthDate}
                      onChange={(event) => setForm((prev) => (prev ? { ...prev, birthDate: event.target.value } : prev))}
                      required
                    />
                  </label>
                  <label>
                    Cellulare
                    <input
                      className="form-input"
                      value={form.mobilePhone}
                      onChange={(event) => setForm((prev) => (prev ? { ...prev, mobilePhone: event.target.value } : prev))}
                      placeholder="+39..."
                      required
                    />
                  </label>
                  <label style={{ gridColumn: '1 / -1' }}>
                    Email
                    <input
                      type="email"
                      className="form-input"
                      value={form.email}
                      onChange={(event) => setForm((prev) => (prev ? { ...prev, email: event.target.value } : prev))}
                      required
                    />
                  </label>
                </div>
              </section>

              <section className="driver-edit-section">
                <h4>Patente</h4>
                <div className="responsive-form-grid" style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                  <label>
                    Numero patente
                    <input
                      className="form-input"
                      value={form.licenseNumber}
                      onChange={(event) => setForm((prev) => (prev ? { ...prev, licenseNumber: event.target.value } : prev))}
                      required
                    />
                  </label>
                  <label>
                    Scadenza patente
                    <input
                      type="date"
                      className="form-input"
                      value={form.licenseExpiryDate}
                      onChange={(event) => setForm((prev) => (prev ? { ...prev, licenseExpiryDate: event.target.value } : prev))}
                      required
                    />
                  </label>
                </div>
                <div style={{ marginTop: 12 }}>
                  <strong>Tipo patente (uno o piu)</strong>
                  <div className="driver-license-picker">
                    {licenseTypeOptions.map((type) => {
                      const selected = form.licenseTypes.includes(type);
                      return (
                        <button
                          key={type}
                          type="button"
                          className={`driver-license-chip ${selected ? 'is-selected' : ''}`}
                          onClick={() => toggleLicenseType(type)}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              <section className="driver-edit-section">
                <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <h4>Indirizzi di residenza</h4>
                  <button type="button" className="secondary-button" onClick={addAddress}>
                    <ButtonContent icon={<AddIcon />}>Aggiungi</ButtonContent>
                  </button>
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
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
                        className="secondary-button"
                        onClick={() => removeAddress(index)}
                        disabled={form.residentialAddresses.length <= 1}
                        aria-label={`Rimuovi indirizzo ${index + 1}`}
                      >
                        <ButtonContent icon={<DeleteIcon />}>Rimuovi</ButtonContent>
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <div className="form-actions sticky-mobile" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button type="button" className="secondary-button" onClick={onCancelEditing} disabled={submitting}>
                  <ButtonContent icon={<CancelIcon />}>Annulla</ButtonContent>
                </button>
                <button type="submit" className="primary-button" disabled={submitting}>
                  <ButtonContent icon={<SaveIcon />}>{submitting ? 'Salvataggio...' : 'Aggiorna driver'}</ButtonContent>
                </button>
              </div>
            </form>
          </article>
        </div>
      )}
    </section>
  );
}
