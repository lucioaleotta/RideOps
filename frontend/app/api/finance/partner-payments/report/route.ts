import { NextResponse } from 'next/server';
import { authToken, backendBaseUrl, parseBackendError, unauthorized } from '../../_proxy';

export async function GET(request: Request) {
  const token = authToken();
  if (!token) return unauthorized();

  const incomingUrl = new URL(request.url);
  const target = new URL(`${backendBaseUrl()}/finance/partner-payments/report`);

  ['from', 'to', 'partnerId'].forEach((key) => {
    const value = incomingUrl.searchParams.get(key);
    if (value) {
      target.searchParams.set(key, value);
    }
  });

  const response = await fetch(target.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  });

  const payload = await response.json().catch(() => []);
  if (!response.ok) return parseBackendError(response.status, payload);
  return NextResponse.json(payload);
}
