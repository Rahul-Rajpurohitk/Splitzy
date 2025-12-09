import React from "react";
import ExpenseCard from "./ExpenseCard";

function MonthSection({ monthKey, expenses, expandedExpenseId, onToggleExpand, myUserId }) {
  return (
    <div className="mb-3"> {/* Reduced from mb-6 to mb-3 */}
      <div className="bg-gray-100 px-3 py-1 text-gray-700 font-semibold uppercase rounded mb-2 text-xs tracking-wider">
        {monthKey}
      </div>
      <div className="space-y-2"> {/* Reduced spacing between cards slightly */}
        {expenses.map((exp) => (
          <ExpenseCard
            key={exp.id}
            expenseId={exp.id}
            isExpanded={expandedExpenseId === exp.id}
            onToggleExpand={() => onToggleExpand(exp.id)}
            myUserId={myUserId}
          />
        ))}
      </div>
    </div>
  );
}

export default MonthSection;
