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

export async function GET(request: Request) {
  const token = cookies().get('access_token')?.value;
  if (!token) {
    return unauthorized();
  }

  const url = new URL(request.url);
  const includeDeleted = url.searchParams.get('includeDeleted') === 'true';

  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080';
  const response = await fetch(`${backendUrl}/gestionale/drivers?includeDeleted=${includeDeleted ? 'true' : 'false'}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  });

  const payload = await response.json().catch(() => []);
  if (!response.ok) {
    return parseBackendError(response.status, payload);
  }

  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  const token = cookies().get('access_token')?.value;
  if (!token) {
    return unauthorized();
  }

  const body = await request.json().catch(() => null);
  if (!body
    || !body.userId
    || !body.email
    || !body.password
    || !body.firstName
    || !body.lastName
    || !body.birthDate
    || !body.licenseNumber
    || !Array.isArray(body.licenseTypes)
    || body.licenseTypes.length === 0
    || !Array.isArray(body.residentialAddresses)
    || body.residentialAddresses.length === 0
    || !body.mobilePhone
    || !body.licenseExpiryDate) {
    return NextResponse.json({ message: 'Payload non valido' }, { status: 400 });
  }

  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080';
  const response = await fetch(`${backendUrl}/gestionale/drivers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      userId: body.userId,
      email: body.email,
      password: body.password,
      firstName: body.firstName,
      lastName: body.lastName,
      birthDate: body.birthDate,
      licenseNumber: body.licenseNumber,
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

  return NextResponse.json(payload, { status: 201 });
}