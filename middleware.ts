// Next.js Middleware
import { NextResponse } from 'next/server';

export function middleware(req: any) {
  return NextResponse.next();
}
