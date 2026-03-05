import { LoginForm } from '../../components/login-form';

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1 className="auth-title">Login RideOps</h1>
        <LoginForm />
      </section>
    </main>
  );
}
