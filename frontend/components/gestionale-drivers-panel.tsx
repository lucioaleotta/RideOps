"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AddIcon, ButtonContent, CancelIcon, DeleteIcon, EditIcon, FilterIcon, ResetIcon, SaveIcon, SearchIcon, SelectIcon } from './action-icons';
import { PasswordInput } from './password-input';
import { StatusNotice } from './status-notice';

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
  role: 'DRIVER' | 'DRIVER_FREELANCER';
};

type DriverStats = {
  active: number;
  expiringIn90Days: number;
  disabled: number;
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
  licenseExpiryDate: '',
  role: 'DRIVER'
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

function DriverRoleChip({ role }: { role: string }) {
  const isFreelancer = role === 'DRIVER_FREELANCER';
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 12,
        fontSize: '0.72rem',
        fontWeight: 600,
        letterSpacing: '0.02em',
        background: isFreelancer ? '#fff3e0' : '#e3f2fd',
        color: isFreelancer ? '#e65100' : '#1565c0',
        border: `1px solid ${isFreelancer ? '#ffb74d' : '#90caf9'}`,
        whiteSpace: 'nowrap',
      }}
    >
      {isFreelancer ? 'Freelancer' : 'Driver'}
    </span>
  );
}

function DriverMailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path d="m5 7 7 5.3L19 7" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
    </svg>
  );
}

function DriverPhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7.4 4.8c0 7.1 4.7 11.8 11.8 11.8l1.8-2.3a1.6 1.6 0 0 0-.5-2.4l-2.3-1.3a1.6 1.6 0 0 0-2 .3l-1.1 1.2a9.9 9.9 0 0 1-3.2-3.2l1.2-1.1a1.6 1.6 0 0 0 .3-2L12 3.7a1.6 1.6 0 0 0-2.4-.5Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
    </svg>
  );
}

function DriverLicenseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="8" cy="12" r="1.8" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path d="M12.6 10h5.2M12.6 13h5.2" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function DriverAddressIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 21s6-5.7 6-10a6 6 0 1 0-12 0c0 4.3 6 10 6 10Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <circle cx="12" cy="11" r="2" fill="none" stroke="currentColor" strokeWidth="1.9" />
    </svg>
  );
}

function DriverCalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3.5" y="5.5" width="17" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path d="M8 3.8v3.3M16 3.8v3.3M3.5 9.6h17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M8 13.2h3.2M12.8 13.2H16M8 16.2h3.2" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function DriverActiveIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="9" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path d="M3.6 18.2c0-2.9 2.4-5.2 5.4-5.2h.1c3 0 5.4 2.3 5.4 5.2" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <circle cx="17.5" cy="9" r="2.3" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path d="M15.7 16.8a4.4 4.4 0 0 1 4.3-3.7" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function DriverExpiryIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3.5" y="5.5" width="17" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path d="M8 3.8v3.3M16 3.8v3.3M3.5 9.6h17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M12 12v3l2 1.3" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <circle cx="12" cy="15" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.9" />
    </svg>
  );
}

function DriverDisabledIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8.4 6.2h7.2l-.5-1.4a1.4 1.4 0 0 0-1.3-.9h-3.6a1.4 1.4 0 0 0-1.3.9Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <rect x="6" y="6.8" width="12" height="13.8" rx="2" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path d="M10 10.2v7M14 10.2v7" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function DriverChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function driverInitials(driver: DriverItem) {
  const first = (driver.firstName ?? '').trim().charAt(0);
  const last = (driver.lastName ?? '').trim().charAt(0);
  const result = `${first}${last}`.toUpperCase();
  return result || 'DR';
}

function computeDriverStats(items: DriverItem[]): DriverStats {
  return items.reduce<DriverStats>((acc, driver) => {
    if (driver.enabled) {
      acc.active += 1;
      const daysLeft = daysToDate(driver.licenseExpiryDate);
      if (daysLeft !== null && daysLeft >= 0 && daysLeft <= 90) {
        acc.expiringIn90Days += 1;
      }
    } else {
      acc.disabled += 1;
    }
    return acc;
  }, { active: 0, expiringIn90Days: 0, disabled: 0 });
}

export function GestionaleDriversPanel() {
  const [drivers, setDrivers] = useState<DriverItem[]>([]);
  const [stats, setStats] = useState<DriverStats>({ active: 0, expiringIn90Days: 0, disabled: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [driverQuery, setDriverQuery] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [editingDriverId, setEditingDriverId] = useState<number | null>(null);
  const [rowMenuDriverId, setRowMenuDriverId] = useState<number | null>(null);
  const [rowMenuDriverAnchor, setRowMenuDriverAnchor] = useState<{ top: number; right: number } | null>(null);
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

    if (nextIncludeDeleted) {
      setStats(computeDriverStats(nextDrivers));
    } else {
      const statsResponse = await fetch('/api/gestionale/drivers?includeDeleted=true', { cache: 'no-store' });
      const statsPayload = (await statsResponse.json().catch(() => [])) as DriverItem[];
      if (statsResponse.ok) {
        setStats(computeDriverStats(statsPayload));
      } else {
        setStats(computeDriverStats(nextDrivers));
      }
    }

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

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (target && target.closest('.services-row-menu')) {
        return;
      }
      setRowMenuDriverId(null);
    }

    function onDocumentKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setRowMenuDriverId(null);
      }
    }

    document.addEventListener('click', onDocumentClick);
    document.addEventListener('keydown', onDocumentKeyDown);

    return () => {
      document.removeEventListener('click', onDocumentClick);
      document.removeEventListener('keydown', onDocumentKeyDown);
    };
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
      licenseExpiryDate: driver.licenseExpiryDate ?? '',
      role: driver.role === 'DRIVER_FREELANCER' ? 'DRIVER_FREELANCER' : 'DRIVER'
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
      licenseExpiryDate: form.licenseExpiryDate,
      role: form.role
    };

    const targetUrl = editingDriverId ? `/api/gestionale/drivers/${editingDriverId}` : '/api/gestionale/drivers';
    const method = editingDriverId ? 'PUT' : 'POST';

    const requestBody = editingDriverId
      ? payloadToSend
      : {
        userId: form.userId,
        email: form.email,
        password: form.password,
        role: form.role,
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

      <div className="gestionale-driver-mobile-toolbar">
        <label className="gestionale-driver-mobile-search" aria-label="Ricerca driver">
          <span className="gestionale-driver-mobile-search-icon" aria-hidden="true"><SearchIcon /></span>
          <input
            type="search"
            className="gestionale-driver-mobile-search-input"
            value={driverQuery}
            onChange={(event) => setDriverQuery(event.target.value)}
            placeholder="Cerca driver..."
          />
        </label>
        <button
          type="button"
          className={`gestionale-driver-mobile-filter-btn ${includeDeleted ? 'is-active' : ''}`}
          onClick={() => onToggleIncludeDeleted(!includeDeleted)}
          aria-label="Includi disattivati"
          aria-pressed={includeDeleted}
        >
          <FilterIcon />
        </button>
      </div>

      <div className="gestionale-driver-informative-stack">
        <section className="gestionale-driver-kpi-grid" aria-label="Statistiche driver">
          <article className="dashboard-card gestionale-driver-kpi-card">
            <div className="gestionale-driver-kpi-top">
              <div className="gestionale-driver-kpi-icon gestionale-driver-kpi-icon--active" aria-hidden="true"><DriverActiveIcon /></div>
              <p className="gestionale-driver-kpi-label">
                <span className="gestionale-driver-kpi-label-desktop">Driver attivi</span>
                <span className="gestionale-driver-kpi-label-mobile">Attivi</span>
              </p>
            </div>
            <p className="gestionale-driver-kpi-value">{stats.active}</p>
          </article>

          <article className="dashboard-card gestionale-driver-kpi-card">
            <div className="gestionale-driver-kpi-top">
              <div className="gestionale-driver-kpi-icon gestionale-driver-kpi-icon--expiry" aria-hidden="true"><DriverExpiryIcon /></div>
              <p className="gestionale-driver-kpi-label">
                <span className="gestionale-driver-kpi-label-desktop">Patenti in scadenza (90gg)</span>
                <span className="gestionale-driver-kpi-label-mobile">Scadenza</span>
              </p>
            </div>
            <p className="gestionale-driver-kpi-value">{stats.expiringIn90Days}</p>
          </article>

          <article className="dashboard-card gestionale-driver-kpi-card">
            <div className="gestionale-driver-kpi-top">
              <div className="gestionale-driver-kpi-icon gestionale-driver-kpi-icon--disabled" aria-hidden="true"><DriverDisabledIcon /></div>
              <p className="gestionale-driver-kpi-label">
                <span className="gestionale-driver-kpi-label-desktop">Disattivati</span>
                <span className="gestionale-driver-kpi-label-mobile">Disatt.</span>
              </p>
            </div>
            <p className="gestionale-driver-kpi-value">{stats.disabled}</p>
          </article>
        </section>

        {selectedDriver && (
          <article className="dashboard-card gestionale-driver-selected-card">
            <div className="gestionale-driver-selected-header">
              <div className="gestionale-driver-selected-title-wrap">
                <span className="gestionale-driver-selected-label">Driver selezionato</span>
                <h4 className="gestionale-driver-selected-name">{selectedDriver.firstName ?? '-'} {selectedDriver.lastName ?? '-'}</h4>
                <DriverRoleChip role={selectedDriver.role} />
              </div>
              <div className="gestionale-driver-selected-actions">
                <button type="button" className="primary-button compact-button" onClick={() => onEditDriver(selectedDriver)}>
                  <ButtonContent icon={<EditIcon />}>Modifica</ButtonContent>
                </button>
                <button
                  type="button"
                  className="gestionale-driver-selected-close"
                  aria-label="Deseleziona driver"
                  onClick={() => setSelectedDriverId(null)}
                >
                  ×
                </button>
              </div>
            </div>

            <div className="gestionale-driver-selected-meta-grid">
              <div className="gestionale-driver-selected-meta-item">
                <span className="gestionale-driver-selected-meta-icon" aria-hidden="true"><DriverMailIcon /></span>
                <span className="gestionale-driver-selected-meta-value">{selectedDriver.email || '-'}</span>
              </div>
              <div className="gestionale-driver-selected-meta-item">
                <span className="gestionale-driver-selected-meta-icon" aria-hidden="true"><DriverPhoneIcon /></span>
                <span className="gestionale-driver-selected-meta-value">{selectedDriver.mobilePhone || '-'}</span>
              </div>
              <div className="gestionale-driver-selected-meta-item">
                <span className="gestionale-driver-selected-meta-icon" aria-hidden="true"><DriverLicenseIcon /></span>
                <span className="gestionale-driver-selected-meta-value">
                  {selectedDriver.licenseNumber ?? '-'}
                  {selectedDriver.licenseTypes?.length ? ` (${selectedDriver.licenseTypes.join(', ')})` : ''}
                </span>
              </div>
              <div className="gestionale-driver-selected-meta-item gestionale-driver-selected-meta-item--address">
                <span className="gestionale-driver-selected-meta-icon" aria-hidden="true"><DriverAddressIcon /></span>
                <span className="gestionale-driver-selected-meta-value">
                  {(selectedDriver.residentialAddresses ?? []).join(' | ') || '-'}
                </span>
              </div>
            </div>
          </article>
        )}
      </div>

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
                <th>Tipologia</th>
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
                    <td><DriverRoleChip role={driver.role} /></td>
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
                      <div className="services-row-menu">
                        <button
                          type="button"
                          className="services-row-menu-btn"
                          aria-label={`Azioni driver ${driver.id}`}
                          title="Azioni"
                          onClick={(e) => {
                            const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                            setRowMenuDriverAnchor({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                            setRowMenuDriverId((prev) => (prev === driver.id ? null : driver.id));
                          }}
                        >
                          ...
                        </button>

                        {rowMenuDriverId === driver.id && rowMenuDriverAnchor && (
                          <div
                            className="services-row-menu-dropdown"
                            style={{ position: 'fixed', top: `${rowMenuDriverAnchor.top}px`, right: `${rowMenuDriverAnchor.right}px`, zIndex: 9999 }}
                          >
                            <button
                              type="button"
                              className="services-row-menu-item"
                              onClick={() => {
                                setRowMenuDriverId(null);
                                onSelectDriver(driver);
                              }}
                            >
                              <span className="services-row-menu-item-icon"><SelectIcon /></span>
                              Seleziona
                            </button>

                            <button
                              type="button"
                              className="services-row-menu-item"
                              onClick={() => {
                                setRowMenuDriverId(null);
                                onEditDriver(driver);
                              }}
                            >
                              <span className="services-row-menu-item-icon"><EditIcon /></span>
                              Modifica
                            </button>

                            {driver.enabled ? (
                              <button
                                type="button"
                                className="services-row-menu-item"
                                onClick={() => {
                                  setRowMenuDriverId(null);
                                  onDeleteDriver(driver.id);
                                }}
                              >
                                <span className="services-row-menu-item-icon"><DeleteIcon /></span>
                                Cancella
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="services-row-menu-item"
                                onClick={() => {
                                  setRowMenuDriverId(null);
                                  onRestoreDriver(driver.id);
                                }}
                              >
                                <span className="services-row-menu-item-icon"><ResetIcon /></span>
                                Ripristina
                              </button>
                            )}
                          </div>
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

        <div className="gestionale-driver-mobile-list-wrap">
          <h4 className="gestionale-driver-mobile-list-title">Driver ({filteredDrivers.length})</h4>

          <div className="gestionale-driver-mobile-list">
            {filteredDrivers.map((driver) => {
              const isSelected = selectedDriverId === driver.id;

              return (
                <button
                  key={`mobile-${driver.id}`}
                  type="button"
                  className={`gestionale-driver-mobile-item ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => onSelectDriver(driver)}
                >
                  <span className="gestionale-driver-mobile-avatar" aria-hidden="true">{driverInitials(driver)}</span>

                  <span className="gestionale-driver-mobile-main">
                    <span className="gestionale-driver-mobile-name">{driver.firstName ?? '-'} {driver.lastName ?? '-'}</span>

                    <span className="gestionale-driver-mobile-license-row">
                      <span className="gestionale-driver-mobile-license-icon" aria-hidden="true"><DriverLicenseIcon /></span>
                      <span className="gestionale-driver-mobile-license-number">{driver.licenseNumber ?? '-'}</span>
                    </span>

                    {!!driver.licenseTypes?.length && (
                      <span className="gestionale-driver-mobile-license-badges">
                        {driver.licenseTypes.map((licenseType) => (
                          <span key={`mobile-badge-${driver.id}-${licenseType}`} className="gestionale-driver-mobile-license-badge">
                            {licenseType}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>

                  <span className="gestionale-driver-mobile-chevron" aria-hidden="true"><DriverChevronIcon /></span>
                </button>
              );
            })}
          </div>

          {loading && <p className="gestionale-driver-table-empty">Caricamento driver...</p>}
          {!loading && filteredDrivers.length === 0 && <p className="gestionale-driver-table-empty">Nessun driver trovato.</p>}
        </div>
      </article>

      {selectedDriver && !isFormOpen && (
        <div
          className="gestionale-driver-mobile-sheet-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedDriverId(null);
            }
          }}
        >
          <article className="gestionale-driver-mobile-sheet" onClick={(event) => event.stopPropagation()}>
            <span className="gestionale-driver-mobile-sheet-handle" aria-hidden="true" />

            <header className="gestionale-driver-mobile-sheet-header">
              <span className="gestionale-driver-mobile-sheet-avatar" aria-hidden="true">{driverInitials(selectedDriver)}</span>
              <div className="gestionale-driver-mobile-sheet-header-text">
                <h4>{selectedDriver.firstName ?? '-'} {selectedDriver.lastName ?? '-'}</h4>
                <p>{selectedDriver.enabled ? 'Driver attivo' : 'Driver disattivato'}</p>
                <DriverRoleChip role={selectedDriver.role} />
              </div>
            </header>

            <section className="gestionale-driver-mobile-sheet-card">
              <div className="gestionale-driver-mobile-sheet-row">
                <span className="gestionale-driver-mobile-sheet-icon" aria-hidden="true"><DriverMailIcon /></span>
                <span>{selectedDriver.email || '-'}</span>
              </div>

              <div className="gestionale-driver-mobile-sheet-row">
                <span className="gestionale-driver-mobile-sheet-icon" aria-hidden="true"><DriverPhoneIcon /></span>
                <span>{selectedDriver.mobilePhone || '-'}</span>
              </div>

              <div className="gestionale-driver-mobile-sheet-row">
                <span className="gestionale-driver-mobile-sheet-icon" aria-hidden="true"><DriverCalendarIcon /></span>
                <span>{formatDate(selectedDriver.birthDate)}</span>
              </div>

              <div className="gestionale-driver-mobile-sheet-row gestionale-driver-mobile-sheet-row--license">
                <span className="gestionale-driver-mobile-sheet-icon" aria-hidden="true"><DriverLicenseIcon /></span>
                <div className="gestionale-driver-mobile-sheet-license-block">
                  <span className="gestionale-driver-mobile-sheet-license-number">{selectedDriver.licenseNumber ?? '-'}</span>
                  {!!selectedDriver.licenseTypes?.length && (
                    <span className="gestionale-driver-mobile-sheet-license-badges">
                      {selectedDriver.licenseTypes.map((licenseType) => (
                        <span key={`sheet-${selectedDriver.id}-${licenseType}`} className="gestionale-driver-mobile-sheet-license-badge">
                          {licenseType}
                        </span>
                      ))}
                    </span>
                  )}
                  <span className="gestionale-driver-mobile-sheet-license-expiry">Scadenza: {formatDate(selectedDriver.licenseExpiryDate)}</span>
                </div>
              </div>

              <div className="gestionale-driver-mobile-sheet-row">
                <span className="gestionale-driver-mobile-sheet-icon" aria-hidden="true"><DriverAddressIcon /></span>
                <span>{selectedDriver.residentialAddresses?.[0] || '-'}</span>
              </div>
            </section>

            <footer className="gestionale-driver-mobile-sheet-actions">
              <button type="button" className="secondary-button compact-button" onClick={() => onEditDriver(selectedDriver)}>
                <ButtonContent icon={<EditIcon />}>Modifica</ButtonContent>
              </button>
              {selectedDriver.enabled ? (
                <button
                  type="button"
                  className="primary-button compact-button"
                  style={{ background: '#d32f2f' }}
                  onClick={() => onDeleteDriver(selectedDriver.id)}
                >
                  <ButtonContent icon={<DeleteIcon />}>Disattiva</ButtonContent>
                </button>
              ) : (
                <button
                  type="button"
                  className="primary-button compact-button"
                  style={{ background: '#7cb342' }}
                  onClick={() => onRestoreDriver(selectedDriver.id)}
                >
                  <ButtonContent icon={<ResetIcon />}>Riattiva</ButtonContent>
                </button>
              )}
            </footer>
          </article>
        </div>
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

            <form className="driver-form-modal" onSubmit={onCreateDriver}>
              <section className="driver-form-section">
                <h4 className="driver-form-section-title">Anagrafica</h4>
                <div className="driver-form-grid driver-form-grid--two-col">
                  <label className="driver-form-field">
                    <span>Nome</span>
                    <input
                      className="form-input"
                      value={form.firstName}
                      onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
                      required
                    />
                  </label>
                  <label className="driver-form-field">
                    <span>Cognome</span>
                    <input
                      className="form-input"
                      value={form.lastName}
                      onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
                      required
                    />
                  </label>
                  <label className="driver-form-field">
                    <span>Data di nascita</span>
                    <input
                      className="form-input"
                      type="date"
                      value={form.birthDate}
                      onChange={(event) => setForm((prev) => ({ ...prev, birthDate: event.target.value }))}
                      required
                    />
                  </label>
                  <label className="driver-form-field">
                    <span>Cellulare</span>
                    <input
                      className="form-input"
                      value={form.mobilePhone}
                      onChange={(event) => setForm((prev) => ({ ...prev, mobilePhone: event.target.value }))}
                      required
                    />
                  </label>
                  {editingDriverId ? (
                    <label className="driver-form-field driver-form-field--full-width">
                      <span>Email</span>
                      <input className="form-input" type="email" value={form.email} disabled />
                    </label>
                  ) : null}
                </div>
              </section>

              {!editingDriverId && (
                <section className="driver-form-section">
                  <h4 className="driver-form-section-title">Credenziali iniziali</h4>
                  <div className="driver-form-grid driver-form-grid--three-col">
                    <label className="driver-form-field">
                      <span>User ID driver</span>
                      <input
                        className="form-input"
                        value={form.userId}
                        onChange={(event) => setForm((prev) => ({ ...prev, userId: event.target.value }))}
                        required
                      />
                    </label>
                    <label className="driver-form-field">
                      <span>Email driver</span>
                      <input
                        className="form-input"
                        type="email"
                        value={form.email}
                        onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                        required
                      />
                    </label>
                    <label className="driver-form-field">
                      <span>Password iniziale</span>
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
                </section>
              )}

              <section className="driver-form-section">
                <h4 className="driver-form-section-title">Tipologia</h4>
                <div className="driver-form-grid driver-form-grid--two-col">
                  <label className="driver-form-field">
                    <span>Tipo profilo</span>
                    <select
                      className="form-input"
                      value={form.role}
                      onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as 'DRIVER' | 'DRIVER_FREELANCER' }))}
                    >
                      <option value="DRIVER">Driver</option>
                      <option value="DRIVER_FREELANCER">Driver Freelancer</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className="driver-form-section">
                <h4 className="driver-form-section-title">Patente</h4>
                <div className="driver-form-grid driver-form-grid--two-col">
                  <label className="driver-form-field">
                    <span>Numero patente</span>
                    <input
                      className="form-input"
                      value={form.licenseNumber}
                      onChange={(event) => setForm((prev) => ({ ...prev, licenseNumber: event.target.value }))}
                      required
                    />
                  </label>
                  <label className="driver-form-field">
                    <span>Scadenza patente</span>
                    <input
                      className="form-input"
                      type="date"
                      value={form.licenseExpiryDate}
                      onChange={(event) => setForm((prev) => ({ ...prev, licenseExpiryDate: event.target.value }))}
                      required
                    />
                  </label>
                </div>

                <div className="driver-form-license-types">
                  <span className="driver-form-field-label">Tipo patente (uno o più)</span>
                  <div className="driver-license-picker">
                    {licenseTypeOptions.map((type) => {
                      const selected = form.licenseTypes.includes(type);
                      return (
                        <button
                          key={type}
                          type="button"
                          className={`driver-license-chip ${selected ? 'is-selected' : ''}`}
                          onClick={() => toggleLicenseType(type)}
                          aria-pressed={selected}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              <section className="driver-form-section">
                <div className="driver-form-section-header">
                  <h4 className="driver-form-section-title">Indirizzi di residenza</h4>
                  <button type="button" className="secondary-button compact-button" onClick={addAddress}>
                    <ButtonContent icon={<AddIcon />}>Aggiungi</ButtonContent>
                  </button>
                </div>
                <div className="driver-form-address-list">
                  {form.residentialAddresses.map((address, index) => (
                    <div key={`address-${index}`} className="driver-form-address-row">
                      <input
                        className="form-input"
                        value={address}
                        onChange={(event) => updateAddress(index, event.target.value)}
                        placeholder={`Indirizzo ${index + 1}`}
                        required
                      />
                      <button
                        type="button"
                        className="secondary-button compact-button driver-form-address-remove"
                        onClick={() => removeAddress(index)}
                        disabled={form.residentialAddresses.length <= 1}
                        aria-label={`Rimuovi indirizzo ${index + 1}`}
                      >
                        <span className="button-icon" aria-hidden="true"><DeleteIcon /></span>
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <div className="driver-form-actions">
                <button
                  type="button"
                  className="secondary-button compact-button"
                  onClick={() => {
                    setIsFormOpen(false);
                    resetForm();
                  }}
                >
                  <ButtonContent icon={<CancelIcon />}>Annulla</ButtonContent>
                </button>
                <button type="submit" className="primary-button compact-button" disabled={submitting}>
                  <ButtonContent icon={<SaveIcon />}>{submitting ? 'Salvataggio...' : editingDriverId ? 'Aggiorna driver' : 'Crea driver'}</ButtonContent>
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