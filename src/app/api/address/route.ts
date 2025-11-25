// Address CRUD API
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Get addresses' });
}

export async function POST(req: Request) {
  return NextResponse.json({ message: 'Create address' });
}
