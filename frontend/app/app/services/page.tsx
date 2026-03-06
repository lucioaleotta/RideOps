import { ServicesPanel } from '../../../components/services-panel';

export default function ServicesPage() {
  return (
    <main>
      <h1>Servizi</h1>
      <p>Gestione servizi: CRUD nel form, assegnazione driver in creazione/modifica e chiusura dalla lista.</p>
      <ServicesPanel />
    </main>
  );
}