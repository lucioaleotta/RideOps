import { NextResponse } from 'next/server';
import { authToken, backendBaseUrl, parseBackendError, unauthorized } from '../_proxy';

export async function GET(request: Request) {
  const token = authToken();
  if (!token) return unauthorized();

  const incomingUrl = new URL(request.url);
  const year = incomingUrl.searchParams.get('year');
  const month = incomingUrl.searchParams.get('month');

  if (!year || !month) {
    return NextResponse.json({ message: 'Parametri year e month obbligatori' }, { status: 400 });
  }

  const response = await fetch(`${backendBaseUrl()}/finance/dashboard?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) return parseBackendError(response.status, payload);
  return NextResponse.json(payload);
}
