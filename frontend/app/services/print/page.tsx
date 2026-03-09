import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { formatCurrencyEUR } from '../../../lib/currency';

type ServiceDetail = {
  id: number;
  startAt: string;
  pickupLocation: string;
  destination: string;
  type: 'TRANSFER' | 'TOUR';
  durationHours: number | null;
  notes: string | null;
  price: number | null;
  status: 'OPEN' | 'ASSIGNED' | 'CLOSED';
};

type PrintPageProps = {
  searchParams: { ids?: string };
};

function parseIds(idsParam?: string) {
  if (!idsParam) {
    return [];
  }
  return idsParam
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);
}

export default async function ServicesMultiPrintPage({ searchParams }: PrintPageProps) {
  const token = cookies().get('access_token')?.value;
  const role = cookies().get('user_role')?.value;

  if (!token) {
    redirect('/login');
  }

  if (role !== 'ADMIN' && role !== 'GESTIONALE') {
    redirect('/app');
  }

  const serviceIds = parseIds(searchParams.ids);
  if (serviceIds.length === 0) {
    return (
      <main className="print-page">
        <article className="print-sheet">
          <h1>Nessun servizio selezionato</h1>
          <p>Seleziona almeno un servizio dalla lista per la stampa multipla.</p>
        </article>
      </main>
    );
  }

  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080';

  const serviceResults = await Promise.all(
    serviceIds.map(async (id) => {
      const response = await fetch(`${backendUrl}/services/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });

      if (!response.ok) {
        return null;
      }

      return (await response.json()) as ServiceDetail;
    })
  );

  const services = serviceResults.filter((item): item is ServiceDetail => item !== null);

  return (
    <main className="print-page">
      {services.length === 0 ? (
        <article className="print-sheet">
          <h1>Servizi non disponibili</h1>
          <p>Impossibile caricare i servizi richiesti per la stampa.</p>
        </article>
      ) : (
        services.map((service) => (
          <article key={service.id} className="print-sheet" style={{ marginBottom: 20 }}>
            <header>
              <h1>RideOps - Scheda Servizio #{service.id}</h1>
              <p>Stato: {service.status}</p>
            </header>

            <section className="print-grid">
              <div>
                <strong>Data/ora inizio</strong>
                <p>{new Date(service.startAt).toLocaleString('it-IT')}</p>
              </div>
              <div>
                <strong>Tipologia</strong>
                <p>{service.type}</p>
              </div>
              <div>
                <strong>Pickup</strong>
                <p>{service.pickupLocation}</p>
              </div>
              <div>
                <strong>Destinazione</strong>
                <p>{service.destination}</p>
              </div>
              <div>
                <strong>Durata ore</strong>
                <p>{service.durationHours ?? '-'}</p>
              </div>
              <div>
                <strong>Prezzo</strong>
                <p>{formatCurrencyEUR(service.price)}</p>
              </div>
            </section>

            <section>
              <strong>Note</strong>
              <p>{service.notes ?? '-'}</p>
            </section>

            <footer>
              <p>Documento stampabile A4 - RideOps</p>
            </footer>
          </article>
        ))
      )}
    </main>
  );
}
