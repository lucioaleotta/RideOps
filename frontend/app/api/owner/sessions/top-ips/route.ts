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

export async function GET(request: Request) {
  const token = cookies().get('access_token')?.value;
  if (!token) {
    return unauthorized();
  }

  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080';
  const { searchParams } = new URL(request.url);
  const query = searchParams.toString();
  const suffix = query ? `?${query}` : '';

  const response = await fetch(`${backendUrl}/owner/sessions/top-ips${suffix}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return parseBackendError(response.status, payload);
  }

  return NextResponse.json(payload);
}
