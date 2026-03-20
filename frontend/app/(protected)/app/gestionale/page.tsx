import { GestionaleDriversPanel } from '../../../../components/gestionale-drivers-panel';

export default function GestionalePage() {
  return (
    <main>
      <h1>Gestione Personale</h1>
      <div className="dashboard-card">
        <p>Da qui puoi gestire l&apos;anagrafica DRIVER: creazione, modifica, disattivazione logica e ripristino.</p>
      </div>
      <GestionaleDriversPanel />
    </main>
  );
}
