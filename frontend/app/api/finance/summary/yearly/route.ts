import { NextResponse } from 'next/server';
import { authToken, backendBaseUrl, parseBackendError, unauthorized } from '../../_proxy';

export async function GET() {
  const token = authToken();
  if (!token) return unauthorized();

  const response = await fetch(`${backendBaseUrl()}/finance/summary/yearly`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  });

  const payload = await response.json().catch(() => []);
  if (!response.ok) return parseBackendError(response.status, payload);
  return NextResponse.json(payload);
}
