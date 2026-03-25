import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function unauthorized() {
  return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
}

function parseBackendError(status: number, payload: unknown) {
  if (typeof payload === 'object' && payload && 'message' in payload) {
    return NextResponse.json({ message: String((payload as { message: string }).message) }, { status });
  }
  return NextResponse.json({ message: 'Request failed' }, { status });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const token = cookies().get('access_token')?.value;
  if (!token) {
    return unauthorized();
  }

  const body = await request.json().catch(() => null) as { partnerId?: number; pricePartner?: number } | null;
  if (!body || !body.partnerId || body.pricePartner == null) {
    return NextResponse.json({ message: 'Payload non valido' }, { status: 400 });
  }

  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080';
  const response = await fetch(`${backendUrl}/services/${params.id}/outsource`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      partnerId: Number(body.partnerId),
      pricePartner: Number(body.pricePartner)
    }),
    cache: 'no-store'
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return parseBackendError(response.status, payload);
  }

  return NextResponse.json(payload);
}
