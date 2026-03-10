import { NextResponse } from 'next/server';
import { authToken, backendBaseUrl, parseBackendError, unauthorized } from '../../../_proxy';

export async function POST(request: Request, context: { params: { id: string } }) {
  const token = authToken();
  if (!token) return unauthorized();

  const body = await request.json().catch(() => null);
  if (!body || typeof body.reason !== 'string' || body.reason.trim().length === 0) {
    return NextResponse.json({ message: 'Motivo annullamento obbligatorio' }, { status: 400 });
  }

  const response = await fetch(`${backendBaseUrl()}/finance/transactions/${context.params.id}/void`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ reason: body.reason }),
    cache: 'no-store'
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) return parseBackendError(response.status, payload);
  return NextResponse.json(payload);
}
