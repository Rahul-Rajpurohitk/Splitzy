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
  // Try WebSocket first (CloudFront supports it), then polling as fallback
  transports: ['websocket', 'polling'],
  upgrade: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 2000,
  timeout: 20000,
  autoConnect: false,
  // Force new connection on reconnect to avoid stale sessions
  forceNew: false,
});

// Basic connection logging
socket.on("connect", () => {
  console.log("Socket.IO connected, id:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("Socket.IO disconnected:", reason);
});

socket.on("connect_error", (error) => {
  console.log("Socket.IO connection error:", error.message);
});

// Reconnect socket with new token (call after login)
export const reconnectSocket = () => {
  const token = localStorage.getItem('splitzyToken');
  console.log('Reconnecting socket with token:', token ? 'present' : 'null');
  
  // Disconnect first if connected
  if (socket.connected) {
    socket.disconnect();
  }
  
  // Update auth with new token
  socket.auth = { token };
  socket.io.opts.query = { token };
  
  // Reconnect
  socket.connect();
  
  return socket;
};

// Disconnect socket (call on logout)
export const disconnectSocket = () => {
  console.log('Disconnecting socket...');
  socket.disconnect();
};

// Initial connection if token exists
const initialToken = localStorage.getItem('splitzyToken');
if (initialToken) {
  console.log('Initial token found, connecting socket...');
  socket.connect();
}

export default socket;
