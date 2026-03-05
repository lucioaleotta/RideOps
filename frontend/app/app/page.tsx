import Link from 'next/link';

export default function AppHomePage() {
  return (
    <main>
      <img src="/rideops-logo.svg" alt="RideOps logo" className="home-logo" />
      <h1>Benvenuto in RideOps</h1>
      <p>Seleziona un’area dal menu laterale oppure usa i collegamenti rapidi qui sotto.</p>

      <section className="dashboard-grid">
        <article className="dashboard-card">
          <h3>Admin</h3>
          <p>Configurazioni e controllo completo piattaforma.</p>
          <Link href="/app/admin">Apri area</Link>
        </article>

        <article className="dashboard-card">
          <h3>Gestionale</h3>
          <p>Gestione operativa servizi e pianificazione.</p>
          <Link href="/app/gestionale">Apri area</Link>
        </article>

        <article className="dashboard-card">
          <h3>Driver</h3>
          <p>Vista missioni e attività giornaliere.</p>
          <Link href="/app/driver">Apri area</Link>
        </article>
      </section>
    </main>
  );
}
