"use client";

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ButtonContent, LoginIcon } from './action-icons';
import { PasswordInput } from './password-input';
import { StatusNotice } from './status-notice';

export function LoginForm() {
  const router = useRouter();
  const [userId, setUserId] = useState('admin');
  const [password, setPassword] = useState('ChangeMe123!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, password })
    });

    setLoading(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      setError(payload.message ?? 'Login fallito');
      return;
    }

    router.push('/app');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="form-grid">
      <label>
        User ID
        <input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          required
          className="form-input"
        />
      </label>

      <label>
        Password
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="form-input"
          autoComplete="current-password"
        />
      </label>

      <button type="submit" disabled={loading} className="primary-button">
        <ButtonContent icon={<LoginIcon />}>{loading ? 'Accesso...' : 'Accedi'}</ButtonContent>
      </button>

      {error && <StatusNotice tone="error">{error}</StatusNotice>}

      <p>
        <Link href="/forgot-password">Password dimenticata?</Link>
      </p>
    </form>
  );
}
