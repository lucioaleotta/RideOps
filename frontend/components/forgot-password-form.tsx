"use client";

import { FormEvent, useState } from 'react';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('admin@rideops.local');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    setLoading(false);

    if (!response.ok) {
      setError(payload.message ?? 'Errore richiesta reset password');
      return;
    }

    setMessage(payload.message ?? 'Richiesta inviata');
  }

  return (
    <form onSubmit={onSubmit} className="form-grid">
      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="form-input"
        />
      </label>
      <button type="submit" disabled={loading} className="primary-button">
        {loading ? 'Invio...' : 'Invia link reset'}
      </button>
      {message && <p className="success-text">{message}</p>}
      {error && <p className="error-text">{error}</p>}
      <p>
        In MVP il link di reset è inviato su outbox/log backend.
      </p>
    </form>
  );
}
