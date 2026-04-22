import { UnassignedServicesBadge } from '../../../../components/unassigned-services-badge';
import { ServicesPanel } from '../../../../components/services-panel';

export default function ServicesPage() {
  return (
    <main>
      <div className="services-page-header">
        <div className="services-page-header-text">
          <h1>Lista servizi</h1>
          <p className="services-page-subtitle">Gestisci e monitora tutti i servizi di trasporto</p>
        </div>
        <div id="services-new-button-portal" />
      </div>
      <UnassignedServicesBadge />
      <ServicesPanel />
    </main>
  );
}