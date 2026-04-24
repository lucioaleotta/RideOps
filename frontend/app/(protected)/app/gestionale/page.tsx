import { GestionaleDriversPanel } from '../../../../components/gestionale-drivers-panel';

export default function GestionalePage() {
  return (
    <main>
      <div className="services-page-header">
        <div className="services-page-header-text">
          <h1>Gestione Personale</h1>
          <p className="services-page-subtitle">Gestisci anagrafica, credenziali e dati patente dei driver</p>
        </div>
        <div id="gestionale-driver-new-button-portal" />
      </div>
      <div className="dashboard-card">
        <p>Da qui puoi gestire l&apos;anagrafica DRIVER: creazione, modifica, disattivazione logica e ripristino.</p>
      </div>
      <GestionaleDriversPanel />
    </main>
  );
}
