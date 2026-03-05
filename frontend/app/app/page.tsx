import Link from 'next/link';
import { cookies } from 'next/headers';

type MePayload = {
  id: number;
  email: string;
  role: string;
};

export default async function AppHomePage() {
  const token = cookies().get('access_token')?.value;
  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080';

  let me: MePayload | null = null;
  if (token) {
    const response = await fetch(`${backendUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store'
    });

    if (response.ok) {
      me = (await response.json()) as MePayload;
    }
  }

  return (
    <main>
      <h1>Area autenticata</h1>
      <p>{me ? `Utente: ${me.email} (${me.role})` : 'Sessione non disponibile'}</p>
      <ul>
        <li>
          <Link href="/app/admin">Admin area</Link>
        </li>
        <li>
          <Link href="/app/gestionale">Gestionale area</Link>
        </li>
        <li>
          <Link href="/app/driver">Driver area</Link>
        </li>
      </ul>
      <form action="/api/auth/logout" method="post">
        <button type="submit">Logout</button>
      </form>
    </main>
  );
}
