import { cookies } from 'next/headers';
import { AppShell } from '../../components/app-shell';

type MePayload = {
  id: number;
  userId: string;
  email: string;
  role: string;
};

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get('access_token')?.value;
  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080';

  if (!token) {
    return <>{children}</>;
  }

  let user: MePayload | null = null;

  const response = await fetch(`${backendUrl}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  });

  if (response.ok) {
    user = (await response.json()) as MePayload;
  }

  return (
    <AppShell userId={user?.userId ?? 'utente'} userRole={user?.role ?? 'UNKNOWN'}>
      {children}
    </AppShell>
  );
}
