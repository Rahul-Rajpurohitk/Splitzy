import React, { useState } from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import { FiX, FiSend, FiCheck, FiMessageSquare } from "react-icons/fi";

function ShareExpenseModal({ expense, onClose, onShared }) {
  const token = localStorage.getItem("splitzyToken");
  const myUserId = localStorage.getItem("myUserId");
  
  // Get participants from expense (excluding current user)
  const participants = (expense.participants || []).filter(p => p.userId !== myUserId);
  
  const [selectedIds, setSelectedIds] = useState([]); // Array of participant userIds
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const toggleParticipant = (userId) => {
    if (selectedIds.includes(userId)) {
      setSelectedIds(prev => prev.filter(id => id !== userId));
    } else {
      setSelectedIds(prev => [...prev, userId]);
    }
  };

  const selectAll = () => {
    if (selectedIds.length === participants.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(participants.map(p => p.userId));
    }
  };

  const handleShare = async () => {
    if (selectedIds.length === 0) return;
    setSending(true);

    try {
      // Create P2P threads for each selected participant and share
      const threadResults = await Promise.all(
        selectedIds.map(async (participantId) => {
          const participant = participants.find(p => p.userId === participantId);
          const res = await axios.post(
            `${process.env.REACT_APP_API_URL}/chat/threads/p2p`,
            { friendId: participantId },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          return {
            ...res.data,
            displayName: participant?.partName || "Chat"
          };
        })
      );

      const threadIds = threadResults.map(t => t.id);

      // Share expense to all threads
      await axios.post(
        `${process.env.REACT_APP_API_URL}/chat/share-expense-bulk`,
        {
          expenseId: expense.id,
          threadIds,
          message: message.trim() || null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Return thread objects so parent can open chat windows
      onShared && onShared(threadResults);
      onClose();
    } catch (e) {
      console.error("Failed to share expense", e);
      alert("Failed to share expense. Please try again.");
    } finally {
      setSending(false);
    }
  };

  // Get category icon
  const getCategoryIcon = (category) => {
    const icons = {
      general: "💰", food: "🍽️", groceries: "🛒", transport: "🚗",
      entertainment: "🎬", shopping: "🛍️", travel: "✈️", utilities: "💡",
      rent: "🏠", healthcare: "🏥", education: "📚", subscriptions: "📱",
      gifts: "🎁", sports: "⚽", pets: "🐾", coffee: "☕", games: "🎮", 
      music: "🎵", other: "📝"
    };
    return icons[category] || "💰";
  };

  // Use portal to render modal at document body level (fixes backdrop-filter stacking context issue)
  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="share-expense-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Share Expense</h3>
          <button className="icon-btn close" onClick={onClose}>
            <FiX size={18} />
          </button>
        </div>

        {/* Expense preview */}
        <div className="share-expense-preview">
          <div className="expense-preview-icon">{getCategoryIcon(expense.category)}</div>
          <div className="expense-preview-info">
            <h4>{expense.description}</h4>
            <span className="expense-preview-amount">${expense.totalAmount?.toFixed(2)}</span>
          </div>
        </div>

        {/* Participants section - moved above message */}
        <div className="share-section-header">
          <span>Send to participants</span>
          {participants.length > 1 && (
            <button className="select-all-btn" onClick={selectAll}>
              {selectedIds.length === participants.length ? "Deselect all" : "Select all"}
            </button>
          )}
        </div>

        {/* Participant list */}
        <div className="share-recipient-list">
          {participants.length === 0 ? (
            <div className="share-empty">No other participants in this expense</div>
          ) : (
            participants.map((participant) => (
              <div
                key={participant.userId}
                className={`share-recipient-item ${selectedIds.includes(participant.userId) ? 'selected' : ''}`}
                onClick={() => toggleParticipant(participant.userId)}
              >
                <div className="share-recipient-avatar">
                  {participant.partName?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="share-recipient-info">
                  <span className="share-recipient-name">{participant.partName || "Unknown"}</span>
                  <span className="share-recipient-share">
                    Owes ${Math.abs(participant.net || 0).toFixed(2)}
                  </span>
                </div>
                <div className={`share-check ${selectedIds.includes(participant.userId) ? 'checked' : ''}`}>
                  {selectedIds.includes(participant.userId) && <FiCheck size={14} />}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Optional message - moved below participants */}
        <div className="share-message-input">
          <FiMessageSquare size={16} />
          <input
            type="text"
            placeholder="Add a message (optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="input modern"
          />
        </div>

        {/* Share button */}
        <div className="share-footer">
          <span className="share-selected-count">
            {selectedIds.length > 0 
              ? `${selectedIds.length} selected` 
              : "Select participants"}
          </span>
          <button
            className="btn primary"
            onClick={handleShare}
            disabled={sending || selectedIds.length === 0}
          >
            {sending ? "Sending..." : (
              <>
                <FiSend size={14} />
                Send
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ShareExpenseModal;

