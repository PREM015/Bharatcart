// Cancel Order API
import { NextResponse } from 'next/server';

export async function POST(req: Request, { params }: { params: { orderId: string } }) {
  return NextResponse.json({ message: 'Cancel order', orderId: params.orderId });
}
