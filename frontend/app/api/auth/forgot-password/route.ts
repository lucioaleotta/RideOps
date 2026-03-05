import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || !body.email) {
    return NextResponse.json({ message: 'Payload non valido' }, { status: 400 });
  }

  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080';
  const backendResponse = await fetch(`${backendUrl}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: body.email }),
    cache: 'no-store'
  });

  if (!backendResponse.ok) {
    return NextResponse.json({ message: 'Errore nella richiesta reset password' }, { status: 400 });
  }

  return NextResponse.json({ message: 'Se l’email esiste, riceverai istruzioni per il reset.' });
}
