import React, { useEffect, useState } from 'react';
import AddGroupModal from './AddGroupModal';
import { useSelector } from "react-redux";
import axios from 'axios';

const Groups = ({
  onOpenChat,
  externalTriggerAdd = false,
  onAddModalClosed,
  hideHeader = false
}) => {
  const [showModal, setShowModal] = useState(false);
  const [groups, setGroups] = useState([]);

  const lastEvent = useSelector((state) => state.socket.lastEvent);
  const token = localStorage.getItem('splitzyToken');
  const currentUserId = localStorage.getItem('myUserId');
  
  // Handle external trigger to open add modal
  useEffect(() => {
    if (externalTriggerAdd) {
      window.dispatchEvent(new CustomEvent('modalOpened'));
      setShowModal(true);
    }
  }, [externalTriggerAdd]);
  
  // Handle modal close with callback
  const handleCloseModal = () => {
    setShowModal(false);
    if (onAddModalClosed) onAddModalClosed();
  };
  
  // Handle opening group chat (desktop button click)
  const handleOpenGroupChat = async (group, e) => {
    if (e) e.stopPropagation();
    if (!onOpenChat) return;
    
    try {
      // Create or get existing group thread
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/chat/threads/group`,
        { groupId: group.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const thread = { ...response.data, displayName: group.groupName };
      onOpenChat(thread);
    } catch (error) {
      console.error('Error opening group chat:', error);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/groups/${currentUserId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroups(res.data);
    } catch (err) {
      console.error("Failed to fetch groups", err);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  // Refresh on socket group invite or group created (for multi-device sync)
  useEffect(() => {
    if (!lastEvent) return;

    if (lastEvent.eventType === "GROUP_INVITE") {
      // GROUP_INVITE for invited friends, GROUP_CREATED for the creator's other devices
      if (lastEvent.payload.type === "GROUP_INVITE" || lastEvent.payload.type === "GROUP_CREATED") {
        console.log("[Groups] Detected GROUP event — refreshing group list", lastEvent.payload.type);
        fetchGroups();
      }
    }
  }, [lastEvent]);

  // Group click handler - open chat on click
  const handleGroupClick = async (group) => {
    if (onOpenChat) {
      // Clicking a group opens chat
      await handleOpenGroupChat(group);
    }
  };

  // Function to update groups when a new group is created.
  const handleAddGroup = (groupData) => {
    setGroups([...groups, groupData]);
    setShowModal(false);
  };

  return (
    <div className={`panel slim-card ${hideHeader ? 'no-header' : ''}`}>
      {!hideHeader && (
        <>
          <div className="panel-header">
            <span>Groups</span>
            <button className="chip ghost" onClick={() => {
              window.dispatchEvent(new CustomEvent('modalOpened'));
              setShowModal(true);
            }}>+ Add</button>
          </div>
          <div className="panel-divider" />
        </>
      )}
      <ul className="list-stack compact">
        {groups.length ? (
          groups.map((group) => (
            <li
              key={group.id}
              className="list-row group-row clickable"
              onClick={() => handleGroupClick(group)}
              title="Click to open chat"
            >
              <div className="avatar-sm">{group.groupName?.[0] || "G"}</div>
              <span className="row-name">{group.groupName}</span>
              <span className="row-tag">{group.groupType || "Group"}</span>
            </li>
          ))
        ) : (
          <p className="muted small no-items-msg">No groups yet. Create one!</p>
        )}
      </ul>
      {showModal && (
        <AddGroupModal onClose={handleCloseModal} onSave={handleAddGroup} />
      )}
    </div>
  );
};

export default Groups;
