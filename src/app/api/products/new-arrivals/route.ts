// New Arrivals API
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Get new arrivals' });
}
