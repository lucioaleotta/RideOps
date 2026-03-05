import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  cookies().delete('access_token');
  cookies().delete('user_role');
  return NextResponse.redirect(new URL('/login', request.url), 303);
}
