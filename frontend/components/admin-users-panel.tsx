"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';

type UserRole = 'ADMIN' | 'GESTIONALE' | 'DRIVER';

type UserItem = {
  id: number;
  userId: string;
  email: string;
  role: UserRole;
  enabled: boolean;
  createdAt: string;
};

type EditFormState = {
  id: number;
  userId: string;
  email: string;
  role: UserRole;
  enabled: boolean;
  newPassword: string;
};

const roles: UserRole[] = ['ADMIN', 'GESTIONALE', 'DRIVER'];

export function AdminUsersPanel() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<EditFormState | null>(null);

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

    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    setSubmitting(false);

    if (!response.ok) {
      setError(payload.message ?? 'Modifica utente fallita');
      return;
    }

    setSuccess('Utente aggiornato correttamente');
    setEditing(null);
    await loadUsers();
  }

  const orderedUsers = useMemo(
    () => [...users].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [users]
  );

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <article className="dashboard-card">
        <h3>Elenco utenti</h3>
        {error && <p className="error-text">{error}</p>}
        {success && <p className="success-text">{success}</p>}

        {loading ? (
          <p>Caricamento utenti...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th align="left">User ID</th>
                  <th align="left">Email</th>
                  <th align="left">Ruolo</th>
                  <th align="left">Stato</th>
                  <th align="left">Data Creazione</th>
                  <th align="left">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {orderedUsers.map((user) => (
                  <tr key={user.id}>
                    <td style={{ padding: '8px 0' }}>{user.userId}</td>
                    <td style={{ padding: '8px 0' }}>{user.email}</td>
                    <td style={{ padding: '8px 0' }}>{user.role}</td>
                    <td style={{ padding: '8px 0' }}>{user.enabled ? 'ATTIVO' : 'DISABILITATO'}</td>
                    <td style={{ padding: '8px 0' }}>{new Date(user.createdAt).toLocaleString('it-IT')}</td>
                    <td style={{ padding: '8px 0' }}>
                      <button type="button" className="logout-button" onClick={() => openEdit(user)}>
                        Modifica
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {editing && (
        <article className="dashboard-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <h3>Modifica utente: {editing.userId}</h3>
            <button type="button" className="logout-button" onClick={closeEdit}>Chiudi</button>
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
              <input
                className="form-input"
                type="password"
                value={editing.newPassword}
                onChange={(event) => setEditing((prev) => prev ? { ...prev, newPassword: event.target.value } : prev)}
                placeholder="Lascia vuoto per non cambiare"
                minLength={8}
              />
            </label>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="primary-button" disabled={submitting}>
                {submitting ? 'Salvataggio...' : 'Salva modifiche'}
              </button>
              <button type="button" className="logout-button" onClick={closeEdit}>Annulla</button>
            </div>
          </form>
        </article>
      )}
    </section>
  );
}
