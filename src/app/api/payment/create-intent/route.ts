// Create Payment Intent API
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  return NextResponse.json({ message: 'Create payment intent' });
}
