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
  if (!body || !body.userId || !body.password) {
    return NextResponse.json({ message: 'Payload non valido' }, { status: 400 });
  }

  const forwardedFor = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? '';
  const userAgent = request.headers.get('user-agent') ?? '';
  const countryCode = request.headers.get('x-vercel-ip-country') ?? request.headers.get('cf-ipcountry') ?? '';
  const countryName = request.headers.get('x-vercel-ip-country-region') ?? '';
  const city = request.headers.get('x-vercel-ip-city') ?? '';

  const backendUrl = process.env.BACKEND_URL?.trim();
  if (!backendUrl) {
    console.error('BACKEND_URL non configurata in frontend runtime');
    return NextResponse.json({ message: 'Servizio autenticazione non configurato' }, { status: 503 });
  }

  let loginResponse: Response;
  try {
    loginResponse = await fetch(`${backendUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': forwardedFor,
        'X-Country-Code': countryCode,
        'X-Country-Name': countryName,
        'X-City': city,
        'User-Agent': userAgent
      },
      body: JSON.stringify(body),
      cache: 'no-store'
    });
  } catch (error) {
    console.error('Errore chiamando backend /auth/login', error);
    return NextResponse.json({ message: 'Servizio autenticazione non raggiungibile' }, { status: 503 });
  }

  if (!loginResponse.ok) {
    return NextResponse.json({ message: 'Credenziali non valide' }, { status: 401 });
  }

  const payload = (await loginResponse.json()) as LoginPayload;
  const decoded = decodeJwt(payload.accessToken);

  const isProduction = process.env.NODE_ENV === 'production';
  // TRADE-OFF: secure:false in development per HTTP locale; true in prod (HTTPS obbligatorio).
  cookies().set('access_token', payload.accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: payload.expiresInSeconds
  });

  if (decoded?.role && typeof decoded.role === 'string') {
    cookies().set('user_role', decoded.role, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: payload.expiresInSeconds
    });
  }

  return NextResponse.json({ ok: true });
}
