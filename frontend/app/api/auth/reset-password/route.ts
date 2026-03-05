import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || !body.token || !body.newPassword) {
    return NextResponse.json({ message: 'Payload non valido' }, { status: 400 });
  }

  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080';
  const backendResponse = await fetch(`${backendUrl}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: body.token, newPassword: body.newPassword }),
    cache: 'no-store'
  });

  if (!backendResponse.ok) {
    return NextResponse.json({ message: 'Token non valido o scaduto' }, { status: 400 });
  }

  return NextResponse.json({ message: 'Password aggiornata con successo' });
}
