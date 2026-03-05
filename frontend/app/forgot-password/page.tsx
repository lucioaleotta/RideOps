import Link from 'next/link';
import { ForgotPasswordForm } from '../../components/forgot-password-form';

export default function ForgotPasswordPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1 className="auth-title">Forgot password</h1>
        <ForgotPasswordForm />
        <p>
          <Link href="/login">Torna al login</Link>
        </p>
      </section>
    </main>
  );
}
