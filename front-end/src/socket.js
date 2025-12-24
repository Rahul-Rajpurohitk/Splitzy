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

// Create single socket instance - WebSocket ONLY for real-time
const socket = io(socketUrl, {
  path: '/socket.io/',
  withCredentials: true,
  auth: { token: localStorage.getItem('splitzyToken') },
  query: { token: localStorage.getItem('splitzyToken') },
  // WebSocket ONLY - no polling fallback (causes session issues with CloudFront)
  transports: ['websocket'],
  upgrade: false,
  reconnection: true,
  reconnectionAttempts: 15,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 30000,
  autoConnect: false,
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
