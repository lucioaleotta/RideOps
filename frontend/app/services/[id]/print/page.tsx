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
  externalBookingReference: number | null;
  internalBookingReference: string | null;
  clientName: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
  passengersCount: number | null;
  itinerary: string | null;
  status: 'OPEN' | 'ASSIGNED' | 'EXECUTED' | 'CLOSED';
  assignedDriverId: number | null;
  assignedVehicleId: number | null;
};

type DriverDetail = {
  id: number;
  userId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
};

type VehicleDetail = {
  id: number;
  plate: string;
  type: string | null;
  notes: string | null;
};

function driverDisplayName(driver: DriverDetail): string {
  const fullName = [driver.firstName, driver.lastName].filter(Boolean).join(' ').trim();
  return fullName || driver.email;
}

function vehicleDisplayName(vehicle: VehicleDetail): string {
  const description = vehicle.notes?.trim() || vehicle.type || null;
  return description ? `${vehicle.plate} - ${description}` : vehicle.plate;
}

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
  const authHeaders = { Authorization: `Bearer ${token}` };

  const response = await fetch(`${backendUrl}/services/${params.id}`, {
    headers: authHeaders,
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

  // Fetch parallelo di driver e veicolo se assegnati
  const [driversRes, vehiclesRes] = await Promise.all([
    service.assignedDriverId
      ? fetch(`${backendUrl}/gestionale/drivers`, { headers: authHeaders, cache: 'no-store' })
      : Promise.resolve(null),
    service.assignedVehicleId
      ? fetch(`${backendUrl}/fleet/vehicles`, { headers: authHeaders, cache: 'no-store' })
      : Promise.resolve(null)
  ]);

  const driversList: DriverDetail[] = driversRes?.ok ? (await driversRes.json()) as DriverDetail[] : [];
  const driver: DriverDetail | null = driversList.find((d) => d.id === service.assignedDriverId) ?? null;
  const vehiclesList: VehicleDetail[] = vehiclesRes?.ok ? (await vehiclesRes.json()) as VehicleDetail[] : [];
  const vehicle: VehicleDetail | null = vehiclesList.find((v) => v.id === service.assignedVehicleId) ?? null;

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
            <strong>Driver</strong>
            <p>{driver ? driverDisplayName(driver) : '-'}</p>
          </div>
          <div>
            <strong>Veicolo</strong>
            <p>{vehicle ? vehicleDisplayName(vehicle) : '-'}</p>
          </div>
          <div>
            <strong>Durata ore</strong>
            <p>{service.durationHours ?? '-'}</p>
          </div>
          <div>
            <strong>Prezzo</strong>
            <p>{formatCurrencyEUR(service.price)}</p>
          </div>
          <div>
            <strong>Rif. prenotazione esterno</strong>
            <p>{service.externalBookingReference ?? '-'}</p>
          </div>
          <div>
            <strong>Rif. prenotazione interno</strong>
            <p>{service.internalBookingReference ?? '-'}</p>
          </div>
          <div>
            <strong>Nome cliente</strong>
            <p>{service.clientName ?? '-'}</p>
          </div>
          <div>
            <strong>Telefono cliente</strong>
            <p>{service.clientPhone ?? '-'}</p>
          </div>
          <div>
            <strong>Email cliente</strong>
            <p>{service.clientEmail ?? '-'}</p>
          </div>
          <div>
            <strong>Numero passeggeri</strong>
            <p>{service.passengersCount ?? '-'}</p>
          </div>
          <div>
            <strong>Itinerario</strong>
            <p>{service.itinerary ?? '-'}</p>
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