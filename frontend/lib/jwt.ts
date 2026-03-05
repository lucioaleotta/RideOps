export type JwtPayload = {
  sub?: string;
  role?: 'ADMIN' | 'GESTIONALE' | 'DRIVER' | string;
  exp?: number;
  [key: string]: unknown;
};

export function decodeJwt(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const normalized = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = Buffer.from(normalized, 'base64').toString('utf-8');
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}
