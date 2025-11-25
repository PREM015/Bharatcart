// Category CRUD API
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  return NextResponse.json({ message: 'Get category', id: params.id });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  return NextResponse.json({ message: 'Update category', id: params.id });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  return NextResponse.json({ message: 'Delete category', id: params.id });
}
