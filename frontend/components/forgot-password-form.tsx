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
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: '100%', padding: 8 }}
        />
      </label>
      <button type="submit" disabled={loading} style={{ padding: 10 }}>
        {loading ? 'Invio...' : 'Invia link reset'}
      </button>
      {message && <p style={{ color: 'green' }}>{message}</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      <p style={{ marginTop: 0 }}>
        In MVP il link di reset è inviato su outbox/log backend.
      </p>
    </form>
  );
}
