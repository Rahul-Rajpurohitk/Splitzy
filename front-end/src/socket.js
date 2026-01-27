// src/socket.js
import { io } from 'socket.io-client';

// Determine Socket.IO server URL based on environment
const getSocketUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    // ALWAYS use CloudFront URL in production - Socket.IO goes through CloudFront proxy
    // Do NOT use direct EC2 connection (causes mixed content errors)
    return 'https://splitzy.xyz';
  }
  return 'http://localhost:9092';
};

const socketUrl = getSocketUrl();
console.log('Socket.IO URL:', socketUrl);

// Create single socket instance
const socket = io(socketUrl, {
  path: '/socket.io/',
  withCredentials: true,
  auth: { token: localStorage.getItem('splitzyToken') },
  query: { token: localStorage.getItem('splitzyToken') },
  // Start with polling, then upgrade to WebSocket for stability
  transports: ['polling', 'websocket'],
  upgrade: true,
  reconnection: true,
  reconnectionAttempts: Infinity, // Keep trying forever
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  randomizationFactor: 0.5,
  timeout: 20000,
  autoConnect: false,
});

// Basic connection logging
socket.on("connect", () => {
  console.log("[Socket] Connected successfully, id:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("[Socket] Disconnected:", reason);

  // If user logged out or token is gone, disable auto-reconnect
  const currentToken = localStorage.getItem('splitzyToken');
  if (!currentToken) {
    console.log("[Socket] No token found after disconnect, disabling auto-reconnect");
    socket.io.opts.reconnection = false;
  }
});

socket.on("connect_error", (error) => {
  console.log("[Socket] Connection error:", error.message);

  // If we get connection errors and there's no token, stop trying
  const currentToken = localStorage.getItem('splitzyToken');
  if (!currentToken) {
    console.log("[Socket] No token found, stopping reconnection attempts");
    socket.disconnect();
  }
});

// Reconnect socket with new token (call after login)
export const reconnectSocket = () => {
  const token = localStorage.getItem('splitzyToken');

  if (!token) {
    console.warn('[Socket] No token found in localStorage, cannot connect');
    return socket;
  }

  console.log('[Socket] Reconnecting with token present, length:', token.length);

  // Disconnect first if connected
  if (socket.connected) {
    console.log('[Socket] Disconnecting existing connection...');
    socket.disconnect();
  }

  // Close the underlying engine to force a fresh connection
  if (socket.io && socket.io.engine) {
    console.log('[Socket] Closing engine for fresh connection...');
    socket.io.engine.close();
  }

  // Update auth with new token (Socket.IO v4 style)
  socket.auth = { token };

  // Update query params at all levels for netty-socketio compatibility
  if (socket.io) {
    // Update Manager options
    socket.io.opts.query = { token };
    // Re-enable auto-reconnection (might have been disabled on logout)
    socket.io.opts.reconnection = true;
    // Also update _opts if it exists (internal backup)
    if (socket.io._opts) {
      socket.io._opts.query = { token };
    }
  }

  // Reconnect - use a delay to ensure engine cleanup completes
  setTimeout(() => {
    console.log('[Socket] Connecting with updated token...');
    socket.connect();
  }, 150);

  return socket;
};

// Disconnect socket (call on logout)
export const disconnectSocket = () => {
  console.log('[Socket] Disconnecting and disabling auto-reconnect...');
  // Disable auto-reconnect to prevent reconnecting without token
  if (socket.io) {
    socket.io.opts.reconnection = false;
  }
  socket.disconnect();
};

// Initial connection if token exists
const initialToken = localStorage.getItem('splitzyToken');
if (initialToken) {
  console.log('Initial token found, connecting socket...');
  socket.connect();
}

export default socket;
