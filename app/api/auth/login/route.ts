import { NextRequest, NextResponse } from 'next/server';
import { createJWT } from '@/lib/auth/jwt';
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || '')?.trim();
    const id = String(body?.id || `user_${nanoid(10)}`);

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const token = createJWT({ sub: id, name }, { expiresInSec: 60 * 60 * 24 * 7 });

    const res = NextResponse.json({ ok: true, user: { id, name } });
    // Set httpOnly cookie; Lax so it’s sent to same-site requests (incl. WS handshake)
    res.cookies.set('plainer_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return res;
  } catch (error) {
    console.error('Login request failed', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
