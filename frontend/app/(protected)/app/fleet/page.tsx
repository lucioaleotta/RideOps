import { cookies } from 'next/headers';
import { FleetDeadlinesAlerts } from '../../../../components/fleet-deadlines-alerts';
import { FleetVehicleManagement } from '../../../../components/fleet-vehicle-management';

type MePayload = {
  id: number;
  userId: string;
  email: string;
  role: string;
};

type FleetPageProps = {
  searchParams?: {
    vehicleId?: string;
  };
};

export default async function FleetPage({ searchParams }: FleetPageProps) {
  const token = cookies().get('access_token')?.value;
  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080';
  const requestedVehicleId = Number(searchParams?.vehicleId ?? '');
  const initialVehicleId = Number.isInteger(requestedVehicleId) && requestedVehicleId > 0 ? requestedVehicleId : undefined;

  let user: MePayload | null = null;

  if (token) {
    const response = await fetch(`${backendUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store'
    });

    if (response.ok) {
      user = (await response.json()) as MePayload;
    }
  }

  return (
    <main>
      <h1>Gestione Flotta</h1>
      <p>Gestione completa veicolo: anagrafica, scadenze/manutenzioni e piani ricorrenti.</p>
      <FleetDeadlinesAlerts />
      <FleetVehicleManagement userRole={user?.role ?? 'UNKNOWN'} initialVehicleId={initialVehicleId} />
    </main>
  );
}
