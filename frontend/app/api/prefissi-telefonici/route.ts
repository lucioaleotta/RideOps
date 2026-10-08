import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const token = cookies().get('access_token')?.value;
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080';
  const response = await fetch(`${backendUrl}/api/prefissi-telefonici`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 3600 }
  });

  const payload = await response.json().catch(() => []);
  if (!response.ok) {
    return NextResponse.json({ message: 'Request failed' }, { status: response.status });
  }
  return NextResponse.json(payload);
}
