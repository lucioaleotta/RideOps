import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { decodeJwt } from '../../../../lib/jwt';

type LoginPayload = {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || !body.email || !body.password) {
    return NextResponse.json({ message: 'Payload non valido' }, { status: 400 });
  }

  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080';
  const loginResponse = await fetch(`${backendUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store'
  });

  if (!loginResponse.ok) {
    return NextResponse.json({ message: 'Credenziali non valide' }, { status: 401 });
  }

  const payload = (await loginResponse.json()) as LoginPayload;
  const decoded = decodeJwt(payload.accessToken);

  cookies().set('access_token', payload.accessToken, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: payload.expiresInSeconds
  });

  if (decoded?.role && typeof decoded.role === 'string') {
    cookies().set('user_role', decoded.role, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: payload.expiresInSeconds
    });
  }

  return NextResponse.json({ ok: true });
}
