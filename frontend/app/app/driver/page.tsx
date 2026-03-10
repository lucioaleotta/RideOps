import { DriverServicesPanel } from '../../../components/driver-services-panel';

export default function DriverPage() {
  return (
    <main>
      <h1>Driver</h1>
      <div className="dashboard-card">
        <p>Vista operativa dei servizi assegnati al driver.</p>
      </div>
      <DriverServicesPanel />
    </main>
  );
}
