"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ButtonContent, CancelIcon, EditIcon, FilterIcon, JournalIcon, LockIcon, ResetIcon, SaveIcon } from './action-icons';
import { PasswordInput } from './password-input';

type UserRole = 'ADMIN' | 'GESTIONALE' | 'DRIVER';

type UserItem = {
  id: number;
  userId: string;
  email: string;
  role: UserRole;
  enabled: boolean;
  createdAt: string;
  tenantId: number | null;
  tenantName: string | null;
};

type EditFormState = {
  id: number;
  userId: string;
  email: string;
  role: UserRole;
  enabled: boolean;
  newPassword: string;
};

type JournalItem = {
  id: number;
  adminUserId: string;
  targetUserId: string;
  action: string;
  changedFields: string;
  createdAt: string;
};

const roles: UserRole[] = ['ADMIN', 'GESTIONALE', 'DRIVER'];

export function AdminUsersPanel() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<EditFormState | null>(null);
  const [journalOpen, setJournalOpen] = useState(false);
  const [journalLoading, setJournalLoading] = useState(false);
  const [journalError, setJournalError] = useState<string | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalItem[]>([]);
  const [journalDateFilter, setJournalDateFilter] = useState('');
  const [journalAdminFilter, setJournalAdminFilter] = useState('');

  // Filtri utenti
  const [filterUserId, setFilterUserId] = useState('');
  const [filterEmail, setFilterEmail] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | ''>('');
  const [filterStatus, setFilterStatus] = useState<'ATTIVO' | 'DISABILITATO' | ''>('');
  const [filterTenant, setFilterTenant] = useState('');

  const loadJournal = useCallback(async () => {
    setJournalLoading(true);
    setJournalError(null);

    const params = new URLSearchParams();
    if (journalDateFilter.trim()) {
      params.set('date', journalDateFilter.trim());
    }
    if (journalAdminFilter.trim()) {
      params.set('adminUserId', journalAdminFilter.trim());
    }

    const response = await fetch(`/api/admin/users/journal?${params.toString()}`, { cache: 'no-store' });
    const payload = (await response.json().catch(() => [])) as JournalItem[] | { message?: string };

    if (!response.ok) {
      setJournalError((payload as { message?: string }).message ?? 'Errore caricamento journal');
      setJournalLoading(false);
      return;
    }

    setJournalEntries(payload as JournalItem[]);
    setJournalLoading(false);
  }, [journalAdminFilter, journalDateFilter]);

  async function loadUsers() {
    setLoading(true);
    setError(null);

    const response = await fetch('/api/admin/users', { cache: 'no-store' });
    const payload = (await response.json().catch(() => [])) as UserItem[] | { message?: string };

    if (!response.ok) {
      setError((payload as { message?: string }).message ?? 'Errore caricamento utenti');
      setLoading(false);
      return;
    }

    setUsers(payload as UserItem[]);
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (journalOpen) {
      loadJournal();
    }
  }, [journalOpen, loadJournal]);

  function openEdit(user: UserItem) {
    setError(null);
    setSuccess(null);
    setEditing({
      id: user.id,
      userId: user.userId,
      email: user.email,
      role: user.role,
      enabled: user.enabled,
      newPassword: ''
    });
  }

  function closeEdit() {
    setEditing(null);
  }

  async function onSubmitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/admin/users/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: editing.userId,
        email: editing.email,
        role: editing.role,
        enabled: editing.enabled,
        newPassword: editing.newPassword
      })
    });

    const payload = (await response.json().catch(() => ({}))) as { message?: string; userId?: string };
    setSubmitting(false);

    if (!response.ok) {
      setError(payload.message ?? 'Modifica utente fallita');
      return;
    }

    setSuccess(`Utente ${payload.userId ?? editing.userId} aggiornato correttamente`);
    setEditing(null);
    await loadUsers();
    if (journalOpen) {
      await loadJournal();
    }
  }

  const orderedUsers = useMemo(() => {
    return [...users]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .filter((u) => {
        if (filterUserId.trim() && !u.userId.toLowerCase().includes(filterUserId.trim().toLowerCase())) return false;
        if (filterEmail.trim() && !u.email.toLowerCase().includes(filterEmail.trim().toLowerCase())) return false;
        if (filterRole && u.role !== filterRole) return false;
        if (filterStatus === 'ATTIVO' && !u.enabled) return false;
        if (filterStatus === 'DISABILITATO' && u.enabled) return false;
        if (filterTenant.trim()) {
          const tenantMatch = (u.tenantName ?? '').toLowerCase().includes(filterTenant.trim().toLowerCase());
          if (!tenantMatch) return false;
        }
        return true;
      });
  }, [users, filterUserId, filterEmail, filterRole, filterStatus, filterTenant]);

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <article className="dashboard-card">
        <h3>Elenco utenti</h3>
        {error && <p className="error-text">{error}</p>}
        {success && <p className="success-text">{success}</p>}

        {/* Filtri */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 12 }}>
          <label>
            User ID
            <input className="form-input" value={filterUserId} onChange={(e) => setFilterUserId(e.target.value)} placeholder="cerca..." />
          </label>
          <label>
            Email
            <input className="form-input" type="email" value={filterEmail} onChange={(e) => setFilterEmail(e.target.value)} placeholder="cerca..." />
          </label>
          <label>
            Ruolo
            <select className="form-input" value={filterRole} onChange={(e) => setFilterRole(e.target.value as UserRole | '')}>
              <option value="">Tutti</option>
              {roles.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label>
            Stato
            <select className="form-input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as 'ATTIVO' | 'DISABILITATO' | '')}>
              <option value="">Tutti</option>
              <option value="ATTIVO">ATTIVO</option>
              <option value="DISABILITATO">DISABILITATO</option>
            </select>
          </label>
          <label>
            Tenant
            <input className="form-input" value={filterTenant} onChange={(e) => setFilterTenant(e.target.value)} placeholder="cerca..." />
          </label>
        </div>
        <div style={{ marginBottom: 16 }}>
          <button type="button" className="logout-button" onClick={() => { setFilterUserId(''); setFilterEmail(''); setFilterRole(''); setFilterStatus(''); setFilterTenant(''); }}>
            <ButtonContent icon={<ResetIcon />}>Reset filtri</ButtonContent>
          </button>
        </div>

        {loading ? (
          <p>Caricamento utenti...</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="admin-users-desktop-table" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th align="left">User ID</th>
                    <th align="left">Email</th>
                    <th align="left">Ruolo</th>
                    <th align="left">Tenant</th>
                    <th align="left">Stato</th>
                    <th align="left">Data Creazione</th>
                    <th align="left">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {orderedUsers.map((user) => (
                    <tr key={user.id}>
                      <td style={{ padding: '10px 8px 10px 0' }}>{user.userId}</td>
                      <td style={{ padding: '10px 8px 10px 0' }}>{user.email}</td>
                      <td style={{ padding: '10px 8px 10px 0' }}>
                        <span className={`admin-role-chip admin-role-chip-${user.role.toLowerCase()}`}>{user.role}</span>
                      </td>
                      <td style={{ padding: '10px 8px 10px 0', color: user.tenantName ? 'inherit' : 'var(--color-text-secondary, #888)', fontStyle: user.tenantName ? 'normal' : 'italic' }}>
                        {user.tenantName ?? '—'}
                      </td>
                      <td style={{ padding: '10px 8px 10px 0' }}>
                        <span className={`admin-enabled-badge ${user.enabled ? 'is-active' : 'is-disabled'}`}>
                          {user.enabled ? 'ATTIVO' : 'DISABILITATO'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 8px 10px 0' }}>{new Date(user.createdAt).toLocaleString('it-IT')}</td>
                      <td style={{ padding: '8px 0' }}>
                        <button type="button" className="logout-button" onClick={() => openEdit(user)}>
                          <ButtonContent icon={<EditIcon />}>Modifica</ButtonContent>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="admin-users-mobile-list">
              {orderedUsers.map((user) => (
                <article key={user.id} className="admin-user-card">
                  <div className="admin-user-card-top">
                    <span className="admin-user-username">{user.userId}</span>
                    <span className={`admin-enabled-badge ${user.enabled ? 'is-active' : 'is-disabled'}`}>
                      {user.enabled ? 'ATTIVO' : 'DISABILITATO'}
                    </span>
                  </div>
                  <div className="admin-user-email">{user.email}</div>
                  {user.tenantName && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary, #888)', marginBottom: 4 }}>Tenant: {user.tenantName}</div>
                  )}
                  <div className="admin-user-card-footer">
                    <div className="admin-user-meta">
                      <span className={`admin-role-chip admin-role-chip-${user.role.toLowerCase()}`}>{user.role}</span>
                      <span className="admin-user-date">{new Date(user.createdAt).toLocaleString('it-IT')}</span>
                    </div>
                    <button type="button" className="logout-button compact-button" onClick={() => openEdit(user)}>
                      <ButtonContent icon={<EditIcon />}>Modifica</ButtonContent>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </article>

      {editing && (
        <article className="dashboard-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <h3>Modifica utente: {editing.userId}</h3>
            <button type="button" className="logout-button" onClick={closeEdit}><ButtonContent icon={<LockIcon />}>Chiudi</ButtonContent></button>
          </div>

          <form className="form-grid" onSubmit={onSubmitEdit}>
            <label>
              User ID
              <input
                className="form-input"
                value={editing.userId}
                onChange={(event) => setEditing((prev) => prev ? { ...prev, userId: event.target.value } : prev)}
                required
              />
            </label>

            <label>
              Email
              <input
                className="form-input"
                type="email"
                value={editing.email}
                onChange={(event) => setEditing((prev) => prev ? { ...prev, email: event.target.value } : prev)}
                required
              />
            </label>

            <label>
              Ruolo
              <select
                className="form-input"
                value={editing.role}
                onChange={(event) => setEditing((prev) => prev ? { ...prev, role: event.target.value as UserRole } : prev)}
              >
                {roles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </label>

            <label>
              Stato
              <select
                className="form-input"
                value={editing.enabled ? 'ATTIVO' : 'DISABILITATO'}
                onChange={(event) => setEditing((prev) => prev ? { ...prev, enabled: event.target.value === 'ATTIVO' } : prev)}
              >
                <option value="ATTIVO">ATTIVO</option>
                <option value="DISABILITATO">DISABILITATO</option>
              </select>
            </label>

            <label>
              Nuova password (opzionale)
              <PasswordInput
                className="form-input"
                value={editing.newPassword}
                onChange={(event) => setEditing((prev) => prev ? { ...prev, newPassword: event.target.value } : prev)}
                placeholder="Lascia vuoto per non cambiare"
                minLength={8}
                autoComplete="new-password"
              />
            </label>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="primary-button" disabled={submitting}>
                <ButtonContent icon={<SaveIcon />}>{submitting ? 'Salvataggio...' : 'Salva modifiche'}</ButtonContent>
              </button>
              <button type="button" className="logout-button" onClick={closeEdit}><ButtonContent icon={<CancelIcon />}>Annulla</ButtonContent></button>
            </div>
          </form>
        </article>
      )}

      <article className="dashboard-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <h3>Journal modifiche amministrative</h3>
          <button
            type="button"
            className="logout-button"
            onClick={() => setJournalOpen((prev) => !prev)}
          >
            <ButtonContent icon={<JournalIcon />}>{journalOpen ? 'Nascondi' : 'Mostra'}</ButtonContent>
          </button>
        </div>

        {journalOpen && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 12 }}>
              <label>
                Data modifica
                <input
                  className="form-input"
                  type="date"
                  value={journalDateFilter}
                  onChange={(event) => setJournalDateFilter(event.target.value)}
                />
              </label>

              <label>
                UserID amministrativo
                <input
                  className="form-input"
                  value={journalAdminFilter}
                  onChange={(event) => setJournalAdminFilter(event.target.value)}
                  placeholder="es. admin01"
                />
              </label>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button type="button" className="primary-button" onClick={loadJournal} disabled={journalLoading}>
                <ButtonContent icon={<FilterIcon />}>{journalLoading ? 'Caricamento...' : 'Applica filtri'}</ButtonContent>
              </button>
              <button
                type="button"
                className="logout-button"
                onClick={() => {
                  setJournalDateFilter('');
                  setJournalAdminFilter('');
                  setTimeout(() => {
                    loadJournal();
                  }, 0);
                }}
              >
                <ButtonContent icon={<ResetIcon />}>Reset filtri</ButtonContent>
              </button>
            </div>

            {journalError && <p className="error-text">{journalError}</p>}

            {journalLoading ? (
              <p>Caricamento journal...</p>
            ) : (
              <>
                {/* Desktop table */}
                <div className="admin-journal-desktop-table" style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th align="left">Quando</th>
                        <th align="left">Admin UserID</th>
                        <th align="left">Utente modificato</th>
                        <th align="left">Azione</th>
                        <th align="left">Campi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {journalEntries.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ padding: '8px 0' }}>Nessuna modifica trovata.</td>
                        </tr>
                      ) : (
                        journalEntries.map((entry) => (
                          <tr key={entry.id}>
                            <td style={{ padding: '8px 0' }}>{new Date(entry.createdAt).toLocaleString('it-IT')}</td>
                            <td style={{ padding: '8px 0' }}>{entry.adminUserId}</td>
                            <td style={{ padding: '8px 0' }}>{entry.targetUserId}</td>
                            <td style={{ padding: '8px 0' }}>{entry.action}</td>
                            <td style={{ padding: '8px 0' }}>{entry.changedFields}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile card list */}
                <div className="admin-journal-mobile-list">
                  {journalEntries.length === 0 ? (
                    <p>Nessuna modifica trovata.</p>
                  ) : (
                    journalEntries.map((entry) => (
                      <article key={entry.id} className="admin-journal-card">
                        <div className="admin-journal-card-header">
                          <span className="admin-journal-date">{new Date(entry.createdAt).toLocaleString('it-IT')}</span>
                          <span className="admin-journal-action-chip">{entry.action}</span>
                        </div>
                        <div className="admin-journal-meta">
                          <span>Admin: <strong>{entry.adminUserId}</strong></span>
                          <span>Utente: <strong>{entry.targetUserId}</strong></span>
                        </div>
                        {entry.changedFields && (
                          <div className="admin-journal-fields">Campi: {entry.changedFields}</div>
                        )}
                      </article>
                    ))
                  )}
                </div>
              </>
            )}
          </>
        )}
      </article>
    </section>
  );
}
