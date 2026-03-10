import { NextResponse } from 'next/server';
import { authToken, backendBaseUrl, parseBackendError, unauthorized } from '../../_proxy';

export async function PUT(request: Request, context: { params: { id: string } }) {
  const token = authToken();
  if (!token) return unauthorized();

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ message: 'Payload non valido' }, { status: 400 });
  }

  const response = await fetch(`${backendBaseUrl()}/finance/transactions/${context.params.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body),
    cache: 'no-store'
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) return parseBackendError(response.status, payload);
  return NextResponse.json(payload);
}
