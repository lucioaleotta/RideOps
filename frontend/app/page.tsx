import Link from 'next/link';
import { ButtonContent, LoginIcon } from '../components/action-icons';

export default function HomePage() {
  return (
    <main className="home-public">
      <section className="home-card">
        <img src="/rideops-logo.svg" alt="RideOps logo" className="home-logo" />
        <h1>RideOps Dashboard</h1>
        <p>Interfaccia moderna pronta per operatività e monitoraggio servizi.</p>
        <p>
          <Link href="/login" className="primary-button"><ButtonContent icon={<LoginIcon />}>Accedi</ButtonContent></Link>
        </p>
      </section>
    </main>
  );
}
