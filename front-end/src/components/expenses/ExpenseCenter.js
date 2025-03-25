// src/components/expenses/ExpenseCenter.js
import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import AddExpenseModal from "./AddExpenseModal/AddExpenseModal";
import {
  clearSelectedExpenseId,
  fetchExpensesThunk,
  fetchSingleExpenseThunk,
  createExpenseThunk,
} from "../../features/expense/expenseSlice";

import ExpenseList from "./ExpenseList";

function ExpenseCenter() {
  const dispatch = useDispatch();
  const [showModal, setShowModal] = useState(false);

  // We read from Redux only if we need to know if we are loading or have errors
  const status = useSelector((state) => state.expense.status);
  const error = useSelector((state) => state.expense.error);
  const selectedExpenseId = useSelector((state) => state.expense.selectedExpenseId);

  // For demonstration, still from localStorage or from Redux user slice
  const token = localStorage.getItem("splitzyToken");
  const myUserId = localStorage.getItem("myUserId");

  // On mount or if selectedExpenseId changes
  useEffect(() => {
    if (!myUserId) return;
    if (selectedExpenseId) {
      dispatch(fetchSingleExpenseThunk({ expenseId: selectedExpenseId, userId: myUserId, token }));
    } else {
      dispatch(fetchExpensesThunk({ userId: myUserId, token }));
    }
  }, [selectedExpenseId, myUserId, token, dispatch]);

  // If you have socket events
  const lastEvent = useSelector((state) => state.socket.lastEvent);
  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.payload.type === "EXPENSE_CREATED") {
      dispatch(fetchExpensesThunk({ userId: myUserId, token }));
    }
  }, [lastEvent, dispatch, myUserId, token]);

  const handleSaveExpense = async (expenseData) => {
    // build payload
    const payload = { 
      creatorId: myUserId,
      description: expenseData.description,
      date: expenseData.date || new Date().toISOString().slice(0, 10),
      notes: expenseData.notes || "",
      splitMethod: expenseData.splitMethod,
      totalAmount: expenseData.amount || 0,
      //participantIds: expenseData.participants.map((p) => p.userId),
      payers: [],
      participants: expenseData.participants, // the single array
      items: [],
    };

    if (expenseData.payerInfo.mode === "multiple") {
      payload.payers = expenseData.payerInfo.payers.map((py) => ({
        userId: py.userId,
        payerName: py.name,
        paidAmount: py.paidAmount,
      }));
    } else {
      // single payer => either "you" or a friend
      payload.payers = [{ userId: myUserId, paidAmount: payload.totalAmount }];
    }

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

    try {
      await dispatch(createExpenseThunk({ payload, token })).unwrap();
      setShowModal(false);
      // Optionally re-fetch or rely on your extraReducers that pushes new expense
      dispatch(fetchExpensesThunk({ userId: myUserId, token }));
    } catch (err) {
      console.error("Error creating expense:", err);
    }
  };

  const handleShowAllExpenses = () => {
    dispatch(clearSelectedExpenseId());
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-700">Expenses</h2>
        <div className="space-x-2">
          <button
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
            onClick={() => setShowModal(true)}
          >
            + Add Expense
          </button>
          {selectedExpenseId && (
            <button
              className="bg-gray-200 px-3 py-2 rounded hover:bg-gray-300"
              onClick={handleShowAllExpenses}
            >
              View All Expenses
            </button>
          )}
        </div>
      </div>

      {status === "loading" && <p>Loading expenses...</p>}
      {status === "failed" && <p className="text-red-500">Error: {error}</p>}

      {/* We pass myUserId so children can do "You owe / You lent" logic if needed */}
      {/* The child will do its own useSelector to get the expense list */}
      {status === "succeeded" && <ExpenseList myUserId={myUserId} />}

      {showModal && (
        <AddExpenseModal onClose={() => setShowModal(false)} onSave={handleSaveExpense} />
      )}
    </div>
  );
}

export default ExpenseCenter;
