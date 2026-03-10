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

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const token = cookies().get('access_token')?.value;
  if (!token) {
    return unauthorized();
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ message: 'Payload non valido' }, { status: 400 });
  }

  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080';
  const response = await fetch(`${backendUrl}/fleet/vehicles/${params.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body),
    cache: 'no-store'
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return parseBackendError(response.status, payload);
  }

  return NextResponse.json(payload);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const token = cookies().get('access_token')?.value;
  if (!token) {
    return unauthorized();
  }

  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080';
  const response = await fetch(`${backendUrl}/fleet/vehicles/${params.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    return parseBackendError(response.status, payload);
  }

  return new NextResponse(null, { status: 204 });
}
