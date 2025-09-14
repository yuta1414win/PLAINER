import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserFromToken } from '@/lib/auth/jwt';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('plainer_session')?.value || null;
  const user = getSessionUserFromToken(token);
  return NextResponse.json({ user });
}

