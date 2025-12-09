// src/components/expenses/AddExpenseModal/PayerPanel.js
import React, { useState, useEffect } from "react";

function PayerPanel({ participants, payerInfo, setPayerInfo }) {
  const [mode, setMode] = useState(payerInfo.mode || "you");
  const [payers, setPayers] = useState(payerInfo.payers || []);

  useEffect(() => {
    if (mode === "you") {
      // If "you" => no multiple payers
      setPayers([]);
    } else if (mode === "multiple") {
      // create a default array for each participant
      const defaultPayers = participants.map((p) => ({
        userId: p.id,
        paidAmount: 0,
      }));
      setPayers(defaultPayers);
    }
  }, [mode, participants]);

  const handlePaidAmountChange = (userId, val) => {
    setPayers((prev) =>
      prev.map((p) =>
        p.userId === userId ? { ...p, paidAmount: parseFloat(val) || 0 } : p
      )
    );
  };

  // Whenever payers or mode changes, update payerInfo in the parent
  useEffect(() => {
    setPayerInfo({ mode, payers });
  }, [mode, payers, setPayerInfo]);

  return (
    <div className="mt-4">
      <h3 className="text-base font-semibold mb-2">Who paid?</h3>

      <div className="flex items-center gap-4 mb-2">
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="radio"
            value="you"
            checked={mode === "you"}
            onChange={() => setMode("you")}
          />
          <span>You (creator)</span>
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="radio"
            value="multiple"
            checked={mode === "multiple"}
            onChange={() => setMode("multiple")}
          />
          <span>Multiple people</span>
        </label>
      </div>

      {mode === "multiple" && (
        <div className="ml-4 border p-2 rounded">
          {payers.map((p) => (
            <div key={p.userId} className="flex items-center gap-2 mb-2">
              <span className="text-sm">{p.userId}</span>
              <input
                type="number"
                className="border p-1 w-[80px] rounded"
                value={p.paidAmount}
                onChange={(e) => handlePaidAmountChange(p.userId, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PayerPanel;
