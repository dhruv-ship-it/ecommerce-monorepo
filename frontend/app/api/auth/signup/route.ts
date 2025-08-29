import { NextResponse } from 'next/server';
import { findUserByEmail, createUser, getUserSafe } from '@/lib/mock-db';

export async function POST(req: Request) {
  const { name, email, password } = await req.json();
  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  if (findUserByEmail(email)) {
    return NextResponse.json({ error: 'User already exists' }, { status: 400 });
  }
  const user = createUser({ name, email, password });
  return NextResponse.json({ user: getUserSafe(user) });
} 