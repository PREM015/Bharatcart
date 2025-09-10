import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(req: Request) {
  try {
    const { identifier, password, mode } = await req.json();

    // FIXED: Make mode optional or default to 'login'
    if (mode && mode !== 'login') {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    // FIXED: Better error handling for JWT_SECRET
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set in environment variables');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Try to find user by email or phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { phone: identifier }
        ]
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        phone: user.phone, 
        isAdmin: user.isAdmin 
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    // FIXED: Create response with cookie
    const response = NextResponse.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        isAdmin: user.isAdmin
      }
    });

    // FIXED: Set secure HTTP-only cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}