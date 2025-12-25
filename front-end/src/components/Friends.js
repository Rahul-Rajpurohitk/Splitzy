import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { FiMessageCircle, FiX } from 'react-icons/fi';
import { setExpenseFilter } from '../features/expense/expenseSlice'; // New action

function Friends({ onOpenChat }) {
  const dispatch = useDispatch();
  const [friends, setFriends] = useState([]);  // array of friend objects { id, name, ... }
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [showUnfriendModal, setShowUnfriendModal] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);

  // Token & userId from localStorage
  const token = localStorage.getItem('splitzyToken');
  const userId = localStorage.getItem('myUserId');
  
  // Handle opening chat with a friend
  const handleOpenFriendChat = async (friend, e) => {
    e.stopPropagation();
    if (!onOpenChat) return;
    
    try {
      // Create or get existing P2P thread with this friend
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/chat/p2p?userId1=${userId}&userId2=${friend.id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const thread = response.data;
      onOpenChat(thread);
    } catch (error) {
      console.error('Error opening chat:', error);
    }
  };

  // ------------------------------------
  // 1) Fetch friend list (on mount)
  // ------------------------------------
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

  useEffect(() => {
    fetchFriendList();
  }, [fetchFriendList]);

  // ------------------------------------
  // 2) Listen for realtime events via Redux (if needed)
  // ------------------------------------
  const lastEvent = useSelector((state) => state.socket.lastEvent);
  useEffect(() => {
    if (!lastEvent) return;
    console.log('[Friends] received event:', lastEvent);
    if(lastEvent.eventType === 'FRIEND_REQUEST') {
      // Re-fetch list after accepted/unfriended events
      if (
        lastEvent.payload.type === 'FRIEND_REQUEST_ACCEPTED' ||
        lastEvent.payload.type === 'UNFRIEND'
      ) {
        fetchFriendList();
      }
    }
  }, [lastEvent, fetchFriendList]);

  // ------------------------------------
  // 3) Searching in "Add Friend" modal
  // ------------------------------------
  const handleSearchChange = async (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.length >= 3) {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_URL}/search/user?q=${value}&userId=${userId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSearchResults(res.data);
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
  // 4) Friend Add and Remove Handlers
  // ------------------------------------
  const handleAddFriend = async (receiverId) => {
    try {
      const url = `${process.env.REACT_APP_API_URL}/home/friends/request?senderId=${userId}&receiverId=${receiverId}`;
      await axios.post(url, null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Friend request sent!');
    } catch (error) {
      console.error('Error sending friend request:', error);
      alert(error.response?.data || 'Could not send friend request');
    }
  };

  // const handleSelectFriend = (user) => {
  //   if (!user.id) {
  //     console.warn("Friend object has no 'id' field!", user);
  //     return;
  //   }
  //   // Add friend only if not already in list
  //   if (!friends.find((f) => f.id === user.id)) {
  //     setFriends([...friends, user]);
  //   }
  //   setSearchTerm('');
  //   setSearchResults([]);
  //   setShowResults(false);
  // };

  const handleRemoveFriend = async (friendId) => {
    try {
      const url = `${process.env.REACT_APP_API_URL}/home/friends/unfriend?userId1=${userId}&userId2=${friendId}`;
      await axios.patch(url, null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Unfriended successfully!');
      fetchFriendList();
    } catch (error) {
      console.error('Error unfriending:', error);
      alert(error.response?.data || 'Could not unfriend');
    }
  };

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
      handleRemoveFriend(selectedFriend.id);
    }
    handleCloseUnfriendModal();
  };

  // Show all friends (scrollable list)
  const topFriends = friends;

    // NEW: Friend click handler to set the expense filter
  const handleFriendClick = (friend) => {
    // Dispatch our new expense filter with filterType "contact" (or "friend") and the friend object.
    dispatch(setExpenseFilter({ filterType: "friend", filterEntity: friend }));
  };

  return (
    <div className="panel slim-card">
      <div className="panel-header">
        <span>Friends</span>
        <button className="chip ghost" onClick={() => {
          window.dispatchEvent(new CustomEvent('modalOpened'));
          setShowAddModal(true);
        }}>+ Add</button>
      </div>
      <div className="panel-divider" />
      <ul className="list-stack compact">
        {topFriends.length > 0 ? (
          topFriends.map((friend) => (
            <li key={friend.id} className="list-row friend-row" onClick={() => handleFriendClick(friend)}>
              <div className="avatar-sm">{friend.name?.[0] || "F"}</div>
              <span className="row-name">{friend.name}</span>
              <div className="friend-actions">
                {onOpenChat && (
                  <button
                    className="friend-chat-btn"
                    onClick={(e) => handleOpenFriendChat(friend, e)}
                    title="Send message"
                  >
                    <FiMessageCircle size={16} />
                  </button>
                )}
                <button
                  className="row-action unfriend-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenUnfriendModal(friend);
                  }}
                  title="Remove friend"
                >
                  <FiX size={14} />
                </button>
              </div>
            </li>
          ))
        ) : (
          <p className="muted small">No friends yet</p>
        )}
      </ul>

      {showAddModal && createPortal(
        <div className="modal-overlay glass-backdrop">
          <div className="glass-card modal-card-sm elevated floating">
            <div className="modal-header-bar">
              <h3>Invite friends</h3>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <input
                type="text"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="input modern"
              />
              <div className={`dropdown-list soft ${showResults && searchResults.length > 0 ? 'open' : ''}`}>
                {showResults && searchResults.length > 0 && searchResults.map((user) => (
                  <div key={user.id} className="dropdown-item">
                    <div className="avatar-mini">{user.name?.[0] || "U"}</div>
                    <div className="tile-body">
                      <span className="tile-title">{user.name}</span>
                      <span className="tile-sub small">{user.email}</span>
                    </div>
                    <button className="chip primary" onClick={() => handleAddFriend(user.id)}>
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="chip ghost"
                onClick={() => {
                  setShowAddModal(false);
                  setSearchTerm('');
                  setSearchResults([]);
                  setShowResults(false);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showUnfriendModal && selectedFriend && createPortal(
        <div className="modal-overlay">
          <div className="glass-card modal-content-sm">
            <div className="modal-header">
              <h3>Unfriend</h3>
              <button className="close-btn" onClick={handleCloseUnfriendModal}>×</button>
            </div>
            <p className="muted small">
              Remove <strong>{selectedFriend.name}</strong> from your friends?
            </p>
            <div className="modal-actions">
              <button className="chip ghost" onClick={handleCloseUnfriendModal}>Cancel</button>
              <button className="chip danger" onClick={handleConfirmUnfriend}>Confirm</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default Friends;
