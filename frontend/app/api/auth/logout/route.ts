import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  cookies().delete('access_token');
  cookies().delete('user_role');
  return NextResponse.json({ ok: true });
}
