import { NextRequest, NextResponse } from 'next/server';

export function authMiddleware(request: NextRequest) {
  // TODO: Implement middleware logic
  return NextResponse.next();
}
