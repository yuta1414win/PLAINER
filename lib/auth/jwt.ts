import crypto from 'crypto';

// Minimal JWT (HS256) utility without external deps

function base64url(input: Buffer | string): string {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return b
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signHMAC(data: string, secret: string): string {
  return base64url(crypto.createHmac('sha256', secret).update(data).digest());
}

export type JwtPayload = {
  sub: string; // user id
  name: string;
  iat: number;
  exp: number;
};

export function createJWT(payload: Omit<JwtPayload, 'iat' | 'exp'>, opts?: { expiresInSec?: number; secret?: string }): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + (opts?.expiresInSec ?? 60 * 60 * 24 * 7); // default 7d
  const full: JwtPayload = { ...payload, iat, exp } as JwtPayload;

  const encHeader = base64url(JSON.stringify(header));
  const encPayload = base64url(JSON.stringify(full));
  const secret = opts?.secret || process.env.JWT_SECRET || 'dev-insecure-secret-change-me';
  const signature = signHMAC(`${encHeader}.${encPayload}`, secret);
  return `${encHeader}.${encPayload}.${signature}`;
}

export function verifyJWT(token: string, opts?: { secret?: string }): JwtPayload | null {
  try {
    const [encHeader, encPayload, signature] = token.split('.');
    if (!encHeader || !encPayload || !signature) return null;
    const secret = opts?.secret || process.env.JWT_SECRET || 'dev-insecure-secret-change-me';
    const expected = signHMAC(`${encHeader}.${encPayload}`, secret);
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(encPayload, 'base64').toString()) as JwtPayload;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  cookieHeader.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const k = pair.slice(0, idx).trim();
    const v = decodeURIComponent(pair.slice(idx + 1).trim());
    out[k] = v;
  });
  return out;
}

export type SessionUser = { id: string; name: string };

export function getSessionUserFromToken(token: string | undefined | null): SessionUser | null {
  if (!token) return null;
  const payload = verifyJWT(token);
  if (!payload) return null;
  return { id: payload.sub, name: payload.name };
}

