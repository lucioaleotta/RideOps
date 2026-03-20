import { UnassignedServicesBadge } from '../../../../components/unassigned-services-badge';
import { ServicesPanel } from '../../../../components/services-panel';

export default function ServicesPage() {
  return (
    <main>
      <h1>Servizi</h1>
      <UnassignedServicesBadge />
      <ServicesPanel />
    </main>
  );
}