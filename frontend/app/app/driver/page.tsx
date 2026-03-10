import { DriverProfilePanel } from '../../../components/driver-profile-panel';

export default function DriverPage() {
  return (
    <main>
      <h1>Driver</h1>
      <div className="dashboard-card">
        <p>Visualizza e aggiorna i tuoi dati personali.</p>
      </div>
      <DriverProfilePanel />
    </main>
  );
}
