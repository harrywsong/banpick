'use client';

import { io } from 'socket.io-client';

let socket;

export function getSocket() {
  if (!socket) {
    const serverUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
      ? `http://${window.location.hostname}:4003`
      : 'http://localhost:4003';

    socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });
  }
  return socket;
}
