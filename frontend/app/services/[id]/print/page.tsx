import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { formatCurrencyEUR } from '../../../../lib/currency';

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

export default async function ServicePrintPage({ params }: { params: { id: string } }) {
  const token = cookies().get('access_token')?.value;
  const role = cookies().get('user_role')?.value;

  if (!token) {
    redirect('/login');
  }

  if (role !== 'ADMIN' && role !== 'GESTIONALE') {
    redirect('/app');
  }

  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080';
  const response = await fetch(`${backendUrl}/services/${params.id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  });

  if (!response.ok) {
    return (
      <main className="print-page">
        <article className="print-sheet">
          <h1>Servizio non disponibile</h1>
          <p>Impossibile caricare il servizio richiesto.</p>
        </article>
      </main>
    );
  }

  const service = (await response.json()) as ServiceDetail;

  return (
    <main className="print-page">
      <article className="print-sheet">
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
    </main>
  );
}