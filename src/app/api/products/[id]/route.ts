// Product CRUD API
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  return NextResponse.json({ message: 'Get product', id: params.id });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  return NextResponse.json({ message: 'Update product', id: params.id });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  return NextResponse.json({ message: 'Delete product', id: params.id });
}
