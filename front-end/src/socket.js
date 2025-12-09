// src/socket.js
import io from 'socket.io-client';

const token = localStorage.getItem('splitzyToken');
const socket = io("http://localhost:9092", {
    withCredentials: true,
    // If you're using cookies for authentication, you wouldn't need query params
    // But if you're combining them, you can do both:
    query: { token }
  });
  

socket.on("connect", () => {
  console.log("Socket.IO connected, id:", socket.id);
});

socket.on("disconnect", () => {
  console.log("Socket.IO disconnected");
});

/* Listen for friend request events
socket.on("friendRequest", (data) => {
  console.log("Received friend request event:", data);
  // Here you can dispatch an action to Redux or update your UI accordingly
}); */

export default socket;
