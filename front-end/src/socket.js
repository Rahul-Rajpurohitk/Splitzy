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

// Create single socket instance
const socket = io(socketUrl, {
  path: '/socket.io/',
  withCredentials: true,
  // Send token via both query and auth - netty-socketio reads query param first
  query: { token: localStorage.getItem('splitzyToken') },
  auth: { token: localStorage.getItem('splitzyToken') },
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

  // Disconnect first if connected
  if (socket.connected) {
    socket.disconnect();
  }

  // Close the underlying engine to force a fresh connection
  if (socket.io && socket.io.engine) {
    socket.io.engine.close();
  }

  // Update token for both query and auth - netty-socketio reads query param first
  socket.io.opts.query = { token };
  socket.auth = { token };

  if (socket.io) {
    // Re-enable auto-reconnection (might have been disabled on logout)
    socket.io.opts.reconnection = true;
  }

  // Reconnect - use a delay to ensure engine cleanup completes
  setTimeout(() => {
    socket.connect();
  }, 150);

  return socket;
};

// Disconnect socket (call on logout)
export const disconnectSocket = () => {
  if (socket.io) {
    socket.io.opts.reconnection = false;
  }
  socket.disconnect();
};

// Initial connection if token exists
const initialToken = localStorage.getItem('splitzyToken');
if (initialToken) {
  socket.connect();
}

export default socket;
