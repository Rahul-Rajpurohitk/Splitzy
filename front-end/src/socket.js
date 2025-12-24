// src/socket.js
import { io } from 'socket.io-client';

// Determine Socket.IO server URL based on environment
const getSocketUrl = () => {
  // In production, use the same domain with /socket.io path
  if (process.env.NODE_ENV === 'production') {
    // Use HTTPS WebSocket through CloudFront
    return process.env.REACT_APP_SOCKET_URL || 'https://splitzy.xyz';
  }
  // In development, connect to local Socket.IO server
  return 'http://localhost:9092';
};

const getSocket = () => {
  const token = localStorage.getItem('splitzyToken');
  const socketUrl = getSocketUrl();
  
  console.log('Socket.IO connecting to:', socketUrl);
  
  return io(socketUrl, {
    path: '/socket.io/',
    withCredentials: true,
    // socket.io-client 4.x uses 'auth' for token-based authentication
    auth: { token },
    // Fallback query for backward compatibility with netty-socketio
    query: { token },
    // Use polling first for better compatibility with netty-socketio 2.x
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    // Force Socket.IO v2 protocol for netty-socketio compatibility
    forceNew: true,
  });
};

const socket = getSocket();

socket.on("connect", () => {
  console.log("Socket.IO connected, id:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("Socket.IO disconnected:", reason);
});

socket.on("connect_error", (error) => {
  console.log("Socket.IO connection error:", error.message);
});

/* Listen for friend request events
socket.on("friendRequest", (data) => {
  console.log("Received friend request event:", data);
  // Here you can dispatch an action to Redux or update your UI accordingly
}); */

export default socket;
