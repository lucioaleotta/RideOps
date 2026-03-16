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

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') ?? '';
  const adminUserId = searchParams.get('adminUserId') ?? '';

  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080';
  const params = new URLSearchParams();
  if (date.trim()) {
    params.set('date', date.trim());
  }
  if (adminUserId.trim()) {
    params.set('adminUserId', adminUserId.trim());
  }

  const response = await fetch(`${backendUrl}/admin/users/journal?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  });

  const payload = await response.json().catch(() => []);
  if (!response.ok) {
    return parseBackendError(response.status, payload);
  }

  return NextResponse.json(payload);
}