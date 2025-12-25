import React, { useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { FiUsers, FiCalendar, FiTag, FiDollarSign, FiChevronDown, FiChevronUp, FiShare2, FiTrash2, FiCheckCircle, FiX, FiMoreVertical } from "react-icons/fi";
import ShareExpenseModal from "./ShareExpenseModal";
import axios from "axios";
import { fetchExpensesThunk } from "../../features/expense/expenseSlice";

const API_URL = process.env.REACT_APP_API_URL;

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
  const dispatch = useDispatch();
  const token = localStorage.getItem("splitzyToken");
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleMode, setSettleMode] = useState('full'); // 'full' or 'partial'
  const [partialAmount, setPartialAmount] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // Swipe state
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const cardRef = useRef(null);
  
  const expense = useSelector((state) =>
    state.expense.list.find((e) => e.id === expenseId)
  );

  if (!expense) return null;

  // Swipe handlers for iOS-style actions
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsSwiping(false);
  };

  const handleTouchMove = (e) => {
    const deltaX = touchStartX.current - e.touches[0].clientX;
    const deltaY = Math.abs(touchStartY.current - e.touches[0].clientY);
    
    // Only swipe horizontally if not scrolling vertically
    if (deltaY > 30) return;
    
    if (deltaX > 10) {
      setIsSwiping(true);
      // Limit swipe to max 140px (reveal action buttons)
      const offset = Math.min(deltaX, 140);
      setSwipeOffset(offset);
    } else if (deltaX < -10 && swipeOffset > 0) {
      // Swiping back
      setSwipeOffset(Math.max(0, swipeOffset + deltaX));
    }
  };

  const handleTouchEnd = () => {
    // Snap to open or closed
    if (swipeOffset > 70) {
      setSwipeOffset(140); // Fully open
    } else {
      setSwipeOffset(0); // Close
    }
    setTimeout(() => setIsSwiping(false), 100);
  };

  const closeSwipe = () => {
    setSwipeOffset(0);
  };

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

  // Handle delete expense
  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    
    setIsDeleting(true);
    try {
      await axios.delete(`${API_URL}/home/expenses/${expenseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      dispatch(fetchExpensesThunk({ userId: myUserId, token }));
    } catch (err) {
      console.error('Error deleting expense:', err);
      alert('Failed to delete expense');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle settle expense
  const handleSettle = async () => {
    setIsSettling(true);
    try {
      const payload = {
        participantUserId: myUserId,
        settleAmount: settleMode === 'full' ? 0 : parseFloat(partialAmount) || 0,
        settleFullAmount: settleMode === 'full'
      };
      
      await axios.post(`${API_URL}/home/expenses/${expenseId}/settle`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setShowSettleModal(false);
      dispatch(fetchExpensesThunk({ userId: myUserId, token }));
    } catch (err) {
      console.error('Error settling expense:', err);
      alert('Failed to settle expense');
    } finally {
      setIsSettling(false);
    }
  };

  // Handle settle full expense (all participants)
  const handleSettleFull = async (e) => {
    e.stopPropagation();
    setShowSettleModal(true);
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
    <div className={`expense-card-wrapper ${swipeOffset > 0 ? 'swiped' : ''}`} ref={cardRef}>
      {/* Swipe action buttons (revealed on swipe left) */}
      {swipeOffset > 0 && (
      <div className="swipe-actions">
        {!expense.isSettled && myNet !== 0 && (
          <button 
            className="swipe-action-btn settle"
            onClick={(e) => { e.stopPropagation(); closeSwipe(); handleSettleFull(e); }}
          >
            <FiCheckCircle size={18} />
            <span>Settle</span>
          </button>
        )}
        <button 
          className="swipe-action-btn delete"
          onClick={(e) => { e.stopPropagation(); closeSwipe(); handleDelete(e); }}
        >
          <FiTrash2 size={18} />
          <span>Delete</span>
        </button>
      </div>
      )}

      {/* Main card (swipeable) */}
      <div 
        className={`expense-card ${isSwiping ? 'swiping' : ''}`}
        style={{ transform: `translateX(-${swipeOffset}px)` }}
        onClick={(e) => { if (!isSwiping && swipeOffset === 0) onToggleExpand(); else if (swipeOffset > 0) closeSwipe(); }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
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
            <h4 className="expense-title">
              {expense.description}
              {expense.isPersonal && <span className="personal-badge">👤</span>}
              {expense.isSettled && <span className="settled-inline-badge">✓</span>}
            </h4>
            <div className="expense-meta">
              <span className="expense-meta-item">
                <FiDollarSign size={11} />
                {paidByText}
              </span>
              {expense.groupName && (
                <span className="expense-meta-item group-tag">
                  <FiUsers size={11} />
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
                <span className="settled-badge">Settled</span>
              ) : (
                <>
                  <span className="net-label">{netLabel}</span>
                  <span className="net-amount">${netAmount.toFixed(2)}</span>
                </>
              )}
            </div>
          </div>

          {/* Desktop: Share button */}
          <button 
            className="expense-share-btn desktop-only" 
            onClick={handleShareClick}
            title="Share expense"
          >
            <FiShare2 size={16} />
          </button>

          {/* Mobile: More menu button */}
          <button 
            className="expense-more-btn mobile-only"
            onClick={(e) => { e.stopPropagation(); setShowMobileMenu(!showMobileMenu); }}
          >
            <FiMoreVertical size={18} />
          </button>

          {/* Expand indicator - Desktop only */}
          <div className="expense-expand desktop-only">
            {isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
          </div>
        </div>

        {/* Mobile dropdown menu - All actions in one place */}
        {showMobileMenu && (
          <div className="expense-mobile-menu" onClick={(e) => e.stopPropagation()}>
            <button onClick={(e) => { e.stopPropagation(); setShowMobileMenu(false); onToggleExpand(); }}>
              <FiChevronDown size={14} /> {isExpanded ? 'Hide Details' : 'View Details'}
            </button>
            <button onClick={(e) => { handleShareClick(e); setShowMobileMenu(false); }}>
              <FiShare2 size={14} /> Share
            </button>
            {!expense.isSettled && myNet !== 0 && (
              <button onClick={(e) => { handleSettleFull(e); setShowMobileMenu(false); }}>
                <FiCheckCircle size={14} /> Mark as Paid
              </button>
            )}
            <button className="danger" onClick={(e) => { handleDelete(e); setShowMobileMenu(false); }}>
              <FiTrash2 size={14} /> Delete
            </button>
          </div>
        )}

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

          {/* Actions - Desktop only (mobile uses dropdown menu) */}
          <div className="expense-actions desktop-only">
            {!expense.isSettled && myNet !== 0 && (
              <button 
                className="expense-action-btn settle"
                onClick={handleSettleFull}
                disabled={isSettling}
              >
                <FiCheckCircle size={14} />
                {isSettling ? 'Settling...' : 'Mark as Paid'}
              </button>
            )}
            {expense.isSettled && (
              <button className="expense-action-btn settled" disabled>
                <FiCheckCircle size={14} />
                Settled
              </button>
            )}
            <button 
              className="expense-action-btn delete"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <FiTrash2 size={14} />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>

          {/* Footer */}
          <div className="expense-footer">
            <span>Created by {expense.creatorName}</span>
            <span>•</span>
            <span>{new Date(expense.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      )}

        {/* Settle Modal */}
        {showSettleModal && (
          <div className="settle-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settle-modal-content">
              <div className="settle-modal-header">
                <h3>Mark as Paid</h3>
                <button className="settle-modal-close" onClick={() => setShowSettleModal(false)}>
                  <FiX size={18} />
                </button>
              </div>
              
              <div className="settle-amount-info">
                <div className="settle-amount-row">
                  <span>Your share:</span>
                  <span>${Math.abs(myParticipant.share || 0).toFixed(2)}</span>
                </div>
                <div className="settle-amount-row">
                  <span>Already settled:</span>
                  <span>${(myParticipant.settledAmount || 0).toFixed(2)}</span>
                </div>
                <div className="settle-amount-row">
                  <span>Remaining:</span>
                  <span>${Math.abs((myParticipant.share || 0) - (myParticipant.settledAmount || 0)).toFixed(2)}</span>
                </div>
              </div>
              
              <div className="settle-options">
                <label 
                  className={`settle-option ${settleMode === 'full' ? 'active' : ''}`}
                  onClick={() => setSettleMode('full')}
                >
                  <input 
                    type="radio" 
                    name="settleMode" 
                    checked={settleMode === 'full'} 
                    onChange={() => setSettleMode('full')}
                  />
                  <span>Settle full remaining amount</span>
                </label>
                <label 
                  className={`settle-option ${settleMode === 'partial' ? 'active' : ''}`}
                  onClick={() => setSettleMode('partial')}
                >
                  <input 
                    type="radio" 
                    name="settleMode" 
                    checked={settleMode === 'partial'} 
                    onChange={() => setSettleMode('partial')}
                  />
                  <span>Settle partial amount</span>
                </label>
                {settleMode === 'partial' && (
                  <div className="settle-partial-input">
                    <input
                      type="number"
                      placeholder="Enter amount to settle"
                      value={partialAmount}
                      onChange={(e) => setPartialAmount(e.target.value)}
                      step="0.01"
                      min="0"
                      max={Math.abs((myParticipant.share || 0) - (myParticipant.settledAmount || 0))}
                    />
                  </div>
                )}
              </div>
              
              <div className="settle-modal-actions">
                <button className="settle-cancel-btn" onClick={() => setShowSettleModal(false)}>
                  Cancel
                </button>
                <button 
                  className="settle-confirm-btn" 
                  onClick={handleSettle}
                  disabled={isSettling || (settleMode === 'partial' && (!partialAmount || parseFloat(partialAmount) <= 0))}
                >
                  {isSettling ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExpenseCard;
