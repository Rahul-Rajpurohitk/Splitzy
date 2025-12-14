import React from "react";
import ExpenseCard from "./ExpenseCard";

function MonthSection({ monthKey, expenses, expandedExpenseId, onToggleExpand, myUserId, onOpenChat }) {
  // Calculate month summary
  const monthTotal = expenses.reduce((sum, exp) => sum + (exp.totalAmount || 0), 0);
  
  return (
    <div className="month-section">
      <div className="month-header">
        <span className="month-label">{monthKey}</span>
        <span className="month-total">${monthTotal.toFixed(2)} total</span>
      </div>
      <div className="expenses-stack">
        {expenses.map((exp) => (
          <ExpenseCard
            key={exp.id}
            expenseId={exp.id}
            isExpanded={expandedExpenseId === exp.id}
            onToggleExpand={() => onToggleExpand(exp.id)}
            myUserId={myUserId}
            onOpenChat={onOpenChat}
          />
        ))}
      </div>
    </div>
  );
}

export default MonthSection;
