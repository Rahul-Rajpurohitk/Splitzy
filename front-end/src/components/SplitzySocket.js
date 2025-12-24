// src/components/SplitzySocket.js
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { setConnected, setLastEvent } from "../features/socket/socketSlice";
import socket from "../socket";

function SplitzySocket() {
  const dispatch = useDispatch();

  useEffect(() => {
    // When connected, update Redux state
    socket.on("connect", () => {
      dispatch(setConnected(true));
      console.log("Socket.IO connected");
    });

    // When disconnected, update Redux state
    socket.on("disconnect", () => {
      dispatch(setConnected(false));
      console.log("Socket.IO disconnected");
    });

    // Listen for friend request events
    socket.on("friendRequest", (data) => {
      console.log("Socket.IO friendRequest event received:", data);
      // We store it in lastEvent with a custom shape
      dispatch(setLastEvent({
        eventType: "FRIEND_REQUEST",
        payload: data
      }));
    });

    // Listen for expense events
    socket.on("expenseEvent", (data) => {
      console.log("Socket.IO expenseEvent event received:", data);
      dispatch(setLastEvent({
        eventType: "EXPENSE_EVENT",
        payload: data
      }));
    });

    //Group Invite event listener ***
    socket.on("groupInvite", (data) => {
      console.log("Socket.IO groupInvite event received:", data);
      dispatch(setLastEvent({
        eventType: "GROUP_INVITE",
        payload: data
      }));
    });

    // Chat notification (sent to user's email room when someone messages them)
    socket.on("chat:notification", (data) => {
      console.log("Socket.IO chat:notification event received:", data);
      dispatch(setLastEvent({
        eventType: "CHAT_NOTIFICATION",
        payload: data
      }));
    });

    // Cleanup: remove event listeners on unmount
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("friendRequest");
      socket.off("expenseEvent");
      socket.off("groupInvite");
      socket.off("chat:notification");
    };
  }, [dispatch]);

  return null; // No UI
}

export default SplitzySocket;
