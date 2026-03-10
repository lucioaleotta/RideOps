import { NextResponse } from 'next/server';
import { authToken, backendBaseUrl, parseBackendError, unauthorized } from '../_proxy';

export async function GET(request: Request) {
  const token = authToken();
  if (!token) return unauthorized();

  const incomingUrl = new URL(request.url);
  const target = new URL(`${backendBaseUrl()}/finance/transactions`);
  incomingUrl.searchParams.forEach((value, key) => {
    if (value) target.searchParams.set(key, value);
  });

  const response = await fetch(target.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  });

  const payload = await response.json().catch(() => []);
  if (!response.ok) return parseBackendError(response.status, payload);
  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  const token = authToken();
  if (!token) return unauthorized();

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ message: 'Payload non valido' }, { status: 400 });
  }

  const response = await fetch(`${backendBaseUrl()}/finance/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body),
    cache: 'no-store'
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) return parseBackendError(response.status, payload);
  return NextResponse.json(payload, { status: 201 });
}
