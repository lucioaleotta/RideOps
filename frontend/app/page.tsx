import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="home-public">
      <section className="home-card">
        <img src="/rideops-logo.svg" alt="RideOps logo" className="home-logo" />
        <h1>RideOps Dashboard</h1>
        <p>Interfaccia moderna pronta per operatività e monitoraggio servizi.</p>
        <p>
          <Link href="/login" className="primary-button">Accedi</Link>
        </p>
      </section>
    </main>
  );
}
