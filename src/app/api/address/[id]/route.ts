// Update/Delete Address API
import { NextResponse } from 'next/server';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  return NextResponse.json({ message: 'Update address', id: params.id });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  return NextResponse.json({ message: 'Delete address', id: params.id });
}
