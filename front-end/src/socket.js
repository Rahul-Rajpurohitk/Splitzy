// src/socket.js
import { io } from 'socket.io-client';

const getSocket = () => {
  const token = localStorage.getItem('splitzyToken');
  return io("http://localhost:9092", {
    withCredentials: true,
    // socket.io-client 4.x uses 'auth' for token-based authentication
    auth: { token },
    // Fallback query for backward compatibility
    query: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
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
