import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ user: null, authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      user: session.user,
      authenticated: true,
      sessionToken: session.session?.token, // Better Auth stores token in session
    });
  } catch (error) {
    console.error('Error getting session:', error);
    return NextResponse.json({ user: null, authenticated: false }, { status: 500 });
  }
}
