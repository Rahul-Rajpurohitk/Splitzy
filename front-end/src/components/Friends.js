
import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import '../home.css';


function Friends() {
  const [friends, setFriends] = useState([]);  // array of { id, name } objects
  const [showAddModal, setShowAddModal] = useState(false);

  // For searching users in "Add Friend" modal
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);

  // For "Unfriend" popup
  const [showUnfriendModal, setShowUnfriendModal] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);

  // Token & userId from localStorage
  const token = localStorage.getItem('splitzyToken');
  const userId = localStorage.getItem('myUserId');

  // ------------------------------------
  // 1) Read lastEvent from Redux Fetch friend list on mount
  // ------------------------------------
  const lastEvent = useSelector((state) => state.socket.lastEvent);

  const fetchFriendList = useCallback(async () => {
    if (!userId || !token) return;

    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/home/friends?userId=${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setFriends(response.data);
    } catch (error) {
      console.error('Error fetching friend list:', error);
    }
  }, [userId, token]);

  // Fetch friend list on mount
  useEffect(() => {
    fetchFriendList();
  }, [fetchFriendList]);

  // Listen for real-time events from lastEvent
  useEffect(() => {
    if (!lastEvent) return;
    console.log('[Friends] saw lastEvent:', lastEvent);
    if(lastEvent.eventType === 'FRIEND_REQUEST') {
      switch (lastEvent.payload.type) {
        case 'FRIEND_REQUEST_ACCEPTED':
        case 'UNFRIEND':
          console.log('[Friends] re-fetching friend list due to', lastEvent.type);
          fetchFriendList();
          break;
        default:
          // Possibly ignore or handle other event types
          break;
      }
    }
  }, [lastEvent, fetchFriendList]);

  // If you only want to show top 4
  const topFriends = friends.slice(0, 4);

  // -------------------------------------------------
  // 2) WebSocket callback
  // -------------------------------------------------
  // When a real-time event arrives (accept/reject/unfriend),
  // we re-fetch the friend list to update the UI immediately.
  

  // ------------------------------------
  // Searching in "Add Friend" modal
  // ------------------------------------
  const handleSearchChange = async (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (value.length >= 3) {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/search/user?q=${value}&userId=${userId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setSearchResults(response.data);
        setShowResults(true);
      } catch (error) {
        console.error('Search error:', error);
      }
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  };

  // ------------------------------------
  // Send friend request
  // ------------------------------------
  const handleAddFriend = async (receiverId) => {
    try {
      const url = `${process.env.REACT_APP_API_URL}/home/friends/request?senderId=${userId}&receiverId=${receiverId}`;
      await axios.post(url, null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Friend request sent!');
      // You might re-fetch or wait for them to accept
      // fetchFriendList();
    } catch (error) {
      console.error('Error sending friend request:', error);
      alert(error.response?.data || 'Could not send friend request');
    }
  };

  // ------------------------------------
  // Unfriend logic
  // ------------------------------------
  const handleUnfriend = async (friendId) => {
    try {
      const url = `${process.env.REACT_APP_API_URL}/home/friends/unfriend?userId1=${userId}&userId2=${friendId}`;
      await axios.patch(url, null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Unfriended successfully!');
      // Re-fetch to see updated friend list
      fetchFriendList();
    } catch (error) {
      console.error('Error unfriending:', error);
      alert(error.response?.data || 'Could not unfriend');
    }
  };

  // Show/hide "Add friend" modal
  const handleAddFriendClick = () => {
    setShowAddModal(true);
  };
  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setSearchTerm('');
    setSearchResults([]);
    setShowResults(false);
  };

  // Show/hide "Unfriend" modal
  const handleOpenUnfriendModal = (friend) => {
    setSelectedFriend(friend);
    setShowUnfriendModal(true);
  };
  const handleCloseUnfriendModal = () => {
    setShowUnfriendModal(false);
    setSelectedFriend(null);
  };
  const handleConfirmUnfriend = () => {
    if (selectedFriend) {
      // selectedFriend is an object { id, name }
      handleUnfriend(selectedFriend.id);
    }
    handleCloseUnfriendModal();
  };

  return (
    <div className="friends-block">
      {/* Header with "FRIENDS" and "+ add" on the right */}
      <div className="friends-header">
        <h1 className="friends-title">FRIENDS</h1>
        <button className="add-friend-btn" onClick={handleAddFriendClick}>
          + add
        </button>
      </div>

      {/* Render the top 4 friend objects */}
      <ul className="friends-list">
        {topFriends.map((friend) => (
          <li key={friend.id} className="friend-item">
            <span>{friend.name}</span>
            <button
              className="unfriend-btn"
              onClick={() => handleOpenUnfriendModal(friend)}
            >
              x
            </button>
          </li>
        ))}
      </ul>

      {/* ------------------------------------
          ADD FRIEND MODAL
      ------------------------------------ */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Invite friends</h3>
            <input
              type="text"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="search-input-modal"
            />
            {showResults && searchResults.length > 0 && (
              <div className="search-results-modal">
                {searchResults.map((user) => (
                  <div key={user.id} className="search-item-modal">
                    <span>{user.name}</span>
                    <button
                      onClick={() => handleAddFriend(user.id)}
                      className="add-friend-modal-btn"
                    >
                      Add Friend
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="modal-actions">
              <button className="close-modal-btn" onClick={handleCloseAddModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------
          UNFRIEND CONFIRMATION MODAL
      ------------------------------------ */}
      {showUnfriendModal && selectedFriend && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Unfriend Confirmation</h3>
            <p>
              Are you sure you want to unfriend{' '}
              <strong>{selectedFriend.name}</strong>?
            </p>
            <div className="modal-actions">
              <button
                className="confirm-modal-btn"
                onClick={handleConfirmUnfriend}
              >
                Confirm
              </button>
              <button
                className="close-modal-btn"
                onClick={handleCloseUnfriendModal}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Friends;
