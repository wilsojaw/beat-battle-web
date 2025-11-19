import { NextRequest } from 'next/server';

// This is a placeholder route - Socket.io will be initialized in server.js
export async function GET(request: NextRequest) {
  return new Response('Socket.io server', { status: 200 });
}
