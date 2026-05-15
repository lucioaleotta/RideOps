"use client";

import { FormEvent, useState } from 'react';
import { ButtonContent, LoginIcon } from './action-icons';
import { StatusNotice } from './status-notice';

export function ForgotPasswordForm() {
  const [userId, setUserId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedUserId = userId.trim();

    if (!normalizedUserId) {
      setError('Inserisci il tuo user ID');
      setMessage(null);
      return;
    }

    setError(null);
    setMessage(null);
    setLoading(true);

    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: normalizedUserId })
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
        User ID
        <input
          type="text"
          name="userId"
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
          placeholder="Inserisci il tuo user ID"
          autoComplete="username"
          className="form-input"
          required
        />
      </label>
      <p>
        Se lo user ID è registrato, riceverai entro pochi minuti un link sicuro per reimpostare la
        password.
      </p>
      <button type="submit" disabled={loading} className="primary-button">
        <ButtonContent icon={<LoginIcon />}>{loading ? 'Invio...' : 'Invia link reset'}</ButtonContent>
      </button>
      {message && <StatusNotice tone="success">{message}</StatusNotice>}
      {error && <StatusNotice tone="error">{error}</StatusNotice>}
    </form>
  );
}
