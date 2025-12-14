import React, { useState } from "react";
import { useSelector } from "react-redux";
import { FiUsers, FiCalendar, FiTag, FiDollarSign, FiChevronDown, FiChevronUp, FiShare2 } from "react-icons/fi";
import ShareExpenseModal from "./ShareExpenseModal";

// Category icons mapping - matches AddExpenseModal categories
const CATEGORY_ICONS = {
  general: "💰",
  food: "🍽️",
  groceries: "🛒",
  transport: "🚗",
  entertainment: "🎬",
  shopping: "🛍️",
  travel: "✈️",
  utilities: "💡",
  rent: "🏠",
  healthcare: "🏥",
  education: "📚",
  subscriptions: "📱",
  gifts: "🎁",
  sports: "⚽",
  pets: "🐾",
  coffee: "☕",
  games: "🎮",
  music: "🎵",
  other: "📝",
};

// Get icon from category or fallback to auto-detect from description
const getCategoryIcon = (category, description) => {
  if (category && CATEGORY_ICONS[category]) {
    return CATEGORY_ICONS[category];
  }
  // Fallback: auto-detect from description for old expenses without category
  const desc = description?.toLowerCase() || "";
  if (desc.includes("dinner") || desc.includes("lunch") || desc.includes("food") || desc.includes("restaurant")) {
    return "🍽️";
  } else if (desc.includes("movie") || desc.includes("cinema") || desc.includes("film")) {
    return "🎬";
  } else if (desc.includes("uber") || desc.includes("taxi") || desc.includes("ride") || desc.includes("transport")) {
    return "🚗";
  } else if (desc.includes("grocery") || desc.includes("market") || desc.includes("store")) {
    return "🛒";
  } else if (desc.includes("trip") || desc.includes("travel") || desc.includes("flight") || desc.includes("hotel")) {
    return "✈️";
  } else if (desc.includes("rent") || desc.includes("utility") || desc.includes("bill")) {
    return "🏠";
  } else if (desc.includes("game") || desc.includes("entertainment")) {
    return "🎮";
  } else if (desc.includes("coffee") || desc.includes("drink")) {
    return "☕";
  }
  return "💰";
};

// Split method display
const getSplitMethodLabel = (method) => {
  const labels = {
    EQUALLY: "Split equally",
    PERCENTAGE: "By percentage",
    EXACT_AMOUNTS: "Exact amounts",
    SHARES: "By shares",
    ITEMIZED: "Itemized",
    TWO_PERSON: "Full amount"
  };
  return labels[method] || method;
};

function ExpenseCard({ expenseId, isExpanded, onToggleExpand, myUserId, onOpenChat }) {
  const [showShareModal, setShowShareModal] = useState(false);
  const expense = useSelector((state) =>
    state.expense.list.find((e) => e.id === expenseId)
  );

  if (!expense) return null;

  const handleShareClick = (e) => {
    e.stopPropagation(); // Don't toggle expand
    setShowShareModal(true);
  };

  const handleShared = (threads) => {
    setShowShareModal(false);
    // Open chat windows for shared threads
    if (onOpenChat && threads && threads.length > 0) {
      // Open first thread's chat
      onOpenChat(threads[0]);
    }
  };

  // Parse date
  const dateObj = new Date(expense.date || Date.now());
  const dayNum = dateObj.getDate();
  const shortMonth = dateObj.toLocaleString("default", { month: "short" }).toUpperCase();
  const fullDate = dateObj.toLocaleDateString("en-US", { 
    weekday: "short", 
    month: "short", 
    day: "numeric",
    year: "numeric"
  });

  // Get my participant data
  const myParticipant = expense.participants?.find((p) => p.userId === myUserId) || { net: 0, paid: 0, share: 0 };
  const myNet = myParticipant.net || 0;

  // Determine net status
  let netStatus = "settled";
  let netAmount = 0;
  let netLabel = "Settled";
  let netColor = "var(--muted)";
  
  if (myNet > 0) {
    netStatus = "lent";
    netAmount = myNet;
    netLabel = "you lent";
    netColor = "#22c55e"; // Green
  } else if (myNet < 0) {
    netStatus = "owe";
    netAmount = Math.abs(myNet);
    netLabel = "you owe";
    netColor = "#ef4444"; // Red
  }

  // Payers info
  const payerNames = expense.payers?.map(p => p.payerName).filter(Boolean) || [];
  const paidByText = payerNames.length === 1 
    ? `Paid by ${payerNames[0]}` 
    : payerNames.length > 1 
    ? `${payerNames.length} people paid` 
    : "Unknown payer";

  // Participants count
  const participantCount = expense.participants?.length || 0;

  // Category icon - use stored category or fallback to auto-detect
  const categoryIcon = getCategoryIcon(expense.category, expense.description);

  return (
    <div className="expense-card" onClick={onToggleExpand}>
      {/* Main row */}
      <div className="expense-main">
        {/* Left: Date badge + Icon */}
        <div className="expense-left">
          <div className="expense-date-badge">
            <span className="expense-day">{dayNum}</span>
            <span className="expense-month">{shortMonth}</span>
          </div>
          <div className="expense-icon">{categoryIcon}</div>
        </div>

        {/* Center: Description + meta */}
        <div className="expense-center">
          <h4 className="expense-title">{expense.description}</h4>
          <div className="expense-meta">
            <span className="expense-meta-item">
              <FiDollarSign size={12} />
              {paidByText}
            </span>
            {expense.groupName && (
              <span className="expense-meta-item group-tag">
                <FiUsers size={12} />
                {expense.groupName}
              </span>
            )}
          </div>
        </div>

        {/* Right: Amount + Net */}
        <div className="expense-right">
          <div className="expense-total">${expense.totalAmount?.toFixed(2)}</div>
          <div className="expense-net" style={{ color: netColor }}>
            {netStatus === "settled" ? (
              <span className="settled-badge">✓ Settled</span>
            ) : (
              <>
                <span className="net-label">{netLabel}</span>
                <span className="net-amount">${netAmount.toFixed(2)}</span>
              </>
            )}
          </div>
        </div>

        {/* Share button */}
        <button 
          className="expense-share-btn" 
          onClick={handleShareClick}
          title="Share expense"
        >
          <FiShare2 size={16} />
        </button>

        {/* Expand indicator */}
        <div className="expense-expand">
          {isExpanded ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <ShareExpenseModal
          expense={expense}
          onClose={() => setShowShareModal(false)}
          onShared={handleShared}
        />
      )}

      {/* Expanded details */}
      {isExpanded && (
        <div className="expense-details">
          <div className="expense-details-header">
            <div className="detail-row">
              <FiCalendar size={14} />
              <span>{fullDate}</span>
            </div>
            <div className="detail-row">
              <FiTag size={14} />
              <span>{getSplitMethodLabel(expense.splitMethod)}</span>
            </div>
            <div className="detail-row">
              <FiUsers size={14} />
              <span>{participantCount} participant{participantCount !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Breakdown table */}
          <div className="expense-breakdown">
            <div className="breakdown-header">
              <span>Person</span>
              <span>Paid</span>
              <span>Share</span>
              <span>Balance</span>
            </div>
            {expense.participants?.map((p) => {
              const pNet = (p.paid || 0) - (p.share || 0);
              const isMe = p.userId === myUserId;
              return (
                <div key={p.userId} className={`breakdown-row ${isMe ? 'is-me' : ''}`}>
                  <span className="breakdown-name">
                    {isMe ? "You" : (p.partName || "Unknown")}
                  </span>
                  <span className="breakdown-paid">${(p.paid || 0).toFixed(2)}</span>
                  <span className="breakdown-share">${(p.share || 0).toFixed(2)}</span>
                  <span className={`breakdown-net ${pNet > 0 ? 'positive' : pNet < 0 ? 'negative' : ''}`}>
                    {pNet > 0 ? '+' : ''}{pNet.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Notes */}
          {expense.notes && (
            <div className="expense-notes">
              <span className="notes-label">Notes:</span>
              <span className="notes-text">{expense.notes}</span>
            </div>
          )}

          {/* Footer */}
          <div className="expense-footer">
            <span>Created by {expense.creatorName}</span>
            <span>•</span>
            <span>{new Date(expense.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExpenseCard;
