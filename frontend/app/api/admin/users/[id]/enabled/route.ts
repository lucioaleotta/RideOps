import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const token = cookies().get('access_token')?.value;
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.enabled !== 'boolean') {
    return NextResponse.json({ message: 'Payload non valido' }, { status: 400 });
  }

  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080';
  const response = await fetch(`${backendUrl}/admin/users/${params.id}/enabled`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ enabled: body.enabled }),
    cache: 'no-store'
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload === 'object' && payload && 'message' in payload
      ? String((payload as { message: string }).message)
      : 'Request failed';
    return NextResponse.json({ message }, { status: response.status });
  }

  return NextResponse.json(payload);
}
