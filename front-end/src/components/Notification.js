import React, { useEffect, useState, useCallback} from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import '../notification.css';
import { FiBell } from 'react-icons/fi';

function Notification() {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const userId = localStorage.getItem('myUserId');
  const token = localStorage.getItem('splitzyToken');

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
  
  

  // Toggle the dropdown
  const handleToggleDropdown = () => {
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

  useEffect(() => {
    // When the dropdown closes, mark expense and group invite notifications as read.
    if (!showDropdown) {
      // Filter notifications that should be auto-marked as read (e.g., EXPENSE and GROUP_INVITE)
      const autoMarkList = notifications.filter(n => 
        n.type === "EXPENSE" || n.type === "GROUP_INVITE"
      );
      autoMarkList.forEach(n => {
        markNotificationAsRead(n.id);
      });
    }
  }, [showDropdown, notifications, markNotificationAsRead]);
  
  
  

  const unreadCount = notifications.length;
  const bellClasses = [
    "notif-bell",
    showDropdown ? "active" : "",
    unreadCount > 0 ? "has-unread" : ""
  ].join(" ").trim();

  return (
    <div className="notif-wrapper">
      <button className={bellClasses} onClick={handleToggleDropdown}>
        <FiBell className="notif-icon" aria-hidden="true" />
        {unreadCount > 0 && <span className="notif-dot">{unreadCount}</span>}
      </button>

      {showDropdown && (
        <div className="notif-dropdown glass-card">
          <div className="notif-header">
            <span>Notifications</span>
            <button className="chip ghost" onClick={() => setShowDropdown(false)}>Close</button>
          </div>
          <div className="panel-divider soft" />

          {notifications.length === 0 && (
            <div className="notif-empty">You’re all caught up.</div>
          )}

          {notifications.map((n) => (
            <div
              key={n.id}
              className={`notif-item ${n.type === "EXPENSE" || n.type === "GROUP_INVITE" ? "notif-info" : "notif-action"}`}
            >
              {n.type === "EXPENSE" || n.type === "GROUP_INVITE" ? (
                <div
                  className="notif-message"
                  onClick={() => markNotificationAsRead(n.id)}
                >
                  <span className="notif-title">{n.senderName}</span>
                  <span className="notif-sub">
                    {n.type === "GROUP_INVITE"
                      ? "invited you to a group."
                      : "added you to an expense."}
                  </span>
                </div>
              ) : (
                <div className="notif-message">
                  <span className="notif-title">{n.senderName}</span>
                  <span className="notif-sub">sent you a friend request.</span>
                  <div className="notif-actions">
                    <button
                      className="chip primary"
                      onClick={() => handleAccept(n.referenceId)}
                    >
                      Accept
                    </button>
                    <button
                      className="chip ghost"
                      onClick={() => handleReject(n.referenceId)}
                    >
                      Reject
                    </button>
                  </div>
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
