import { io, type Socket } from 'socket.io-client';
import { env } from '@/lib/env';

// socket.io-client singleton for the /rt namespace (kickoff §8). R1 carries
// ONLY the import:* events — no GPS stream (Warning 1).

let socket: Socket | null = null;

/** Realtime is unavailable under MSW (no socket server) — callers fall back to HTTP polling. */
export function realtimeEnabled(): boolean {
  return env.VITE_USE_MSW !== 'true';
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(env.VITE_WS_URL, {
      withCredentials: true, // session cookie rides along
      transports: ['websocket'],
      reconnectionAttempts: 5,
    });
  }
  return socket;
}

/** Test-only: swap the singleton (vi.mock is preferred; this aids cleanup). */
export function resetSocketForTests() {
  socket?.disconnect();
  socket = null;
}
