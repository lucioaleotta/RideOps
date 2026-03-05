import Link from 'next/link';
import { Suspense } from 'react';
import { ResetPasswordForm } from '../../components/reset-password-form';

export default function ResetPasswordPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1 className="auth-title">Reset password</h1>
        <Suspense fallback={<p>Caricamento...</p>}>
          <ResetPasswordForm />
        </Suspense>
        <p>
          <Link href="/login">Torna al login</Link>
        </p>
      </section>
    </main>
  );
}
