import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function unauthorized() {
  return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
}

export async function GET() {
  const token = cookies().get('access_token')?.value;
  if (!token) {
    return unauthorized();
  }

  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080';
  const headers = { Authorization: `Bearer ${token}` };

  const fetchCount = async (status: string): Promise<number> => {
    const res = await fetch(`${backendUrl}/services?status=${status}`, { headers, cache: 'no-store' });
    if (!res.ok) return 0;
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data.length : 0;
  };

  const [open, assigned, executed, closed] = await Promise.all([
    fetchCount('OPEN'),
    fetchCount('ASSIGNED'),
    fetchCount('EXECUTED'),
    fetchCount('CLOSED'),
  ]);

  return NextResponse.json({ open, assigned, closedOrExecuted: executed + closed });
}
