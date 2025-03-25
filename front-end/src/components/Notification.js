import React, { useEffect, useState, useCallback} from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import '../notification.css';


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

    if (lastEvent.eventType === 'FRIEND_REQUEST') {
      switch (lastEvent.payload.type) {
        case 'FRIEND_REQUEST_SENT':
          console.log('[Notification] re-fetching notifications');
          fetchNotifications();
          break;
        default:
          break;
      }
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

  return (
    <div className="notification-container">
      <button className="notification-bell" onClick={handleToggleDropdown}>
        Notifications ({notifications.length})
      </button>

      {showDropdown && (
        <div className="notification-dropdown">
          {notifications.length === 0 ? (
            <div className="no-notifications">No notifications</div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="notification-item friend-request">
                {/* Show the sender name on the left */}
                <div className="sender-name">{n.senderName}</div>

                {/* Accept/Reject Buttons */}
                <div className="request-actions">
                  <button
                    className="accept-btn"
                    onClick={() => handleAccept(n.referenceId)}
                  >
                    Accept
                  </button>
                  <button
                    className="reject-btn"
                    onClick={() => handleReject(n.referenceId)}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default Notification;
