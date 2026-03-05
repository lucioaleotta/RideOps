"use client";

import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState(searchParams.get('token') ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword })
    });

    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    setLoading(false);

    if (!response.ok) {
      setError(payload.message ?? 'Reset password fallito');
      return;
    }

    setMessage(payload.message ?? 'Password aggiornata');
    setTimeout(() => {
      router.push('/login');
      router.refresh();
    }, 800);
  }

  return (
    <form onSubmit={onSubmit} className="form-grid">
      <label>
        Token reset
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
          className="form-input"
        />
      </label>

      <label>
        Nuova password
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          minLength={8}
          required
          className="form-input"
        />
      </label>

      <button type="submit" disabled={loading} className="primary-button">
        {loading ? 'Aggiornamento...' : 'Aggiorna password'}
      </button>

      {message && <p className="success-text">{message}</p>}
      {error && <p className="error-text">{error}</p>}
    </form>
  );
}
