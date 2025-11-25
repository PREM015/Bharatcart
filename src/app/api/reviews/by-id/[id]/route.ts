// Update/Delete Review API
import { NextResponse } from 'next/server';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  return NextResponse.json({ message: 'Update review', id: params.id });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  return NextResponse.json({ message: 'Delete review', id: params.id });
}
