import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const token = cookies().get('access_token')?.value;
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const withinDays = new URL(request.url).searchParams.get('withinDays') ?? '30';
  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080';
  const response = await fetch(
    `${backendUrl}/fleet/vehicles/deadline-alert-counts?withinDays=${encodeURIComponent(withinDays)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: request.signal
    }
  );
  const payload = await response.json().catch(() => ({}));
  return NextResponse.json(payload, { status: response.status });
}
