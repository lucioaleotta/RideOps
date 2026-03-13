import { cookies } from 'next/headers';
import { FleetVehicleManagement } from '../../../../components/fleet-vehicle-management';

type MePayload = {
  id: number;
  userId: string;
  email: string;
  role: string;
};

export default async function FleetPage() {
  const token = cookies().get('access_token')?.value;
  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080';

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
      <h1>Fleet</h1>
      <p>Gestione completa veicolo: anagrafica, scadenze/manutenzioni e piani ricorrenti.</p>
      <FleetVehicleManagement userRole={user?.role ?? 'UNKNOWN'} />
    </main>
  );
}
