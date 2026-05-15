"use client";

import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ButtonContent, SaveIcon } from './action-icons';
import { PasswordInput } from './password-input';
import { StatusNotice } from './status-notice';

const MIN_PASSWORD_LENGTH = 8;

function ruleClassName(isValid: boolean) {
  return isValid ? 'password-policy-rule password-policy-rule--valid' : 'password-policy-rule password-policy-rule--invalid';
}

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token] = useState(searchParams.get('token') ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasMinLength = newPassword.length >= MIN_PASSWORD_LENGTH;
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const hasSpecialChar = /[^A-Za-z\d]/.test(newPassword);
  const meetsPasswordPolicy = hasMinLength && hasLowercase && hasUppercase && hasNumber && hasSpecialChar;
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const isFormValid = token.length > 0 && meetsPasswordPolicy && passwordsMatch;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!token) {
      setError('Link di reset non valido: token mancante. Richiedi un nuovo reset password.');
      return;
    }

    if (!meetsPasswordPolicy) {
      setError('La password deve avere almeno 8 caratteri con maiuscola, minuscola, numero e carattere speciale.');
      return;
    }

    if (!passwordsMatch) {
      setError('Le password non coincidono.');
      return;
    }

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
      <input type="hidden" value={token} name="token" readOnly />

      {!token && (
        <StatusNotice tone="error">
          Link di reset non valido o incompleto. Richiedi un nuovo link dalla pagina &quot;Password dimenticata&quot;.
        </StatusNotice>
      )}

      <label>
        Nuova password
        <PasswordInput
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          minLength={MIN_PASSWORD_LENGTH}
          required
          className="form-input"
          autoComplete="new-password"
          aria-describedby="password-policy"
        />
      </label>

      <div id="password-policy" className="form-help-text" aria-live="polite">
        <p>La password deve rispettare queste regole:</p>
        <ul className="password-policy-list">
          <li className={ruleClassName(hasMinLength)}>{hasMinLength ? 'OK' : 'KO'} Almeno 8 caratteri</li>
          <li className={ruleClassName(hasUppercase)}>{hasUppercase ? 'OK' : 'KO'} Almeno una lettera maiuscola (A-Z)</li>
          <li className={ruleClassName(hasLowercase)}>{hasLowercase ? 'OK' : 'KO'} Almeno una lettera minuscola (a-z)</li>
          <li className={ruleClassName(hasNumber)}>{hasNumber ? 'OK' : 'KO'} Almeno un numero (0-9)</li>
          <li className={ruleClassName(hasSpecialChar)}>{hasSpecialChar ? 'OK' : 'KO'} Almeno un carattere speciale (es. !@#$%^&*)</li>
        </ul>
      </div>

      <label>
        Conferma nuova password
        <PasswordInput
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="form-input"
          autoComplete="new-password"
        />
      </label>

      {confirmPassword.length > 0 && !passwordsMatch && (
        <StatusNotice tone="error">Le password non coincidono.</StatusNotice>
      )}
      {confirmPassword.length > 0 && passwordsMatch && (
        <StatusNotice tone="success">Le password coincidono.</StatusNotice>
      )}

      <button type="submit" disabled={loading || !isFormValid} className="primary-button">
        <ButtonContent icon={<SaveIcon />}>{loading ? 'Aggiornamento...' : 'Aggiorna password'}</ButtonContent>
      </button>

      {message && <StatusNotice tone="success">{message}</StatusNotice>}
      {error && <StatusNotice tone="error">{error}</StatusNotice>}
    </form>
  );
}
