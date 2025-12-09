import React, { useEffect, useState } from 'react';
import AddGroupModal from './AddGroupModal';
import { useSelector, useDispatch } from "react-redux";
import axios from 'axios';
import { setExpenseFilter } from '../features/expense/expenseSlice';  // New action

const Groups = () => {
  const [showModal, setShowModal] = useState(false);
  const [groups, setGroups] = useState([]);

  const dispatch = useDispatch();

  const lastEvent = useSelector((state) => state.socket.lastEvent);
  const token = localStorage.getItem('splitzyToken');
  const currentUserId = localStorage.getItem('myUserId');

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

  // Refresh on socket group invite
  useEffect(() => {
    if (!lastEvent) return;

    if (lastEvent.eventType === "GROUP_INVITE" && lastEvent.payload.type === "GROUP_INVITE") {
      console.log("[Groups] Detected GROUP_INVITE event — refreshing group list");
      fetchGroups();
    }
  }, [lastEvent]);

  // NEW: Group click handler to set the expense filter
  const handleGroupClick = (group) => {
    dispatch(setExpenseFilter({ filterType: "group", filterEntity: group }));
  };

  // Function to update groups when a new group is created.
  const handleAddGroup = (groupData) => {
    setGroups([...groups, groupData]);
    setShowModal(false);
  };

  return (
    <div className="panel slim-card">
      <div className="panel-header">
        <span>Groups</span>
        <button className="chip ghost" onClick={() => setShowModal(true)}>+ Add</button>
      </div>
      <div className="panel-divider" />
      <ul className="list-stack">
        {groups.length ? (
          groups.map((group) => (
            <li
              key={group.id}
              className="list-tile"
              onClick={() => handleGroupClick(group)}
            >
              <div className="avatar-mini">{group.groupName?.[0] || "G"}</div>
              <div className="tile-body">
                <span className="tile-title">{group.groupName}</span>
                <span className="tile-sub">{group.groupType || "Group"}</span>
              </div>
            </li>
          ))
        ) : (
          <p className="muted small">No Groups Yet</p>
        )}
      </ul>
      {showModal && (
        <AddGroupModal onClose={() => setShowModal(false)} onSave={handleAddGroup} />
      )}
    </div>
  );
};

export default Groups;
