import React, { useState } from "react";
import { useSelector } from "react-redux";
import MonthSection from "./MonthSection";

function ExpenseList({ myUserId, onOpenChat, filters = {} }) {
  const [expandedExpenseId, setExpandedExpenseId] = useState(null);
  // Expenses are now filtered by backend, no client-side filtering needed
  const expenses = useSelector((state) => state.expense.list);

  // Group by Month/Year
  const groupedExpenses = expenses.reduce((acc, expense) => {
    if (!expense.date) return acc;
    const d = new Date(expense.date);
    const monthName = d.toLocaleString("default", { month: "long" });
    const year = d.getFullYear();
    const groupKey = `${monthName.toUpperCase()} ${year}`;
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(expense);
    return acc;
  }, {});

  // Sort group keys descending (newest first)
  const sortedGroupKeys = Object.keys(groupedExpenses).sort((a, b) => {
    const [monthA, yearA] = a.split(" ");
    const [monthB, yearB] = b.split(" ");
    const dateA = new Date(`${monthA} 1, ${yearA}`);
    const dateB = new Date(`${monthB} 1, ${yearB}`);
    return dateB - dateA;
  });

  const handleToggleExpand = (expenseId) => {
    setExpandedExpenseId((prev) => (prev === expenseId ? null : expenseId));
  };

  // Check if any filter is active
  const hasActiveFilters = filters.owingFilter !== 'all' || filters.settledFilter !== 'all' || filters.friendFilter || filters.groupFilter;

  if (expenses.length === 0) {
    return (
      <div className="expense-empty">
        <div className="empty-icon">{hasActiveFilters ? '🔍' : '📊'}</div>
        <h3>{hasActiveFilters ? 'No matching expenses' : 'No expenses yet'}</h3>
        <p>{hasActiveFilters ? 'Try adjusting your filters' : 'Add your first expense to start tracking'}</p>
      </div>
    );
  }

  return (
    <div className="expense-list">
      {sortedGroupKeys.map((groupKey) => (
        <MonthSection
          key={groupKey}
          monthKey={groupKey}
          expenses={groupedExpenses[groupKey]}
          expandedExpenseId={expandedExpenseId}
          onToggleExpand={handleToggleExpand}
          myUserId={myUserId}
          onOpenChat={onOpenChat}
        />
      ))}
    </div>
  );
}

export default ExpenseList;
