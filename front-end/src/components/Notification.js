import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import '../notification.css';
import { FiBell } from 'react-icons/fi';

function Notification() {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef(null);

  const userId = localStorage.getItem('myUserId');
  const token = localStorage.getItem('splitzyToken');

  // Reference to current notifications for use in event handlers
  const notificationsRef = useRef(notifications);
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  // Helper to mark non-action notifications as read (everything except FRIEND_REQUEST)
  const markInfoNotificationsAsRead = useCallback(async () => {
    const currentNotifications = notificationsRef.current;
    
    // Mark ALL notifications that are NOT friend requests
    const infoNotifications = currentNotifications.filter(n => 
      n.type !== "FRIEND_REQUEST"
    );
    
    console.log("[Notification] Total notifications:", currentNotifications.length);
    console.log("[Notification] Types:", currentNotifications.map(n => n.type));
    console.log("[Notification] To mark as read:", infoNotifications.length);
    
    if (infoNotifications.length === 0) {
      console.log("[Notification] All notifications are FRIEND_REQUEST - require action");
      return;
    }
    
    const ids = infoNotifications.map(n => n.id);
    
    try {
      // Try bulk endpoint first
      await axios.post(
        `${process.env.REACT_APP_API_URL}/notifications/mark-read-bulk`,
        ids,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("[Notification] Bulk mark success");
    } catch (err) {
      console.warn("[Notification] Bulk failed, trying individual marks");
      // Fallback: mark individually
      for (const id of ids) {
        try {
          await axios.patch(
            `${process.env.REACT_APP_API_URL}/notifications/${id}/read`,
            null,
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } catch (e) {
          console.error("[Notification] Failed to mark:", id, e);
        }
      }
    }
    
    // Remove non-FRIEND_REQUEST notifications from state
    setNotifications(prev => prev.filter(n => n.type === "FRIEND_REQUEST"));
    console.log("[Notification] Removed from state, remaining:", 
      currentNotifications.filter(n => n.type === "FRIEND_REQUEST").length);
  }, [token]);

  // Close dropdown when modals open
  useEffect(() => {
    const handleModalOpen = () => {
      if (showDropdown) {
        markInfoNotificationsAsRead();
        setShowDropdown(false);
      }
    };
    window.addEventListener('modalOpened', handleModalOpen);
    return () => window.removeEventListener('modalOpened', handleModalOpen);
  }, [showDropdown, markInfoNotificationsAsRead]);

  // 1) Read lastEvent from Redux  
  const lastEvent = useSelector((state) => state.socket.lastEvent);

  //2) A function to fetch the user's notifications from the server
  const fetchNotifications = useCallback(async () => {
    try {
      
      if (!userId || !token) return;

      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/notifications?userId=${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications(res.data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, [userId, token]); // If userId and token are constant after login, an empty dependency array is fine

  // On mount, fetch notifications once
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Whenever lastEvent changes, decide if we need to fetch again
  useEffect(() => {
    if (!lastEvent) return;
    console.log('[Notification] saw lastEvent:', lastEvent);
    
    switch (lastEvent.eventType) {
      case 'FRIEND_REQUEST':
        if (lastEvent.payload.type === 'FRIEND_REQUEST_SENT') {
          console.log('[Notification] re-fetching notifications for FRIEND_REQUEST_SENT event');
          fetchNotifications();
        }
        break;
      case 'EXPENSE_EVENT':
        if (lastEvent.payload.type === 'EXPENSE_CREATED') {
          console.log('[Notification] re-fetching notifications for EXPENSE_CREATED event');
          fetchNotifications();
        }
        break;
      case 'GROUP_INVITE':
        if (lastEvent.payload.type === 'GROUP_INVITE') {
          console.log('[Notification] re-fetching notifications for GROUP_INVITE event');
          fetchNotifications();
        }
        break;
      // Add more cases as needed for different event types
      default:
        console.log('[Notification] no matching event type');
        break;
    }
  }, [lastEvent, fetchNotifications]);
  
  

  // Toggle the dropdown - mark info notifications as read when closing
  const handleToggleDropdown = () => {
    if (showDropdown) {
      // Dropdown is closing - mark regular notifications as read
      markInfoNotificationsAsRead();
    }
    setShowDropdown(!showDropdown);
  };

  // Accept friend request
  const handleAccept = async (referenceId) => {
    try {
      const token = localStorage.getItem('splitzyToken');
      const receiverId = localStorage.getItem('myUserId');
      await axios.patch(
        `${process.env.REACT_APP_API_URL}/home/friends/request/${referenceId}/accept?receiverId=${receiverId}`,
        null,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Friend request accepted!');
   
      setNotifications(notifications.filter(n => n.referenceId !== referenceId));
      fetchNotifications(); // Refresh notifications
    } catch (err) {
      console.error("Error accepting friend request:", err);
    }
  };

  // Reject friend request
  const handleReject = async (referenceId) => {
    try {
      const token = localStorage.getItem('splitzyToken');
      const receiverId = localStorage.getItem('myUserId');
      await axios.patch(
        `${process.env.REACT_APP_API_URL}/home/friends/request/${referenceId}/reject?receiverId=${receiverId}`,
        null,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Friend request rejected.');
      // Optionally remove this notification from state
      setNotifications(notifications.filter(n => n.referenceId !== referenceId));
    } catch (err) {
      console.error("Error rejecting friend request:", err);
    }
  };

  

  const markNotificationAsRead = useCallback(async (notificationId) => {
      try {
        await axios.patch(
          `${process.env.REACT_APP_API_URL}/notifications/${notificationId}/read`,
          null,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        // Remove the notification from local state after marking it read
        setNotifications((prev) => prev.filter(n => n.id !== notificationId));
      } catch (err) {
        console.error("Error marking notification as read:", err);
      }
    }, [token]);

  // Close dropdown and mark as read when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target) && showDropdown) {
        markInfoNotificationsAsRead();
        setShowDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown, markInfoNotificationsAsRead]);
  
  
  

  const unreadCount = notifications.length;
  const bellClasses = [
    "notif-bell",
    showDropdown ? "active" : "",
    unreadCount > 0 ? "has-unread" : ""
  ].join(" ").trim();

  return (
    <div className="notif-wrapper" ref={wrapperRef}>
      <button className={`nav-icon-pill ${bellClasses}`} onClick={handleToggleDropdown} title="Notifications">
        <FiBell className="notif-icon" aria-hidden="true" />
        <span className="nav-icon-text">Notifications</span>
      </button>
      {unreadCount > 0 && <span className="notif-dot">{unreadCount}</span>}

      {showDropdown && (
        <div className="notif-dropdown glass-card">
          <div className="notif-header">
            <span>Notifications</span>
            <button className="chip ghost" onClick={handleToggleDropdown}>Close</button>
          </div>
          <div className="panel-divider soft" />

          {notifications.length === 0 && (
            <div className="notif-empty">You’re all caught up.</div>
          )}

          {notifications.map((n) => (
            <div
              key={n.id}
              className={`notif-item ${n.type === "FRIEND_REQUEST" ? "notif-action" : "notif-info"}`}
            >
              <div className="notif-message" onClick={() => n.type !== "FRIEND_REQUEST" && markNotificationAsRead(n.id)}>
                <span className="notif-title">{n.senderName}</span>
                <span className="notif-sub">
                  {n.type === "GROUP_INVITE"
                    ? "invited you to a group."
                    : n.type === "EXPENSE"
                    ? "added you to an expense."
                    : n.type === "FRIEND_REQUEST"
                    ? "sent you a friend request."
                    : n.message || "New notification"}
                </span>
              </div>
              {/* Friend requests require action - show Accept/Reject buttons */}
              {n.type === "FRIEND_REQUEST" && (
                <div className="notif-actions">
                  <button className="chip primary" onClick={() => handleAccept(n.referenceId)}>
                    Accept
                  </button>
                  <button className="chip ghost" onClick={() => handleReject(n.referenceId)}>
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Notification;
