import { NextRequest, NextResponse } from 'next/server';

export function maintenanceMiddleware(request: NextRequest) {
  // TODO: Implement middleware logic
  return NextResponse.next();
}
