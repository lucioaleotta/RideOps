import { NextResponse } from 'next/server';
import { authToken, backendBaseUrl, parseBackendError, unauthorized } from '../_proxy';

export async function GET(request: Request) {
  const token = authToken();
  if (!token) return unauthorized();

  const incomingUrl = new URL(request.url);
  const year = incomingUrl.searchParams.get('year');
  const compareWith = incomingUrl.searchParams.get('compareWith');

  if (!year || !compareWith) {
    return NextResponse.json({ message: 'Parametri year e compareWith obbligatori' }, { status: 400 });
  }

  const response = await fetch(
    `${backendBaseUrl()}/finance/comparison?year=${encodeURIComponent(year)}&compareWith=${encodeURIComponent(compareWith)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store'
    }
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) return parseBackendError(response.status, payload);
  return NextResponse.json(payload);
}
