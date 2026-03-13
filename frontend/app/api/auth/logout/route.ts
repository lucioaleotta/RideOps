import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  cookies().delete('access_token');
  cookies().delete('user_role');

  // Keep redirect target relative to avoid Docker hostnames like 0.0.0.0 in the browser URL.
  return new NextResponse(null, {
    status: 303,
    headers: {
      Location: '/login',
    },
  });
}
