import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

type RouteContext = { params: { tenantId: string; path?: string[] } };

async function proxy(request: Request, { params }: RouteContext) {
  const token = cookies().get('access_token')?.value;
  if (!token) {
    return NextResponse.json({ message: 'Non autenticato' }, { status: 401 });
  }

  const segments = params.path ?? [];
  const endpoint = `/api/tenant/${encodeURIComponent(params.tenantId)}/${segments.map(encodeURIComponent).join('/')}`;
  const incomingUrl = new URL(request.url);
  const target = `${process.env.BACKEND_URL ?? 'http://localhost:8080'}${endpoint}${incomingUrl.search}`;
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  const response = await fetch(target, {
    method: request.method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(hasBody ? { 'Content-Type': 'application/json' } : {})
    },
    ...(hasBody ? { body: await request.text() } : {}),
    cache: 'no-store'
  });

  if (response.status === 204) {
    return new NextResponse(null, { status: 204 });
  }
  const payload = await response.json().catch(() => ({}));
  return NextResponse.json(payload, { status: response.status });
}

export const GET = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;