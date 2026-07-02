import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function unauthorized() {
  return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
}

export async function GET(request: Request) {
  const token = cookies().get('access_token')?.value;
  if (!token) {
    return unauthorized();
  }

  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080';
  const incomingUrl = new URL(request.url);
  const from = incomingUrl.searchParams.get('from');
  const to = incomingUrl.searchParams.get('to');
  const format = incomingUrl.searchParams.get('format');

  if (!from || !to || !format) {
    return NextResponse.json({ message: 'Parametri export non validi' }, { status: 400 });
  }

  const backendQuery = new URLSearchParams({ from, to, format });
  const response = await fetch(`${backendUrl}/services/export?${backendQuery.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: 'Errore export servizi' }));
    return NextResponse.json(
      { message: (payload as { message?: string }).message ?? 'Errore export servizi' },
      { status: response.status }
    );
  }

  const blob = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
  const contentDisposition = response.headers.get('content-disposition') ?? `attachment; filename="servizi.${format}"`;

  return new NextResponse(blob, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': contentDisposition
    }
  });
}
