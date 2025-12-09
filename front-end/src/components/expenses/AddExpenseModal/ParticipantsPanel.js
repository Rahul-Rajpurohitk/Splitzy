// src/components/expenses/AddExpenseModal/ParticipantsPanel.js
import React, { useState } from "react";
import axios from "axios";

function ParticipantsPanel({ participants, setParticipants }) {
  const token = localStorage.getItem("splitzyToken");
  const myUserId = localStorage.getItem("myUserId");

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const handleSearchChange = async (e) => {
    const val = e.target.value;
    setSearchTerm(val);

    if (val.length >= 3) {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_URL}/search/friends?q=${val}&userId=${myUserId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSearchResults(res.data);
      } catch (err) {
        console.error("Search error:", err);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectFriend = (user) => {
    if (!participants.find((p) => p.id === user.id)) {
      setParticipants([...participants, user]);
    }
    setSearchTerm("");
    setSearchResults([]);
  };

  const handleRemove = (userId) => {
    setParticipants(participants.filter((p) => p.id !== userId));
  };

  return (
    <div>
      <h3 className="text-base font-semibold mb-2">Participants</h3>
      <p className="text-sm mb-2">With you and:</p>

      <div className="mb-3">
        <input
          type="text"
          className="border p-2 w-full rounded"
          placeholder="Enter names or email addresses"
          value={searchTerm}
          onChange={handleSearchChange}
        />
        {searchResults.length > 0 && (
          <div className="border bg-white mt-1 shadow rounded">
            {searchResults.map((u) => (
              <div
                key={u.id}
                className="p-2 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSelectFriend(u)}
              >
                {u.name} ({u.email})
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {participants.map((p) => (
          <div
            key={p.id}
            className="bg-gray-200 rounded-full px-3 py-1 flex items-center"
          >
            <span className="mr-2 text-sm">{p.name || p.email}</span>
            <button
              className="text-sm text-gray-600 hover:text-red-500"
              onClick={() => handleRemove(p.id)}
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ParticipantsPanel;
