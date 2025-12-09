import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';

const GROUP_TYPES = ['Home', 'Trip', 'Couple', 'Other'];

// Internal component for friend search auto-complete.
const FriendSearchInput = ({ value, onChange, placeholder }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const currentUserId = localStorage.getItem('myUserId');
  const token = localStorage.getItem('splitzyToken');
  
  useEffect(() => {
    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    // No debounce here—immediately call the API once value has 3 or more characters.
    axios
      .get(`${process.env.REACT_APP_API_URL}/search/friends?q=${value}&userId=${currentUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        setSuggestions(response.data);
      })
      .catch((error) => {
        console.error("Search error:", error);
        setSuggestions([]);
      });
  }, [value, currentUserId, token]);

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowSuggestions(true);
        }}
        placeholder={placeholder}
        className="input modern"
      />
      {showSuggestions && suggestions.length > 0 && (
        <ul className="dropdown-list soft absolute z-20 w-full mt-1">
          {suggestions.map((user) => (
            <li
                key={user.id}
                className="dropdown-item"
                onClick={() => {
                onChange(user); // Return the full user object
                setShowSuggestions(false);
                }}
            >
                {user.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const AddGroupModal = ({ onClose, onSave }) => {
  const [groupName, setGroupName] = useState('');
  // Start with three friend input objects.
  
  const [groupType, setGroupType] = useState(GROUP_TYPES[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const creatorId = localStorage.getItem('myUserId');
  const creatorName = localStorage.getItem('myUserName') || 'Unknown';
  const creatorEmail = localStorage.getItem('myUserEmail') || 'Unknown';
  const token = localStorage.getItem('splitzyToken');  


  const [friendInputs, setFriendInputs] = useState([
    { id: creatorId, username: creatorName, email: creatorEmail }, 
    { id: '', username: '', email: '' },
    { id: '', username: '', email: '' },
    { id: '', username: '', email: '' },
  ]);


  // Add a new friend input row.
  const addMoreFriendInput = () => {
    setFriendInputs([...friendInputs, { id: '', username: '', email: '' }]);
  };

  const handleFriendChange = (index, value, field) => {
    const newInputs = [...friendInputs];
    
    if (field === 'email') {
      // When updating email field, value is a string.
      newInputs[index] = { 
        ...newInputs[index], 
        email: value 
      };
    } else {
      if (typeof value === 'object' && value !== null) {
        // When a user object is received, check for duplicates across the friendInputs.
        const duplicate = friendInputs.some((f, i) => i !== index && f.id === value.id);
        if (duplicate) {
          alert('Friend already added.');
          return;
        }
        // Update with user object details.
        newInputs[index] = { 
          id: value.id, 
          username: value.name, 
          email: value.email || newInputs[index].email 
        };
      } else {
        // If a string is received (manual typing), update the username.
        newInputs[index] = { 
          ...newInputs[index], 
          username: value 
        };
      }
    }
    
    setFriendInputs(newInputs);
  };
  
  
  

  // Validate and submit the form.
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      alert('Group name is required.');
      return;
    }
    
    // Validate that at least one friend (non-creator) is provided.
    const additionalFriends = friendInputs.slice(1).filter(friend => friend.username && friend.username.trim().length > 0);
    if (additionalFriends.length < 1) {
      alert('Group must include at least 2 members (you and at least one friend).');
      return;
    }
    
    const groupData = {
      groupName,
      creatorId,
      creatorName,
      friends: friendInputs, // includes the creator and additional friends
      groupType,
    };
  
    setIsSubmitting(true);
    axios
    .post(`${process.env.REACT_APP_API_URL}/groups`, groupData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        onSave(groupData);
      })
      .catch((error) => {
        alert('Failed to create group. Please try again.');
        console.error(error);
      })
      .finally(() => setIsSubmitting(false));
  };
  

  return createPortal(
    <div className="modal-overlay glass-backdrop">
      <div className="glass-card modal-card-lg elevated relative floating">
        <div className="modal-header-bar">
          <h2 className="modal-title">Create Group</h2>
          <button 
            onClick={onClose} 
            className="close-btn"
            aria-label="Close Modal"
          >
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-section">
            <label className="label">Group Name</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="input modern"
              placeholder="Enter group name"
              autoFocus
            />
          </div>

          {groupName.trim() && (
            <div className="space-y-4">
              <div className="form-section">
                <label className="label">Creator</label>
                <div className="pair-row">
                  <div className="relative">
                    <input
                      type="text"
                      className="input modern"
                      value={creatorName}
                      disabled
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="email"
                      className="input modern"
                      value={creatorEmail}
                      disabled
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <label className="label">Add Friends</label>
                {friendInputs
                  .filter((friend) => friend.id !== creatorId)
                  .map((friend, index) => (
                    <div key={index} className="pair-row">
                      <FriendSearchInput
                        value={friend.username}
                        onChange={(value) => handleFriendChange(index + 1, value)}
                        placeholder={`Friend ${index + 1} name *`}
                      />
                      <input
                        type="email"
                        value={friend.email}
                        onChange={(e) => handleFriendChange(index + 1, e.target.value, 'email')}
                        className="input modern"
                        placeholder="Email (optional)"
                      />
                    </div>
                  ))}
                <button
                  type="button"
                  onClick={addMoreFriendInput}
                  className="ghost-link"
                >
                  + Add More
                </button>
              </div>

              <div className="form-section">
                <label className="label">Group Type</label>
                <div className="select-row">
                  <select
                    value={groupType}
                    onChange={(e) => setGroupType(e.target.value)}
                    className="input modern"
                  >
                    {GROUP_TYPES.map((type, i) => (
                      <option key={i} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="modal-actions end">
            <button
              type="button"
              onClick={onClose}
              className="chip ghost"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="chip primary"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default AddGroupModal;
