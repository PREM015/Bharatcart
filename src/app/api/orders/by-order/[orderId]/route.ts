// Order Details API
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: { orderId: string } }) {
  return NextResponse.json({ message: 'Get order details', orderId: params.orderId });
}
