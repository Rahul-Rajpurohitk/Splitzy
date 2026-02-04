// src/components/expenses/ExpenseCenter.js
import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import { FiChevronDown, FiFilter, FiX, FiCalendar } from "react-icons/fi";
import AddExpenseModal from "./AddExpenseModal/AddExpenseModal";
import {
  clearSelectedExpenseId,
  fetchExpensesThunk,
  fetchSingleExpenseThunk,
  createExpenseThunk,
  clearExpenseFilter,
  backgroundSyncExpensesThunk,
  updateSingleExpenseThunk,
} from "../../features/expense/expenseSlice";

import ExpenseList from "./ExpenseList";
import { invalidateCache } from "../../services/api";

// Category options
const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories', icon: '📁' },
  { value: 'food', label: 'Food & Dining', icon: '🍔' },
  { value: 'groceries', label: 'Groceries', icon: '🛒' },
  { value: 'transport', label: 'Transport', icon: '🚗' },
  { value: 'entertainment', label: 'Entertainment', icon: '🎬' },
  { value: 'utilities', label: 'Utilities', icon: '💡' },
  { value: 'shopping', label: 'Shopping', icon: '🛍️' },
  { value: 'travel', label: 'Travel', icon: '✈️' },
  { value: 'health', label: 'Health', icon: '🏥' },
  { value: 'rent', label: 'Rent', icon: '🏠' },
  { value: 'subscriptions', label: 'Subscriptions', icon: '📱' },
  { value: 'general', label: 'General', icon: '📦' },
];

// Date range options
const DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: '3months', label: 'Last 3 Months' },
  { value: '6months', label: 'Last 6 Months' },
  { value: 'year', label: 'This Year' },
];

function ExpenseCenter({ onOpenChat, externalShowAddModal, onCloseAddModal }) {
  const dispatch = useDispatch();
  const [showModal, setShowModal] = useState(false);

  // Filter states
  const [owingFilter, setOwingFilter] = useState("all"); // "all" | "youOwe" | "othersOwe"
  const [settledFilter, setSettledFilter] = useState("all"); // "all" | "settled" | "unsettled" | "partial"
  const [typeFilter, setTypeFilter] = useState("all"); // "all" | "personal" | "shared"
  const [categoryFilter, setCategoryFilter] = useState("all"); // "all" | category value
  const [dateRangeFilter, setDateRangeFilter] = useState("all"); // "all" | date range value
  const [friendFilter, setFriendFilter] = useState(null); // null | friend object
  const [groupFilter, setGroupFilter] = useState(null); // null | group object
  const [showFilters, setShowFilters] = useState(false);

  // Dropdown states
  const [friendDropdownOpen, setFriendDropdownOpen] = useState(false);
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [dateRangeDropdownOpen, setDateRangeDropdownOpen] = useState(false);
  const friendDropdownRef = useRef(null);
  const groupDropdownRef = useRef(null);
  const categoryDropdownRef = useRef(null);
  const dateRangeDropdownRef = useRef(null);

  // Friends and groups for dropdowns
  const [friendsList, setFriendsList] = useState([]);
  const [groupsList, setGroupsList] = useState([]);

  // Sync external modal trigger from mobile nav
  useEffect(() => {
    if (externalShowAddModal) {
      setShowModal(true);
      onCloseAddModal?.(); // Reset external state
    }
  }, [externalShowAddModal, onCloseAddModal]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (friendDropdownRef.current && !friendDropdownRef.current.contains(e.target)) {
        setFriendDropdownOpen(false);
      }
      if (groupDropdownRef.current && !groupDropdownRef.current.contains(e.target)) {
        setGroupDropdownOpen(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target)) {
        setCategoryDropdownOpen(false);
      }
      if (dateRangeDropdownRef.current && !dateRangeDropdownRef.current.contains(e.target)) {
        setDateRangeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // We read from Redux only if we need to know if we are loading or have errors
  const status = useSelector((state) => state.expense.status);
  const error = useSelector((state) => state.expense.error);
  const selectedExpenseId = useSelector((state) => state.expense.selectedExpenseId);
  const activeFilter = useSelector((state) => state.expense.activeFilter);

  // For demonstration, still from localStorage or from Redux user slice
  const token = localStorage.getItem("splitzyToken");
  const myUserId = localStorage.getItem("myUserId");

  // Fetch friends and groups for filter dropdowns
  useEffect(() => {
    const fetchFriendsAndGroups = async () => {
      if (!myUserId || !token) return;
      try {
        const [friendsRes, groupsRes] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_URL}/home/friends?userId=${myUserId}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${process.env.REACT_APP_API_URL}/groups/${myUserId}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        setFriendsList(friendsRes.data || []);
        setGroupsList(groupsRes.data || []);
      } catch (err) {
        console.error("Failed to fetch friends/groups for filters", err);
      }
    };
    fetchFriendsAndGroups();
  }, [myUserId, token]);

  // Build UNIFIED filters object that combines ALL filter sources:
  // 1. Filter bar filters (owingFilter, settledFilter, typeFilter, etc.)
  // 2. Legacy sidebar activeFilter (friend/group context)
  // All filters work together as AND conditions
  // FIXED: Now supports BOTH friend AND group filters together (AND logic, not mutually exclusive)
  const unifiedFilters = useMemo(() => {
    const filters = {
      owingFilter,
      settledFilter: settledFilter === 'partial' ? 'all' : settledFilter,
      typeFilter,
      partialFilter: settledFilter === 'partial' ? 'partial' : 'all',
      categoryFilter,
      dateRangeFilter,
      friendFilter,
      groupFilter,
    };

    // Merge activeFilter context (sidebar friend/group selection)
    // FIXED: No longer mutually exclusive - activeFilter can MERGE with existing filters
    // If user selected friend from sidebar AND group from dropdown, both apply (AND logic)
    if (activeFilter?.filterType === 'friend' && activeFilter.filterEntity?.id) {
      // Sidebar friend selection - merge with dropdown friend if not already set
      if (!filters.friendFilter) {
        filters.friendFilter = { id: activeFilter.filterEntity.id, name: activeFilter.filterEntity.name };
      }
    }
    if (activeFilter?.filterType === 'group' && activeFilter.filterEntity?.id) {
      // Sidebar group selection - merge with dropdown group if not already set
      if (!filters.groupFilter) {
        filters.groupFilter = { id: activeFilter.filterEntity.id, groupName: activeFilter.filterEntity.groupName };
      }
    }

    return filters;
  }, [owingFilter, settledFilter, typeFilter, categoryFilter, dateRangeFilter, friendFilter, groupFilter, activeFilter]);

  // Store last fetched filter signature to prevent duplicate fetches
  const lastFetchRef = useRef(null);

  useEffect(() => {
    if (!myUserId) return;

    // Create a signature of current filters to detect actual changes
    const filterSignature = JSON.stringify({
      selectedExpenseId,
      filters: unifiedFilters,
    });

    // Skip if we just fetched with these exact filters
    if (lastFetchRef.current === filterSignature) {
      return;
    }

    if (selectedExpenseId) {
      dispatch(fetchSingleExpenseThunk({ expenseId: selectedExpenseId, userId: myUserId, token }));
    } else {
      // ALWAYS use unified filters - this works for:
      // - No filters (shows all)
      // - Filter bar filters only
      // - Sidebar activeFilter only
      // - Both combined
      dispatch(fetchExpensesThunk({ userId: myUserId, token, filters: unifiedFilters }));
    }

    lastFetchRef.current = filterSignature;
  }, [selectedExpenseId, myUserId, token, dispatch, unifiedFilters]);


  // Socket events - use GRANULAR updates for efficiency
  // Only updates the specific expense that changed, not the entire list
  // This prevents cascading re-renders and preserves user's scroll position
  const lastEvent = useSelector((state) => state.socket.lastEvent);
  const lastEventRef = useRef(null);

  useEffect(() => {
    if (!lastEvent) return;
    // Prevent duplicate processing of same event
    if (lastEventRef.current === lastEvent.timestamp) return;
    lastEventRef.current = lastEvent.timestamp;

    const eventType = lastEvent.payload?.type;
    const expenseId = lastEvent.payload?.expenseId;

    if ((eventType === "EXPENSE_CREATED" || eventType === "EXPENSE_SETTLED") && expenseId) {
      console.log('[ExpenseCenter] Socket event:', eventType, '- granular update for expense:', expenseId);
      // GRANULAR UPDATE: Only fetch and update the specific expense that changed
      // This is MUCH more efficient than refetching the entire list
      dispatch(updateSingleExpenseThunk({
        expenseId,
        token,
        updateType: eventType,
      }));
    } else if (eventType === "EXPENSE_CREATED" || eventType === "EXPENSE_SETTLED") {
      // Fallback: If no expenseId in payload, do background sync
      console.log('[ExpenseCenter] Socket event without expenseId, falling back to background sync');
      dispatch(backgroundSyncExpensesThunk({ userId: myUserId, token, filters: unifiedFilters }));
    }
  }, [lastEvent, dispatch, myUserId, token, unifiedFilters]);

  const handleSaveExpense = async (expenseData) => {
    // build payload
    const payload = { 
      creatorId: myUserId,
      description: expenseData.description,
      category: expenseData.category || "general",
      date: expenseData.date || new Date().toISOString().slice(0, 10),
      notes: expenseData.notes || "",
      groupId: expenseData.group ? expenseData.group.id : null,
      groupName: expenseData.group ? expenseData.group.groupName : "",  
      splitMethod: expenseData.splitMethod,
      totalAmount: expenseData.amount || 0,
      payers: expenseData.payerInfo.payers,
      participants: expenseData.participants, // the single array
      items: [],
      taxRate: expenseData.taxRate,   // now included
      tipRate: expenseData.tipRate,
      fullOwe: expenseData.fullOwe, // now included
      isPersonal: expenseData.isPersonal || false, // Personal expense flag
    };


      // If itemized
    if (expenseData.splitMethod === "ITEMIZED") {
      payload.items = expenseData.items; 
    }

    // Now handle advanced splits
    /*if (expenseData.splitMethod === "ITEMIZED") {
      payload.items = expenseData.items; // e.g. array of { name, amount, userShares: { userId: fraction } }
    } else if (expenseData.splitMethod === "PERCENTAGE") {
      payload.userPercentMap = expenseData.userPercentMap; // { userId -> % }
    } else if (expenseData.splitMethod === "EXACT_AMOUNTS") {
      payload.exactAmountsMap = expenseData.exactAmountsMap; // { userId -> exactAmount }
    } else if (expenseData.splitMethod === "SHARES") {
      payload.sharesMap = expenseData.sharesMap; // { userId -> shareCount }
    } */

    // Log the final payload for debugging purposes.
    console.log("Final payload:", payload);

    try {
      const createdExpense = await dispatch(createExpenseThunk({ payload, token })).unwrap();
      setShowModal(false);

      // Invalidate caches to ensure fresh data for balance cards and analytics
      invalidateCache('/analytics');
      invalidateCache('/home/expenses');

      // REMOVED: fetchExpensesThunk call was causing race condition with socket events
      // The expense is already added to Redux by createExpenseThunk.fulfilled (optimistic update)
      // Other devices of the same user will receive the update via socket event
      // This prevents:
      // 1. Race condition between fetch and socket event
      // 2. Duplicate expense entries
      // 3. Full list replacement disrupting UI state

      console.log('[ExpenseCenter] Expense created:', createdExpense.id, '- list updated via Redux');
    } catch (err) {
      console.error("Error creating expense:", err);
    }
  };

  const handleClearFilter = () => {
    dispatch(clearSelectedExpenseId());
    dispatch(clearExpenseFilter());
  };

  // Clear local filters
  const handleClearLocalFilters = () => {
    setOwingFilter("all");
    setSettledFilter("all");
    setTypeFilter("all");
    setCategoryFilter("all");
    setDateRangeFilter("all");
    setFriendFilter(null);
    setGroupFilter(null);
  };

  // Check if any local filter is active
  const hasActiveLocalFilters = owingFilter !== "all" || settledFilter !== "all" || typeFilter !== "all" ||
    categoryFilter !== "all" || dateRangeFilter !== "all" || friendFilter || groupFilter;

  // Filter validation - detect contradictory or potentially confusing combinations
  // These combinations may return empty or unexpected results
  const filterWarning = useMemo(() => {
    // youOwe + settled = contradictory (you can't owe money that's fully settled)
    if (owingFilter === 'youOwe' && settledFilter === 'settled') {
      return "Note: 'You Owe' + 'Settled' may show no results (settled debts aren't owed)";
    }
    // othersOwe + partial = semantically odd (partial is YOUR payment status, not theirs)
    if (owingFilter === 'othersOwe' && settledFilter === 'partial') {
      return "Note: 'Others Owe' + 'Partial' shows where you partially paid on expenses others owe you";
    }
    // personal + friend filter = likely empty (personal expenses have no friends)
    if (typeFilter === 'personal' && friendFilter) {
      return "Note: Personal expenses don't involve friends - this combination may show no results";
    }
    // personal + group filter = likely empty (personal expenses aren't in groups)
    if (typeFilter === 'personal' && groupFilter) {
      return "Note: Personal expenses aren't in groups - this combination may show no results";
    }
    return null;
  }, [owingFilter, settledFilter, typeFilter, friendFilter, groupFilter]);

  // Determine title based on activeFilter
  let headerTitle = "Expenses";
  if (activeFilter) {
    if (activeFilter.filterType === "friend") {
      headerTitle = `${activeFilter.filterEntity.name}'s Expenses`;
    } else if (activeFilter.filterType === "group") {
      headerTitle = `${activeFilter.filterEntity.groupName} Expenses`;
    }
  }

  // Build filters object to pass to ExpenseList
  const filters = {
    owingFilter,
    settledFilter,
    typeFilter,
    categoryFilter,
    dateRangeFilter,
    friendFilter,
    groupFilter
  };

  return (
    <div className="p-4">
      <div className="expense-header">
        <div className="expense-head-left">
          <div className="expense-title-row">
            <h2 className="expense-title">{headerTitle}</h2>
            {activeFilter && (
              <span className="pill filter-pill">
                {activeFilter.filterType === "friend"
                  ? `Friend: ${activeFilter.filterEntity.name}`
                  : `Group: ${activeFilter.filterEntity.groupName}`}
              </span>
            )}
          </div>
        </div>
        <div className="header-actions">
          <button
            className={`chip ${showFilters || hasActiveLocalFilters ? 'primary' : 'ghost'}`}
            onClick={() => setShowFilters(!showFilters)}
            data-testid="filter-toggle-btn"
            aria-label="Toggle filters"
            aria-expanded={showFilters}
          >
            <FiFilter size={14} />
            {hasActiveLocalFilters && <span className="filter-count">!</span>}
          </button>
          {(selectedExpenseId || activeFilter) && (
            <button className="chip ghost" onClick={handleClearFilter}>
              Reset view
            </button>
          )}
          <button
            className="chip primary"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('modalOpened'));
              setShowModal(true);
            }}
            data-testid="add-expense-btn"
          >
            + Add expense
          </button>
        </div>
      </div>

      {/* Filter Bar - toggle via filter icon in header */}
      {showFilters && (
        <div className="expense-filter-bar" data-testid="expense-filter-bar">
          {/* Owing Filter Toggles */}
          <div className="filter-group" data-testid="owing-filter-group">
            <div className="filter-toggle-group">
              <button
                className={`filter-toggle ${owingFilter === 'all' ? 'active' : ''}`}
                onClick={() => setOwingFilter('all')}
                data-testid="filter-owing-all"
              >
                All
              </button>
              <button
                className={`filter-toggle ${owingFilter === 'youOwe' ? 'active' : ''}`}
                onClick={() => setOwingFilter('youOwe')}
                data-testid="filter-you-owe"
              >
                You Owe
              </button>
              <button
                className={`filter-toggle ${owingFilter === 'othersOwe' ? 'active' : ''}`}
                onClick={() => setOwingFilter('othersOwe')}
                data-testid="filter-others-owe"
              >
                Others Owe
              </button>
            </div>
          </div>

          {/* Settled Filter Toggles */}
          <div className="filter-group" data-testid="settled-filter-group">
            <div className="filter-toggle-group">
              <button
                className={`filter-toggle ${settledFilter === 'all' ? 'active' : ''}`}
                onClick={() => setSettledFilter('all')}
                data-testid="filter-settled-all"
              >
                All
              </button>
              <button
                className={`filter-toggle ${settledFilter === 'unsettled' ? 'active' : ''}`}
                onClick={() => setSettledFilter('unsettled')}
                data-testid="filter-unsettled"
              >
                Unsettled
              </button>
              <button
                className={`filter-toggle ${settledFilter === 'partial' ? 'active' : ''}`}
                onClick={() => setSettledFilter('partial')}
                data-testid="filter-partial"
              >
                Partial
              </button>
              <button
                className={`filter-toggle ${settledFilter === 'settled' ? 'active' : ''}`}
                onClick={() => setSettledFilter('settled')}
                data-testid="filter-settled"
              >
                Settled
              </button>
            </div>
          </div>

          {/* Type Filter Toggles (Personal/Shared) */}
          <div className="filter-group" data-testid="type-filter-group">
            <div className="filter-toggle-group">
              <button
                className={`filter-toggle ${typeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setTypeFilter('all')}
                data-testid="filter-type-all"
              >
                All
              </button>
              <button
                className={`filter-toggle ${typeFilter === 'personal' ? 'active' : ''}`}
                onClick={() => setTypeFilter('personal')}
                data-testid="filter-personal"
              >
                👤 Personal
              </button>
              <button
                className={`filter-toggle ${typeFilter === 'shared' ? 'active' : ''}`}
                onClick={() => setTypeFilter('shared')}
                data-testid="filter-shared"
              >
                👥 Shared
              </button>
            </div>
          </div>

          {/* Category Dropdown */}
          <div className="filter-group" ref={categoryDropdownRef}>
            <div className="filter-dropdown">
              <button
                className={`filter-dropdown-btn ${categoryFilter !== 'all' ? 'active' : ''}`}
                onClick={() => {
                  setCategoryDropdownOpen(!categoryDropdownOpen);
                  setFriendDropdownOpen(false);
                  setGroupDropdownOpen(false);
                  setDateRangeDropdownOpen(false);
                }}
              >
                {categoryFilter !== 'all'
                  ? CATEGORY_OPTIONS.find(c => c.value === categoryFilter)?.label || 'Category'
                  : 'Category'}
                {categoryFilter !== 'all' ? (
                  <FiX size={14} onClick={(e) => { e.stopPropagation(); setCategoryFilter('all'); }} />
                ) : (
                  <FiChevronDown size={14} />
                )}
              </button>
              {categoryDropdownOpen && (
                <div className="filter-dropdown-menu category-menu">
                  {CATEGORY_OPTIONS.map((cat) => (
                    <button
                      key={cat.value}
                      className={`filter-dropdown-item ${categoryFilter === cat.value ? 'selected' : ''}`}
                      onClick={() => {
                        setCategoryFilter(cat.value);
                        setCategoryDropdownOpen(false);
                      }}
                    >
                      <span className="cat-icon">{cat.icon}</span> {cat.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Date Range Dropdown */}
          <div className="filter-group" ref={dateRangeDropdownRef}>
            <div className="filter-dropdown">
              <button
                className={`filter-dropdown-btn ${dateRangeFilter !== 'all' ? 'active' : ''}`}
                onClick={() => {
                  setDateRangeDropdownOpen(!dateRangeDropdownOpen);
                  setFriendDropdownOpen(false);
                  setGroupDropdownOpen(false);
                  setCategoryDropdownOpen(false);
                }}
              >
                <FiCalendar size={12} />
                {dateRangeFilter !== 'all'
                  ? DATE_RANGE_OPTIONS.find(d => d.value === dateRangeFilter)?.label || 'Date'
                  : 'Date'}
                {dateRangeFilter !== 'all' ? (
                  <FiX size={14} onClick={(e) => { e.stopPropagation(); setDateRangeFilter('all'); }} />
                ) : (
                  <FiChevronDown size={14} />
                )}
              </button>
              {dateRangeDropdownOpen && (
                <div className="filter-dropdown-menu">
                  {DATE_RANGE_OPTIONS.map((range) => (
                    <button
                      key={range.value}
                      className={`filter-dropdown-item ${dateRangeFilter === range.value ? 'selected' : ''}`}
                      onClick={() => {
                        setDateRangeFilter(range.value);
                        setDateRangeDropdownOpen(false);
                      }}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Friends Dropdown */}
          <div className="filter-group" ref={friendDropdownRef}>
            <div className="filter-dropdown">
              <button
                className={`filter-dropdown-btn ${friendFilter ? 'active' : ''}`}
                onClick={() => {
                  setFriendDropdownOpen(!friendDropdownOpen);
                  setGroupDropdownOpen(false);
                  setCategoryDropdownOpen(false);
                  setDateRangeDropdownOpen(false);
                }}
              >
                {friendFilter ? friendFilter.name : 'Friend'}
                {friendFilter ? (
                  <FiX size={14} onClick={(e) => { e.stopPropagation(); setFriendFilter(null); }} />
                ) : (
                  <FiChevronDown size={14} />
                )}
              </button>
              {friendDropdownOpen && (
                <div className="filter-dropdown-menu">
                  {friendsList.length === 0 ? (
                    <div className="filter-dropdown-item muted">No friends</div>
                  ) : (
                    friendsList.map((friend) => (
                      <button
                        key={friend.id}
                        className={`filter-dropdown-item ${friendFilter?.id === friend.id ? 'selected' : ''}`}
                        onClick={() => {
                          setFriendFilter(friend);
                          setFriendDropdownOpen(false);
                        }}
                      >
                        {friend.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Groups Dropdown */}
          <div className="filter-group" ref={groupDropdownRef}>
            <div className="filter-dropdown">
              <button
                className={`filter-dropdown-btn ${groupFilter ? 'active' : ''}`}
                onClick={() => {
                  setGroupDropdownOpen(!groupDropdownOpen);
                  setFriendDropdownOpen(false);
                  setCategoryDropdownOpen(false);
                  setDateRangeDropdownOpen(false);
                }}
              >
                {groupFilter ? groupFilter.groupName : 'Group'}
                {groupFilter ? (
                  <FiX size={14} onClick={(e) => { e.stopPropagation(); setGroupFilter(null); }} />
                ) : (
                  <FiChevronDown size={14} />
                )}
              </button>
              {groupDropdownOpen && (
                <div className="filter-dropdown-menu">
                  {groupsList.length === 0 ? (
                    <div className="filter-dropdown-item muted">No groups</div>
                  ) : (
                    groupsList.map((group) => (
                      <button
                        key={group.id}
                        className={`filter-dropdown-item ${groupFilter?.id === group.id ? 'selected' : ''}`}
                        onClick={() => {
                          setGroupFilter(group);
                          setGroupDropdownOpen(false);
                        }}
                      >
                        {group.groupName}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveLocalFilters && (
            <button
              className="filter-clear-btn"
              onClick={handleClearLocalFilters}
              data-testid="clear-filters-btn"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Filter Warning - shows when contradictory filter combinations are selected */}
      {filterWarning && showFilters && (
        <div className="filter-warning" data-testid="filter-warning">
          <span className="warning-icon">⚠️</span>
          <span className="warning-text">{filterWarning}</span>
        </div>
      )}

      <div className="expense-header-divider" />

      {status === "loading" && <p className="muted">Loading expenses...</p>}
      {status === "failed" && <p className="error-text">Error: {error}</p>}

      {/* We pass myUserId so children can do "You owe / You lent" logic if needed */}
      {/* The child will do its own useSelector to get the expense list */}
      {status === "succeeded" && <ExpenseList myUserId={myUserId} onOpenChat={onOpenChat} filters={filters} />}

      {showModal && (
        <AddExpenseModal onClose={() => setShowModal(false)} onSave={handleSaveExpense} />
      )}
    </div>
  );
}

export default ExpenseCenter;
