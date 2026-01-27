import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSelector, useDispatch } from "react-redux";
import { FiUsers, FiCalendar, FiTag, FiDollarSign, FiChevronDown, FiChevronUp, FiShare2, FiTrash2, FiCheckCircle, FiX, FiMessageSquare } from "react-icons/fi";
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
  // For payer settlement - track individual amounts for each participant who owes
  const [participantSettlements, setParticipantSettlements] = useState({});
  const [showMobileShareDropdown, setShowMobileShareDropdown] = useState(false);
  const shareDropdownRef = useRef(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (shareDropdownRef.current && !shareDropdownRef.current.contains(event.target)) {
        setShowMobileShareDropdown(false);
      }
    };
    if (showMobileShareDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showMobileShareDropdown]);
  
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
      // Refresh expenses after successful delete
      dispatch(fetchExpensesThunk({ userId: myUserId, token }));
    } catch (err) {
      console.error('Error deleting expense:', err);
      // If expense not found (404 or 500), it's already deleted - refresh to sync UI
      if (err.response?.status === 404 || err.response?.status === 500) {
        console.log('Expense may already be deleted, refreshing list...');
        dispatch(fetchExpensesThunk({ userId: myUserId, token }));
      } else {
        alert('Failed to delete expense. Please try again.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle settle expense - works for both debtor (settling own debt) and payer (recording received payments)
  const handleSettle = async () => {
    setIsSettling(true);
    try {
      // Check if user is a payer (lent money, positive net)
      const isPayer = myNet > 0;

      if (isPayer) {
        // Payer mode: record payments received from participants who owe
        const settlements = Object.entries(participantSettlements).filter(([_, amount]) => amount > 0);

        if (settlements.length === 0) {
          alert('Please enter at least one payment amount');
          setIsSettling(false);
          return;
        }

        // Settle each participant's payment
        for (const [participantId, amount] of settlements) {
          const payload = {
            participantUserId: participantId,
            settleAmount: parseFloat(amount) || 0,
            settleFullAmount: false,
            recordedByPayerId: myUserId // Track who recorded this settlement
          };

          await axios.post(`${API_URL}/home/expenses/${expenseId}/settle`, payload, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
      } else {
        // Debtor mode: settle own debt
        const payload = {
          participantUserId: myUserId,
          settleAmount: settleMode === 'full' ? 0 : parseFloat(partialAmount) || 0,
          settleFullAmount: settleMode === 'full'
        };

        await axios.post(`${API_URL}/home/expenses/${expenseId}/settle`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setShowSettleModal(false);
      setParticipantSettlements({});
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
  const myParticipant = expense.participants?.find((p) => p.userId === myUserId) || { net: 0, paid: 0, share: 0, settledAmount: 0, fullySettled: false };
  const myNet = myParticipant.net || 0;

  // Calculate if my part is settled (either fully settled flag or remaining amount is 0)
  const myRemainingAmount = Math.abs((myParticipant.share || 0) - (myParticipant.settledAmount || 0));
  const isMyPartSettled = myParticipant.fullySettled || myRemainingAmount < 0.01;

  // Determine net status
  let netStatus = "settled";
  let netAmount = 0;
  let netLabel = "Settled";
  let netColor = "var(--muted)";

  // If my part is settled, always show as settled regardless of original net
  if (isMyPartSettled) {
    netStatus = "settled";
    netAmount = 0;
    netLabel = "Settled";
    netColor = "#22c55e"; // Green - to indicate completion
  } else if (myNet > 0) {
    // I'm owed money - show remaining amount after partial settlements received
    const remainingOwed = myParticipant.settledAmount > 0
      ? Math.max(myNet - (myParticipant.settledAmount || 0), 0)
      : myNet;
    netStatus = "lent";
    netAmount = remainingOwed;
    netLabel = myParticipant.settledAmount > 0 ? "remaining" : "you lent";
    netColor = "#22c55e"; // Green
  } else if (myNet < 0) {
    // I owe money - show remaining amount I still need to pay
    // myRemainingAmount = share - settledAmount (already calculated above)
    netStatus = "owe";
    netAmount = myRemainingAmount; // Use remaining amount, not original net
    netLabel = myParticipant.settledAmount > 0 ? "you still owe" : "you owe";
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
        {!expense.isSettled && myNet !== 0 && !isMyPartSettled && (
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
              {(expense.isSettled || isMyPartSettled) && <span className="settled-inline-badge">✓</span>}
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

          {/* Mobile: Share dropdown button */}
          <div className="expense-share-dropdown-wrapper mobile-only" ref={shareDropdownRef}>
            <button 
              className="expense-share-btn-mobile"
              onClick={(e) => { e.stopPropagation(); setShowMobileShareDropdown(!showMobileShareDropdown); }}
              title="Share options"
            >
              <FiShare2 size={16} />
            </button>
            {showMobileShareDropdown && (
              <div className="expense-share-dropdown" onClick={(e) => e.stopPropagation()}>
                <button onClick={(e) => { handleShareClick(e); setShowMobileShareDropdown(false); }}>
                  <FiMessageSquare size={14} /> Share in Chat
                </button>
              </div>
            )}
          </div>

          {/* Expand indicator - Desktop only */}
          <div className="expense-expand desktop-only">
            {isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
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
              const settledAmt = p.settledAmount || 0;
              const isFullySettled = p.fullySettled || Math.abs(pNet) < 0.01;

              // Calculate remaining balance after partial settlements
              let remainingBalance;
              if (isFullySettled) {
                remainingBalance = 0;
              } else if (pNet > 0) {
                // They're owed money - subtract what they've received
                remainingBalance = Math.max(pNet - settledAmt, 0);
              } else {
                // They owe money - their share minus what they've paid towards settlement
                remainingBalance = -Math.max((p.share || 0) - (p.paid || 0) - settledAmt, 0);
              }

              return (
                <div key={p.userId} className={`breakdown-row ${isMe ? 'is-me' : ''} ${isFullySettled ? 'settled' : ''}`}>
                  <span className="breakdown-name">
                    {isMe ? "You" : (p.partName || "Unknown")}
                    {isFullySettled && <span className="settled-badge-small">✓</span>}
                  </span>
                  <span className="breakdown-paid">${(p.paid || 0).toFixed(2)}</span>
                  <span className="breakdown-share">${(p.share || 0).toFixed(2)}</span>
                  <span className={`breakdown-net ${remainingBalance > 0 ? 'positive' : remainingBalance < 0 ? 'negative' : 'neutral'}`}>
                    {isFullySettled ? (
                      <span className="settled-text">Settled</span>
                    ) : (
                      <>
                        {remainingBalance > 0 ? '+' : ''}{remainingBalance.toFixed(2)}
                        {settledAmt > 0 && <span className="partial-indicator" title={`$${settledAmt.toFixed(2)} settled`}>*</span>}
                      </>
                    )}
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
            {!expense.isSettled && myNet !== 0 && !isMyPartSettled && (
              <button
                className="expense-action-btn settle"
                onClick={handleSettleFull}
                disabled={isSettling}
              >
                <FiCheckCircle size={14} />
                {isSettling ? 'Settling...' : 'Mark as Paid'}
              </button>
            )}
            {(expense.isSettled || isMyPartSettled) && (
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
        {showSettleModal && (() => {
          // Determine if user is a payer (lent money) or debtor (owes money)
          const isPayer = myNet > 0;

          // For payers: Get list of participants who owe money
          const participantsWhoOwe = isPayer
            ? expense.participants?.filter(p => {
                if (p.userId === myUserId) return false; // Skip self
                const pNet = (p.paid || 0) - (p.share || 0);
                const isAlreadySettled = p.fullySettled || Math.abs(pNet) < 0.01;
                return pNet < 0 && !isAlreadySettled; // They owe money and not settled
              }).map(p => {
                const pNet = (p.paid || 0) - (p.share || 0);
                const remaining = Math.abs(pNet) - (p.settledAmount || 0);

                // For multi-payer: Calculate how much this participant owes to current user
                // Proportional to how much current user contributed vs total paid
                const totalPaidByPayers = expense.payers?.reduce((sum, payer) => sum + (payer.paidAmount || 0), 0) || expense.totalAmount;
                const myPaidAmount = expense.payers?.find(payer => payer.userId === myUserId)?.paidAmount || myParticipant.paid || 0;
                const myProportion = totalPaidByPayers > 0 ? myPaidAmount / totalPaidByPayers : 1;
                const owesToMe = Math.max(remaining * myProportion, 0);

                return {
                  ...p,
                  totalOwes: Math.abs(pNet),
                  remaining: remaining,
                  owesToMe: owesToMe,
                  alreadySettled: p.settledAmount || 0
                };
              }) || []
            : [];

          // Calculate total amount owed to me
          const totalOwedToMe = participantsWhoOwe.reduce((sum, p) => sum + p.owesToMe, 0);

          // Set all to full amount
          const handleSettleAllFull = () => {
            const fullSettlements = {};
            participantsWhoOwe.forEach(p => {
              fullSettlements[p.userId] = p.owesToMe;
            });
            setParticipantSettlements(fullSettlements);
          };

          // Clear all amounts
          const handleClearAll = () => {
            setParticipantSettlements({});
          };

          // Calculate total being settled
          const totalBeingSettled = Object.values(participantSettlements).reduce((sum, amt) => sum + (parseFloat(amt) || 0), 0);

          return createPortal(
            <div className="settle-modal-overlay" onClick={(e) => { e.stopPropagation(); setShowSettleModal(false); }}>
              <div className="settle-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="settle-modal-header">
                  <h3>{isPayer ? 'Record Payments Received' : 'Mark as Paid'}</h3>
                  <button className="settle-modal-close" onClick={() => setShowSettleModal(false)}>
                    <FiX size={18} />
                  </button>
                </div>

                {isPayer ? (
                  /* PAYER MODE: Record payments from people who owe you */
                  <>
                    <div className="settle-payer-summary">
                      <div className="settle-summary-row highlight">
                        <span>Total owed to you:</span>
                        <span className="positive">${totalOwedToMe.toFixed(2)}</span>
                      </div>
                      {expense.payers?.length > 1 && (
                        <div className="settle-summary-note">
                          <small>Note: Amounts are your share based on {((expense.payers?.find(p => p.userId === myUserId)?.paidAmount || 0) / expense.totalAmount * 100).toFixed(0)}% contribution</small>
                        </div>
                      )}
                    </div>

                    <div className="settle-participants-list">
                      <div className="settle-list-header">
                        <span>Participant</span>
                        <span>Owes You</span>
                        <span>Payment</span>
                      </div>
                      {participantsWhoOwe.map(p => {
                        const maxOwed = p.owesToMe;
                        const currentValue = participantSettlements[p.userId];
                        // Display value: show formatted number from state or empty
                        const displayValue = currentValue !== undefined && currentValue !== ''
                          ? currentValue
                          : '';

                        return (
                          <div key={p.userId} className="settle-participant-row">
                            <span className="participant-name">{p.partName || 'Unknown'}</span>
                            <span className="participant-owes">
                              ${p.owesToMe.toFixed(2)}
                              {p.alreadySettled > 0 && (
                                <small className="already-settled"> ({p.alreadySettled.toFixed(2)} settled)</small>
                              )}
                            </span>
                            <div className="participant-input-wrapper">
                              <span className="currency-prefix">$</span>
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="0.00"
                                value={displayValue}
                                onChange={(e) => {
                                  const rawValue = e.target.value;
                                  // Allow empty or valid decimal input patterns
                                  if (rawValue === '' || /^\d*\.?\d{0,2}$/.test(rawValue)) {
                                    const numValue = parseFloat(rawValue) || 0;
                                    // Clamp immediately if exceeds max
                                    if (numValue > maxOwed) {
                                      setParticipantSettlements(prev => ({
                                        ...prev,
                                        [p.userId]: maxOwed
                                      }));
                                    } else {
                                      setParticipantSettlements(prev => ({
                                        ...prev,
                                        [p.userId]: rawValue === '' ? '' : numValue
                                      }));
                                    }
                                  }
                                }}
                                onBlur={(e) => {
                                  // On blur, ensure value is properly clamped and formatted
                                  const numValue = parseFloat(e.target.value) || 0;
                                  const clamped = Math.max(0, Math.min(numValue, maxOwed));
                                  setParticipantSettlements(prev => ({
                                    ...prev,
                                    [p.userId]: clamped > 0 ? parseFloat(clamped.toFixed(2)) : ''
                                  }));
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="settle-quick-actions">
                      <button className="quick-action-btn" onClick={handleSettleAllFull}>
                        Settle All Full
                      </button>
                      <button className="quick-action-btn secondary" onClick={handleClearAll}>
                        Clear All
                      </button>
                    </div>

                    {totalBeingSettled > 0 && (
                      <div className="settle-total-row">
                        <span>Total to record:</span>
                        <span className="positive">${totalBeingSettled.toFixed(2)}</span>
                      </div>
                    )}
                  </>
                ) : (
                  /* DEBTOR MODE: Settle your own debt */
                  <>
                    <div className="settle-amount-info">
                      <div className="settle-amount-row">
                        <span>Your share:</span>
                        <span>${Math.abs(myParticipant.share || 0).toFixed(2)}</span>
                      </div>
                      <div className="settle-amount-row">
                        <span>Already settled:</span>
                        <span>${(myParticipant.settledAmount || 0).toFixed(2)}</span>
                      </div>
                      <div className="settle-amount-row highlight">
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
                      {settleMode === 'partial' && (() => {
                        const maxDebtorAmount = Math.abs((myParticipant.share || 0) - (myParticipant.settledAmount || 0));
                        return (
                          <div className="settle-partial-input">
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="Enter amount to settle"
                              value={partialAmount}
                              onChange={(e) => {
                                const rawValue = e.target.value;
                                // Allow empty or valid decimal input patterns
                                if (rawValue === '' || /^\d*\.?\d{0,2}$/.test(rawValue)) {
                                  const numValue = parseFloat(rawValue) || 0;
                                  // Clamp immediately if exceeds max
                                  if (numValue > maxDebtorAmount) {
                                    setPartialAmount(maxDebtorAmount.toFixed(2));
                                  } else {
                                    setPartialAmount(rawValue);
                                  }
                                }
                              }}
                              onBlur={(e) => {
                                // On blur, ensure value is properly clamped and formatted
                                const numValue = parseFloat(e.target.value) || 0;
                                const clamped = Math.max(0, Math.min(numValue, maxDebtorAmount));
                                setPartialAmount(clamped > 0 ? clamped.toFixed(2) : '');
                              }}
                            />
                          </div>
                        );
                      })()}
                    </div>
                  </>
                )}

                <div className="settle-modal-actions">
                  <button className="settle-cancel-btn" onClick={() => setShowSettleModal(false)}>
                    Cancel
                  </button>
                  <button
                    className="settle-confirm-btn"
                    onClick={handleSettle}
                    disabled={isSettling || (isPayer
                      ? totalBeingSettled <= 0
                      : (settleMode === 'partial' && (!partialAmount || parseFloat(partialAmount) <= 0))
                    )}
                  >
                    {isSettling ? 'Processing...' : (isPayer ? 'Record Payments' : 'Confirm Payment')}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          );
        })()}
      </div>
    </div>
  );
}

export default ExpenseCard;
