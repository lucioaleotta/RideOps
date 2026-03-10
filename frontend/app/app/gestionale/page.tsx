import { GestionaleDriversPanel } from '../../../components/gestionale-drivers-panel';
import { GestionaleUnassignedBadge } from '../../../components/gestionale-unassigned-badge';

export default function GestionalePage() {
  return (
    <main>
      <h1>Gestionale</h1>
      <div className="dashboard-card">
        <p>Da qui puoi gestire l'anagrafica DRIVER: creazione, modifica, disattivazione logica e ripristino.</p>
      </div>
      <GestionaleUnassignedBadge />
      <GestionaleDriversPanel />
    </main>
  );
}
