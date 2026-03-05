import { GestionaleDriversPanel } from '../../../components/gestionale-drivers-panel';

export default function GestionalePage() {
  return (
    <main>
      <h1>Gestionale</h1>
      <div className="dashboard-card">
        <p>Da qui puoi creare nuovi utenti DRIVER.</p>
      </div>
      <GestionaleDriversPanel />
    </main>
  );
}
