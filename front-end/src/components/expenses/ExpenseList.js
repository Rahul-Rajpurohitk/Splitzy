import React, { useState } from "react";
import { useSelector } from "react-redux";
import MonthSection from "./MonthSection";

function ExpenseList({ myUserId }) {
  const [expandedExpenseId, setExpandedExpenseId] = useState(null);
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

  // Sort group keys descending
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

  return (
    <div className="max-w-md mx-auto">
      {sortedGroupKeys.map((groupKey) => (
        <MonthSection
          key={groupKey}
          monthKey={groupKey}
          expenses={groupedExpenses[groupKey]}
          expandedExpenseId={expandedExpenseId}
          onToggleExpand={handleToggleExpand}
          myUserId={myUserId}
        />
      ))}
    </div>
  );
}

export default ExpenseList;
