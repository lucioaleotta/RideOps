import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const token = cookies().get('access_token')?.value;
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const incoming = new URL(request.url);
  const from = incoming.searchParams.get('from');
  const to = incoming.searchParams.get('to');
  if (!from || !to) {
    return NextResponse.json({ message: 'Specificare le date from e to' }, { status: 400 });
  }

  const query = new URLSearchParams({ from, to });
  const response = await fetch(
    `${process.env.BACKEND_URL ?? 'http://localhost:8080'}/api/calendario-assenze?${query.toString()}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
  );
  const payload = await response.json().catch(() => []);
  return NextResponse.json(payload, { status: response.status });
}