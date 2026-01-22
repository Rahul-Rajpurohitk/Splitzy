import React, { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { FiMessageSquare } from "react-icons/fi";
import axios from "axios";

function ChatDropdown({ onSelectThread }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeTab, setActiveTab] = useState("friends"); // friends | groups
  const [unreadCount, setUnreadCount] = useState(0);
  const token = localStorage.getItem("splitzyToken");
  const myUserId = localStorage.getItem("myUserId");
  const dropdownRef = useRef(null);
  
  // Listen for chat notifications from socket
  const lastEvent = useSelector((state) => state.socket.lastEvent);
  
  useEffect(() => {
    if (lastEvent?.eventType === "CHAT_NOTIFICATION") {
      console.log("[ChatDropdown] Chat notification received:", lastEvent.payload);
      // Don't increment unread count for messages sent by the current user
      // (supports multi-device sync without showing self-notifications)
      if (lastEvent.payload?.senderId !== myUserId) {
      setUnreadCount(prev => prev + 1);
      }
    }
  }, [lastEvent, myUserId]);
  
  // Clear unread when opening the dropdown
  useEffect(() => {
    if (open) {
      setUnreadCount(0);
    }
  }, [open]);

  const fetchThreads = async () => {
    setLoading(true);
    try {
      // we no longer show existing threads; keep the call to warm up chat endpoints if needed
      await axios.get(`${process.env.REACT_APP_API_URL}/chat/threads`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      console.error("Failed to load threads", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchFriendsAndGroups = async () => {
    if (!open) return;
    try {
      const f = await axios.get(
        `${process.env.REACT_APP_API_URL}/home/friends?userId=${myUserId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFriends(f.data || []);
    } catch (e) {
      console.error("Failed to load friends", e);
      setFriends([]);
    }
    try {
      const g = await axios.get(
        `${process.env.REACT_APP_API_URL}/groups/${myUserId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGroups(g.data || []);
    } catch (e) {
      console.error("Failed to load groups", e);
      setGroups([]);
    }
  };

  useEffect(() => {
    if (open) fetchFriendsAndGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // close on click outside
  useEffect(() => {
    const handleClick = (e) => {
      if (open && dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // close when other modals open
  useEffect(() => {
    const handleModalOpened = () => setOpen(false);
    window.addEventListener("modalOpened", handleModalOpened);
    return () => window.removeEventListener("modalOpened", handleModalOpened);
  }, []);

  const handleSelectFriend = async (friend) => {
    console.log("[ChatDropdown] handleSelectFriend called", friend);
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/chat/threads/p2p`,
        { friendId: friend.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("[ChatDropdown] Thread created/retrieved", res.data);
      setOpen(false);
      // Pass thread with display name attached
      const threadData = { ...res.data, displayName: friend.name };
      console.log("[ChatDropdown] Calling onSelectThread with", threadData);
      onSelectThread?.(threadData);
    } catch (e) {
      console.error("Failed to start friend chat", e);
      alert("Failed to start chat: " + (e.response?.data?.message || e.message));
    }
  };

  const handleSelectGroup = async (group) => {
    console.log("[ChatDropdown] handleSelectGroup called", group);
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/chat/threads/group`,
        { groupId: group.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("[ChatDropdown] Group thread created/retrieved", res.data);
      setOpen(false);
      // Pass thread with display name attached
      const threadData = { ...res.data, displayName: group.groupName };
      console.log("[ChatDropdown] Calling onSelectThread with", threadData);
      onSelectThread?.(threadData);
    } catch (e) {
      console.error("Failed to start group chat", e);
      alert("Failed to start chat: " + (e.response?.data?.message || e.message));
    }
  };

  const listToShow = activeTab === "friends" ? friends : groups;

  return (
    <div className="chat-dropdown" ref={dropdownRef}>
      <button
        className={`nav-icon-pill ${unreadCount > 0 ? 'has-unread' : ''}`}
        title="Messages"
        onClick={() => {
          if (!open) window.dispatchEvent(new CustomEvent("modalOpened"));
          setOpen(!open);
        }}
      >
        <FiMessageSquare size={16} />
        <span className="nav-icon-text">Messages</span>
        {unreadCount > 0 && <span className="chat-badge">{unreadCount}</span>}
      </button>
      {open && (
        <div className="chat-menu">
          <div className="chat-menu-header tabs">
            <button
              className={`tab-btn ${activeTab === "friends" ? "active" : ""}`}
              onClick={() => setActiveTab("friends")}
            >
              Friends
            </button>
            <div className="divider-vertical" />
            <button
              className={`tab-btn ${activeTab === "groups" ? "active" : ""}`}
              onClick={() => setActiveTab("groups")}
            >
              Groups
            </button>
          </div>
          <ul className="list-stack compact chat-list-body">
            {loading && <p className="muted small">Loading...</p>}
            {!loading && listToShow.length === 0 && (
              <p className="muted small">
                {activeTab === "friends" ? "No friends yet" : "No groups yet"}
              </p>
            )}
            {!loading &&
              listToShow.map((item) => {
                const title = activeTab === "friends" ? item.name : item.groupName;
                const initial = title ? title[0] : activeTab === "friends" ? "F" : "G";
                return (
                  <li
                    key={item.id}
                    className="list-row"
                    onClick={() =>
                      activeTab === "friends"
                        ? handleSelectFriend(item)
                        : handleSelectGroup(item)
                    }
                  >
                    <div className="avatar-sm">{initial}</div>
                    <span className="row-name">{title}</span>
                  </li>
                );
              })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ChatDropdown;

