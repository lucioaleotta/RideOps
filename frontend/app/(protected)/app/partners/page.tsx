import { cookies } from 'next/headers';
import { PartnersManagement } from './partners-management';

type MePayload = {
  id: number;
  userId: string;
  email: string;
  role: string;
};

export default async function PartnersPage() {
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
      <h1>Gestione Partner</h1>
      <p>Anagrafica fornitori: agenzie turismo, operatori NCC e altre tipologie.</p>
      <PartnersManagement userRole={user?.role ?? 'UNKNOWN'} />
    </main>
  );
}
