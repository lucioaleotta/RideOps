import dynamic from 'next/dynamic';

const LoginForm = dynamic(
  () => import('../../components/login-form').then((mod) => mod.LoginForm),
  { ssr: false }
);

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
