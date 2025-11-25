// Product Reviews API
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: { productId: string } }) {
  return NextResponse.json({ message: 'Get reviews', productId: params.productId });
}
