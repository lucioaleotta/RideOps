"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';

type UserItem = {
  id: number;
  userId: string;
  email: string;
  role: 'ADMIN' | 'GESTIONALE' | 'DRIVER';
  enabled: boolean;
  createdAt: string;
};

const roles: Array<UserItem['role']> = ['ADMIN', 'GESTIONALE', 'DRIVER'];

export function AdminUsersPanel() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserItem['role']>('DRIVER');

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

  async function onCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, email, password, role })
    });

    const payload = (await response.json().catch(() => ({}))) as { message?: string };

    setSubmitting(false);

    if (!response.ok) {
      setError(payload.message ?? 'Creazione utente fallita');
      return;
    }

    setUserId('');
    setEmail('');
    setPassword('');
    setRole('DRIVER');
    await loadUsers();
  }

  async function onRoleChange(userId: number, nextRole: UserItem['role']) {
    const response = await fetch(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: nextRole })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      setError(payload.message ?? 'Aggiornamento ruolo fallito');
      return;
    }

    await loadUsers();
  }

  async function onEnabledChange(userId: number, enabled: boolean) {
    const response = await fetch(`/api/admin/users/${userId}/enabled`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      setError(payload.message ?? 'Aggiornamento stato fallito');
      return;
    }

    await loadUsers();
  }

  const orderedUsers = useMemo(
    () => [...users].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [users]
  );

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <article className="dashboard-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <h3>Crea utente</h3>
          <button
            type="button"
            className="primary-button compact-button"
            onClick={() => setIsCreateOpen((prev) => !prev)}
          >
            {isCreateOpen ? 'Nascondi form' : 'Nuovo utente'}
          </button>
        </div>

        {isCreateOpen && (
        <form className="form-grid" onSubmit={onCreateUser}>
          <label>
            User ID
            <input
              className="form-input"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              required
            />
          </label>

          <label>
            Email
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label>
            Password iniziale
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
          </label>

          <label>
            Ruolo
            <select className="form-input" value={role} onChange={(event) => setRole(event.target.value as UserItem['role'])}>
              {roles.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <button type="submit" className="primary-button compact-button" disabled={submitting}>
            {submitting ? 'Creazione...' : 'Crea utente'}
          </button>
        </form>
        )}
      </article>

      <article className="dashboard-card">
        <h3>Lista utenti</h3>
        {error && <p className="error-text">{error}</p>}
        {loading ? (
          <p>Caricamento utenti...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th align="left">User ID</th>
                  <th align="left">Email</th>
                  <th align="left">Ruolo</th>
                  <th align="left">Stato</th>
                  <th align="left">Creato il</th>
                  <th align="left">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {orderedUsers.map((user) => (
                  <tr key={user.id}>
                    <td style={{ padding: '8px 0' }}>{user.userId}</td>
                    <td style={{ padding: '8px 0' }}>{user.email}</td>
                    <td>
                      <select
                        className="form-input"
                        value={user.role}
                        onChange={(event) => onRoleChange(user.id, event.target.value as UserItem['role'])}
                      >
                        {roles.map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                    </td>
                    <td>{user.enabled ? 'ATTIVO' : 'DISABILITATO'}</td>
                    <td>{new Date(user.createdAt).toLocaleString('it-IT')}</td>
                    <td>
                      <button
                        className="logout-button"
                        type="button"
                        onClick={() => onEnabledChange(user.id, !user.enabled)}
                      >
                        {user.enabled ? 'Disabilita' : 'Abilita'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}
