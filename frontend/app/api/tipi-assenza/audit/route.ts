import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const token = cookies().get('access_token')?.value;
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080';
  const response = await fetch(`${backendUrl}/api/tipi-assenza/audit`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  });
  const payload = await response.json().catch(() => []);
  return NextResponse.json(payload, { status: response.status });
}