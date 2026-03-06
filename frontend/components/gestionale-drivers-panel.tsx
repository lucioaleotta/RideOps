"use client";

import { FormEvent, useState } from 'react';

export function GestionaleDriversPanel() {
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  async function onCreateDriver(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const response = await fetch('/api/gestionale/drivers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, email, password })
    });

    const payload = (await response.json().catch(() => ({}))) as { message?: string; email?: string; userId?: string };

    setSubmitting(false);

    if (!response.ok) {
      setError(payload.message ?? 'Creazione driver fallita');
      return;
    }

    setUserId('');
    setEmail('');
    setPassword('');
    setSuccess(`Driver creato: ${payload.userId ?? payload.email ?? 'ok'}`);
  }

  return (
    <article className="dashboard-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <h3>Crea Driver</h3>
        <button
          type="button"
          className="primary-button compact-button"
          onClick={() => setIsCreateOpen((prev) => !prev)}
        >
          {isCreateOpen ? 'Nascondi form' : 'Nuovo driver'}
        </button>
      </div>

      {isCreateOpen && (
      <form className="form-grid" onSubmit={onCreateDriver}>
        <label>
          User ID driver
          <input
            className="form-input"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            required
          />
        </label>

        <label>
          Email driver
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

        <button type="submit" className="primary-button compact-button" disabled={submitting}>
          {submitting ? 'Creazione...' : 'Crea driver'}
        </button>
      </form>
      )}

      {error && <p className="error-text">{error}</p>}
      {success && <p>{success}</p>}
    </article>
  );
}