"use client";

import { FormEvent, useState } from 'react';

export function GestionaleDriversPanel() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onCreateDriver(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const response = await fetch('/api/gestionale/drivers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const payload = (await response.json().catch(() => ({}))) as { message?: string; email?: string };

    setSubmitting(false);

    if (!response.ok) {
      setError(payload.message ?? 'Creazione driver fallita');
      return;
    }

    setEmail('');
    setPassword('');
    setSuccess(`Driver creato: ${payload.email ?? 'ok'}`);
  }

  return (
    <article className="dashboard-card">
      <h3>Crea Driver</h3>
      <form className="form-grid" onSubmit={onCreateDriver}>
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

        <button type="submit" className="primary-button" disabled={submitting}>
          {submitting ? 'Creazione...' : 'Crea driver'}
        </button>
      </form>

      {error && <p className="error-text">{error}</p>}
      {success && <p>{success}</p>}
    </article>
  );
}