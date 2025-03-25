// ExpenseDetails.js
import React from "react";

function ExpenseDetails({ expense }) {
  return (
    <div className="mt-3 text-sm border-t pt-2">
      <div className="text-gray-700 font-semibold mb-1">{expense.description}</div>
      <p className="text-gray-600 text-xs">
        Total: ${expense.totalAmount.toFixed(2)}
      </p>
      <p className="text-gray-400 text-xs mt-1">
        Created by {expense.creatorName} on{" "}
        {new Date(expense.createdAt).toLocaleDateString()}
      </p>

      {/* Participants */}
      <div className="mt-2 space-y-1">
        {expense.participants.map((p) => (
          <div key={p.userId} className="text-xs text-gray-600">
            {p.partName} paid ${p.paid.toFixed(2)} and owes ${p.share.toFixed(2)}
          </div>
        ))}
      </div>

      <p className="text-gray-400 text-xs mt-2">
        Last updated by {expense.creatorName} on{" "}
        {new Date(expense.updatedAt).toLocaleDateString()}
      </p>
    </div>
  );
}

export default ExpenseDetails;
