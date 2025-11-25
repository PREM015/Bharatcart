// Remove from Wishlist API
import { NextResponse } from 'next/server';

export async function DELETE(req: Request, { params }: { params: { productId: string } }) {
  return NextResponse.json({ message: 'Remove from wishlist', productId: params.productId });
}
