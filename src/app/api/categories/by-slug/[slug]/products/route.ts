// Products by Category API
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  return NextResponse.json({ message: 'Get products by category', slug: params.slug });
}
