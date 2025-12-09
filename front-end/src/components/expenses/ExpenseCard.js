import React from "react";
import { useSelector } from "react-redux";
// You can import icons from something like react-icons
// e.g., import { FaUtensils } from "react-icons/fa";

function ExpenseCard({ expenseId, isExpanded, onToggleExpand, myUserId }) {
  const expense = useSelector((state) =>
    state.expense.list.find((e) => e.id === expenseId)
  );

  if (!expense) return null;

  // Parse date
  const dateObj = new Date(expense.date || Date.now());
  const dayNum = dateObj.getDate();
  const shortMonth = dateObj.toLocaleString("default", { month: "short" });

  // Identify the current user’s participant object
  const myParticipant = expense.participants.find((p) => p.userId === myUserId) || { net: 0 };

  // Determine the net-lending message
  let netMessage = "Settled up";
  let netMessageColor = "text-gray-400";
  if (myParticipant.net > 0) {
    netMessage = `You lent $${Math.abs(myParticipant.net).toFixed(2)}`;
    netMessageColor = "text-green-600";
  } else if (myParticipant.net < 0) {
    netMessage = `You owe $${Math.abs(myParticipant.net).toFixed(2)}`;
    netMessageColor = "text-red-500";
  }

  // Updated payer display logic clearly defined here:
  let payersText = "";
  if (expense.payers.length === 1) {
    payersText = `${expense.payers[0].payerName || "Someone"} paid`;
  } else if (expense.payers.length > 1) {
    payersText = `${expense.payers.length} people paid`;
  }

  // Example: we might show the top 2 payers or just the first one

  return (
    <div
      onClick={onToggleExpand}
      className="bg-white border rounded-md shadow-sm p-3 cursor-pointer hover:shadow transition w-full"
    >
      {/* Top row: icon/date + description + total + net */}
      <div className="flex items-center">
        {/* Left: optional icon & date block */}
        <div className="flex items-center w-20">
          {/* Example: category icon (optional) */}
          {/* <FaUtensils className="text-green-500 mr-2" /> */}

          {/* Date block */}
          <div className="text-center">
            <div className="text-sm font-bold leading-none">{dayNum}</div>
            <div className="text-[10px] uppercase text-gray-400">{shortMonth}</div>
          </div>
        </div>

        {/* Middle: description + who paid */}
        <div className="flex-1 px-2">
          <div className="font-semibold text-gray-800 text-sm">{expense.description}</div>
          <div className="text-xs text-gray-500">{payersText}</div>
        </div>

        {/* Right: total + net message */}
        <div className="text-right w-24">
          <div className="font-semibold text-gray-800">${expense.totalAmount.toFixed(2)}</div>
          <div className={`text-xs font-medium ${netMessageColor}`}>
            {netMessage}
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="mt-3 text-sm border-t pt-2">
          {/* Basic info */}
          <div className="text-gray-700 font-semibold mb-1">{expense.description}</div>
          <p className="text-gray-600 text-xs">
            Total: ${expense.totalAmount.toFixed(2)}
          </p>
          <p className="text-gray-400 text-xs mt-1">
            Created by {expense.creatorName} on{" "}
            {new Date(expense.createdAt).toLocaleDateString()}
          </p>

          {/* Participants list */}
          <div className="mt-2 space-y-1">
            {expense.participants.map((p) => (
              <div key={p.userId} className="text-xs text-gray-600">
                {p.partName || p.userId} paid ${p.paid.toFixed(2)} and owes $
                {p.share.toFixed(2)}
              </div>
            ))}
          </div>

          {/* Last updated */}
          <p className="text-gray-400 text-xs mt-2">
            Last updated by {expense.creatorName} on{" "}
            {new Date(expense.updatedAt).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
}

export default ExpenseCard;
