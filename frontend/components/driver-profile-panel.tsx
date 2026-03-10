"use client";

import { FormEvent, useEffect, useState } from 'react';

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
  email: string;
  mobilePhone: string;
  licenseExpiryDate: string;
  licenseTypes: LicenseType[];
  address: string;
};

const licenseTypeOptions: LicenseType[] = ['AM', 'A1', 'A2', 'A', 'B', 'BE', 'C', 'CE', 'D', 'DE', 'CQC'];

function toProfileForm(profile: DriverProfile): ProfileForm {
  const normalizedLicenseTypes = (profile.licenseTypes?.length ? profile.licenseTypes : ['B'])
    .filter((value): value is LicenseType => licenseTypeOptions.includes(value as LicenseType));

  return {
    email: profile.email,
    mobilePhone: profile.mobilePhone ?? '',
    licenseExpiryDate: profile.licenseExpiryDate ?? '',
    licenseTypes: normalizedLicenseTypes.length > 0 ? normalizedLicenseTypes : ['B'],
    address: profile.residentialAddresses?.[0] ?? ''
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

    const normalizedAddress = form.address.trim();

    const response = await fetch('/api/driver/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email,
        mobilePhone: form.mobilePhone,
        licenseExpiryDate: form.licenseExpiryDate,
        licenseTypes: form.licenseTypes,
        residentialAddresses: normalizedAddress ? [normalizedAddress] : []
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

  if (loading) {
    return <p>Caricamento profilo driver...</p>;
  }

  if (!profile || !form) {
    return <p className="error-text">Profilo non disponibile.</p>;
  }

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      {error && <p className="error-text">{error}</p>}
      {success && <p className="success-text">{success}</p>}

      <article className="dashboard-card">
        <h3>Informazioni personali</h3>
        <p><strong>Nome:</strong> {profile.firstName ?? '-'}</p>
        <p><strong>Cognome:</strong> {profile.lastName ?? '-'}</p>
        <p><strong>User ID:</strong> {profile.userId}</p>
        <p><strong>Data di nascita:</strong> {formatDate(profile.birthDate)}</p>
        <p><strong>Numero patente:</strong> {profile.licenseNumber ?? '-'}</p>
        <p><strong>Email:</strong> {profile.email}</p>
        <p><strong>Cellulare:</strong> {profile.mobilePhone ?? '-'}</p>
        <p><strong>Indirizzo di residenza:</strong> {profile.residentialAddresses?.[0] ?? '-'}</p>
        <p><strong>Scadenza patente:</strong> {formatDate(profile.licenseExpiryDate)}</p>
        <p><strong>Tipi patente:</strong> {profile.licenseTypes?.length ? profile.licenseTypes.join(', ') : '-'}</p>

        {!isEditing && (
          <div style={{ marginTop: 12 }}>
            <button type="button" className="primary-button" onClick={onStartEditing}>
              Modifica
            </button>
          </div>
        )}
      </article>

      {isEditing && (
        <article className="dashboard-card">
          <h3>Modifica contatti e patente</h3>
          <form onSubmit={onSubmit} className="form-grid">
            <label>
              Email
              <input
                type="email"
                className="form-input"
                value={form.email}
                onChange={(event) => setForm((prev) => (prev ? { ...prev, email: event.target.value } : prev))}
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

            <label>
              Indirizzo di residenza
              <input
                className="form-input"
                value={form.address}
                onChange={(event) => setForm((prev) => (prev ? { ...prev, address: event.target.value } : prev))}
                placeholder="Via, numero civico, citta"
                required
              />
            </label>

            <label>
              Data scadenza patente
              <input
                type="date"
                className="form-input"
                value={form.licenseExpiryDate}
                onChange={(event) => setForm((prev) => (prev ? { ...prev, licenseExpiryDate: event.target.value } : prev))}
                required
              />
            </label>

            <div>
              <strong>Tipi patente</strong>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
                {licenseTypeOptions.map((type) => (
                  <label key={type} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={form.licenseTypes.includes(type)}
                      onChange={() => toggleLicenseType(type)}
                    />
                    <span>{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="submit" className="primary-button" disabled={submitting}>
                {submitting ? 'Salvataggio...' : 'Salva'}
              </button>
              <button type="button" className="secondary-button" onClick={onCancelEditing} disabled={submitting}>
                Cancella
              </button>
            </div>
          </form>
        </article>
      )}
    </section>
  );
}
