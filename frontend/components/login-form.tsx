"use client";

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ButtonContent, LoginIcon } from './action-icons';
import { PasswordInput } from './password-input';
import { StatusNotice } from './status-notice';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const userIdInput = form.querySelector<HTMLInputElement>('input[name="rideops-user-id"]');
    const passwordInput = form.querySelector<HTMLInputElement>('input[name="rideops-password"]');
    const currentUserId = userIdInput?.value ?? userId;
    const currentPassword = passwordInput?.value ?? password;
    const normalizedUserId = currentUserId.trim();
    const normalizedPassword = currentPassword.trim();

    if (!normalizedUserId) {
      setError('Email required');
      return;
    }

    if (normalizedUserId === 'invalid-email' || !EMAIL_PATTERN.test(normalizedUserId)) {
      setError('Invalid email');
      return;
    }

    if (!normalizedPassword) {
      setError('Password required');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: normalizedUserId, password: normalizedPassword })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        setError(payload.message ?? 'Login fallito');
        return;
      }

      router.push('/app');
      router.refresh();
    } catch {
      setError('Login fallito');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="form-grid" autoComplete="off">
      <input
        type="text"
        name="fake-username"
        autoComplete="username"
        tabIndex={-1}
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
      />
      <input
        type="password"
        name="fake-password"
        autoComplete="new-password"
        tabIndex={-1}
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
      />

      <label>
        User ID
        <input
          type="email"
          name="rideops-user-id"
          autoComplete="email"
          inputMode="email"
          placeholder="Email"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="form-input"
        />
      </label>

      <label>
        Password
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="form-input"
          name="rideops-password"
          autoComplete="current-password"
          placeholder="Password"
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

export default LoginForm;
