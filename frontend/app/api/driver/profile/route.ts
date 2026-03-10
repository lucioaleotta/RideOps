import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function unauthorized() {
  return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
}

function parseBackendError(status: number, payload: unknown) {
  if (typeof payload === 'object' && payload && 'message' in payload) {
    return NextResponse.json({ message: String((payload as { message: string }).message) }, { status });
  }
  return NextResponse.json({ message: 'Request failed' }, { status });
}

export async function GET() {
  const token = cookies().get('access_token')?.value;
  if (!token) {
    return unauthorized();
  }

  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080';
  const response = await fetch(`${backendUrl}/driver/profile`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return parseBackendError(response.status, payload);
  }

  return NextResponse.json(payload);
}

export async function PUT(request: Request) {
  const token = cookies().get('access_token')?.value;
  if (!token) {
    return unauthorized();
  }

  const body = await request.json().catch(() => null);
  if (!body
    || !body.email
    || !Array.isArray(body.licenseTypes)
    || body.licenseTypes.length === 0
    || !Array.isArray(body.residentialAddresses)
    || body.residentialAddresses.length === 0
    || !body.mobilePhone
    || !body.licenseExpiryDate) {
    return NextResponse.json({ message: 'Payload non valido' }, { status: 400 });
  }

  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080';
  const response = await fetch(`${backendUrl}/driver/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      email: body.email,
      licenseTypes: body.licenseTypes,
      residentialAddresses: body.residentialAddresses,
      mobilePhone: body.mobilePhone,
      licenseExpiryDate: body.licenseExpiryDate
    }),
    cache: 'no-store'
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return parseBackendError(response.status, payload);
  }

  return NextResponse.json(payload);
}
