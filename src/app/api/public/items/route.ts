import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Redirect to Polish locale by default for backward compatibility
  const url = new URL(request.url);
  url.pathname = '/api/public/items/pl';
  return NextResponse.redirect(url);
}