import { NextRequest, NextResponse } from 'next/server';

export function geoMiddleware(request: NextRequest) {
  // TODO: Implement middleware logic
  return NextResponse.next();
}
