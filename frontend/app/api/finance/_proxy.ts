import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export function unauthorized() {
  return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
}

export function parseBackendError(status: number, payload: unknown) {
  if (typeof payload === 'object' && payload && 'message' in payload) {
    return NextResponse.json({ message: String((payload as { message: string }).message) }, { status });
  }
  return NextResponse.json({ message: 'Request failed' }, { status });
}

export function authToken() {
  return cookies().get('access_token')?.value;
}

export function backendBaseUrl() {
  return process.env.BACKEND_URL ?? 'http://localhost:8080';
}
