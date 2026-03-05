import { cookies } from 'next/headers';
import { AppShell } from '../../components/app-shell';

type MePayload = {
  id: number;
  email: string;
  role: string;
};

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
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
    <AppShell userEmail={user?.email ?? 'utente'} userRole={user?.role ?? 'UNKNOWN'}>
      {children}
    </AppShell>
  );
}
