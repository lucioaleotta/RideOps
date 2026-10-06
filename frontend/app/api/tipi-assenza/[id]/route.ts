import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

type RouteContext = { params: { id: string } };

async function proxy(request: Request, { params }: RouteContext, endpoint: string) {
  const token = cookies().get('access_token')?.value;
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080';
  const response = await fetch(`${backendUrl}/api/tipi-assenza/${encodeURIComponent(params.id)}${endpoint}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    ...(request.method === 'PATCH' && endpoint === '' ? { body: await request.text() } : {}),
    cache: 'no-store'
  });
  const payload = await response.json().catch(() => ({}));
  return NextResponse.json(payload, { status: response.status });
}

export function PATCH(request: Request, context: RouteContext) {
  return proxy(request, context, '');
}