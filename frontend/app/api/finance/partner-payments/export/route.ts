import { NextResponse } from 'next/server';
import { authToken, backendBaseUrl, parseBackendError, unauthorized } from '../../_proxy';

export async function GET(request: Request) {
  const token = authToken();
  if (!token) return unauthorized();

  const incomingUrl = new URL(request.url);
  const target = new URL(`${backendBaseUrl()}/finance/partner-payments/export`);

  ['from', 'to', 'partnerId', 'format'].forEach((key) => {
    const value = incomingUrl.searchParams.get(key);
    if (value) {
      target.searchParams.set(key, value);
    }
  });

  const response = await fetch(target.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    return parseBackendError(response.status, payload);
  }

  const arrayBuffer = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
  const contentDisposition = response.headers.get('content-disposition') ?? 'attachment';

  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': contentDisposition,
      'Cache-Control': 'no-store'
    }
  });
}
