// Wishlist API
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Get wishlist' });
}

export async function POST(req: Request) {
  return NextResponse.json({ message: 'Add to wishlist' });
}
