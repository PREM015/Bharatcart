import { NextRequest, NextResponse } from 'next/server';

export async function admin.guardGuard(request: NextRequest) {
  try {
    // TODO: Implement guard logic
    return true;
  } catch (error) {
    return false;
  }
}
