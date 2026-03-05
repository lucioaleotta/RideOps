import Link from 'next/link';
import { ForgotPasswordForm } from '../../components/forgot-password-form';

export default function ForgotPasswordPage() {
  return (
    <main>
      <h1>Forgot password</h1>
      <ForgotPasswordForm />
      <p>
        <Link href="/login">Torna al login</Link>
      </p>
    </main>
  );
}
