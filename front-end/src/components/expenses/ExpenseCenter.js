// src/components/expenses/ExpenseCenter.js
import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import AddExpenseModal from "./AddExpenseModal/AddExpenseModal";
import {
  clearSelectedExpenseId,
  fetchExpensesThunk,
  fetchSingleExpenseThunk,
  createExpenseThunk,
  fetchExpensesForFriendThunk,
  fetchExpensesForGroupThunk,
  clearExpenseFilter,
} from "../../features/expense/expenseSlice";

import ExpenseList from "./ExpenseList";

function ExpenseCenter({ onOpenChat, externalShowAddModal, onCloseAddModal }) {
  const dispatch = useDispatch();
  const [showModal, setShowModal] = useState(false);
  
  // Sync external modal trigger from mobile nav
  useEffect(() => {
    if (externalShowAddModal) {
      setShowModal(true);
      onCloseAddModal?.(); // Reset external state
    }
  }, [externalShowAddModal, onCloseAddModal]);

  // We read from Redux only if we need to know if we are loading or have errors
  const status = useSelector((state) => state.expense.status);
  const error = useSelector((state) => state.expense.error);
  const selectedExpenseId = useSelector((state) => state.expense.selectedExpenseId);
  const activeFilter = useSelector((state) => state.expense.activeFilter);

  // For demonstration, still from localStorage or from Redux user slice
  const token = localStorage.getItem("splitzyToken");
  const myUserId = localStorage.getItem("myUserId");

  useEffect(() => {
    if (!myUserId) return;
    if (activeFilter) {
      if (activeFilter.filterType === "friend") {
        dispatch(fetchExpensesForFriendThunk({ userId: myUserId, friendId: activeFilter.filterEntity.id, token }));
      } else if (activeFilter.filterType === "group") {
        dispatch(fetchExpensesForGroupThunk({ groupId: activeFilter.filterEntity.id, token }));
      }
    } else if (selectedExpenseId) {
      dispatch(fetchSingleExpenseThunk({ expenseId: selectedExpenseId, userId: myUserId, token }));
    } else {
      dispatch(fetchExpensesThunk({ userId: myUserId, token }));
    }
  }, [selectedExpenseId, myUserId, token, dispatch, activeFilter]);


  // If you have socket events
  const lastEvent = useSelector((state) => state.socket.lastEvent);
  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.payload?.type === "EXPENSE_CREATED" || lastEvent.payload?.type === "EXPENSE_SETTLED") {
      console.log('[ExpenseCenter] Expense event received:', lastEvent.payload?.type, '- refreshing');
      dispatch(fetchExpensesThunk({ userId: myUserId, token }));
    }
  }, [lastEvent, dispatch, myUserId, token]);

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
      await dispatch(createExpenseThunk({ payload, token })).unwrap();
      setShowModal(false);
      // Optionally re-fetch or rely on your extraReducers that pushes new expense
      dispatch(fetchExpensesThunk({ userId: myUserId, token }));
    } catch (err) {
      console.error("Error creating expense:", err);
    }
  };

  const handleClearFilter = () => {
    dispatch(clearSelectedExpenseId());
    dispatch(clearExpenseFilter());
  };

  // Determine title based on activeFilter
  let headerTitle = "Expenses";
  if (activeFilter) {
    if (activeFilter.filterType === "friend") {
      headerTitle = `${activeFilter.filterEntity.name}'s Expenses`;
    } else if (activeFilter.filterType === "group") {
      headerTitle = `${activeFilter.filterEntity.groupName} Expenses`;
    }
  }

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
          {(selectedExpenseId || activeFilter) && (
            <button className="chip ghost" onClick={handleClearFilter}>
              Reset view
            </button>
          )}
          <button className="chip primary" onClick={() => {
            window.dispatchEvent(new CustomEvent('modalOpened'));
            setShowModal(true);
          }}>
            + Add expense
          </button>
        </div>
      </div>
      <div className="expense-header-divider" />

      {status === "loading" && <p className="muted">Loading expenses...</p>}
      {status === "failed" && <p className="error-text">Error: {error}</p>}

      {/* We pass myUserId so children can do "You owe / You lent" logic if needed */}
      {/* The child will do its own useSelector to get the expense list */}
      {status === "succeeded" && <ExpenseList myUserId={myUserId} onOpenChat={onOpenChat} />}

      {showModal && (
        <AddExpenseModal onClose={() => setShowModal(false)} onSave={handleSaveExpense} />
      )}
    </div>
  );
}

export default ExpenseCenter;
