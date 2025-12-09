// src/components/expenses/AddExpenseModal/SplitOptionsPanel.js
import React, { useState } from "react";

function SplitOptionsPanel({
  participants,
  splitMethod, setSplitMethod,
  amount, setAmount,
  description, setDescription,
  notes, setNotes,
  date, setDate,
  items, setItems,
  userPercentMap, setUserPercentMap,
  exactAmountsMap, setExactAmountsMap,
  sharesMap, setSharesMap,
}) {
  // For ITEMIZED
  const [itemName, setItemName] = useState("");
  const [itemCost, setItemCost] = useState(0);
  const [itemUserShares, setItemUserShares] = useState({});

  const handleAddItem = () => {
    const newItem = {
      name: itemName,
      amount: parseFloat(itemCost),
      userShares: itemUserShares,
    };
    setItems([...items, newItem]);
    setItemName("");
    setItemCost(0);
    setItemUserShares({});
  };

  // PERCENTAGE
  const handleAddPercentage = (userId, value) => {
    setUserPercentMap((prev) => ({
      ...prev,
      [userId]: parseFloat(value) || 0,
    }));
  };

  // EXACT AMOUNTS
  const handleAddExactAmount = (userId, value) => {
    setExactAmountsMap((prev) => ({
      ...prev,
      [userId]: parseFloat(value) || 0,
    }));
  };

  // SHARES
  const handleAddShares = (userId, value) => {
    setSharesMap((prev) => ({
      ...prev,
      [userId]: parseInt(value) || 0,
    }));
  };

  return (
    <div className="mt-4">
      <h3 className="text-base font-semibold mb-2">Split Options</h3>

      {/* Basic fields */}
      <div className="mb-2">
        <label className="block text-sm font-medium">Description</label>
        <input
          type="text"
          className="border p-1 w-full rounded"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Dinner at Applebee's"
        />
      </div>

      <div className="mb-2">
        <label className="block text-sm font-medium">Date</label>
        <input
          type="date"
          className="border p-1 w-full rounded"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="mb-2">
        <label className="block text-sm font-medium">Notes</label>
        <textarea
          className="border p-1 w-full rounded"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any extra info"
        />
      </div>

      <div className="mb-2">
        <label className="block text-sm font-medium">Amount</label>
        <input
          type="number"
          className="border p-1 w-full rounded"
          value={amount}
          onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
        />
      </div>

      <div className="mb-2">
        <label className="block text-sm font-medium">Split Method</label>
        <select
          className="border p-1 w-full rounded"
          value={splitMethod}
          onChange={(e) => setSplitMethod(e.target.value)}
        >
          <option value="EQUALLY">Equally</option>
          <option value="PERCENTAGE">Percentage</option>
          <option value="EXACT_AMOUNTS">Exact Amounts</option>
          <option value="SHARES">Shares</option>
          <option value="ITEMIZED">Itemized</option>
        </select>
      </div>

      {/* ITEMIZED UI */}
      {splitMethod === "ITEMIZED" && (
        <div className="border p-2 mb-2 rounded">
          <h4 className="font-medium mb-2">Itemized Details</h4>
          <div className="mb-2">
            <label className="block text-sm font-medium">Item Name</label>
            <input
              type="text"
              className="border p-1 w-full rounded"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
            />
          </div>
          <div className="mb-2">
            <label className="block text-sm font-medium">Cost</label>
            <input
              type="number"
              className="border p-1 w-full rounded"
              value={itemCost}
              onChange={(e) => setItemCost(e.target.value)}
            />
          </div>
          <div className="mb-2">
            <label className="block text-sm font-medium">
              User Shares (JSON) sum=1.0
            </label>
            <textarea
              rows="2"
              className="border p-1 w-full rounded"
              placeholder='e.g. {"abc123":0.5, "xyz456":0.5}'
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setItemUserShares(parsed);
                } catch {}
              }}
            />
          </div>
          <button
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={handleAddItem}
          >
            Add Item
          </button>

          <ul className="mt-2 text-sm">
            {items.map((it, idx) => (
              <li key={idx}>
                {it.name} - ${it.amount} - shares:{" "}
                {JSON.stringify(it.userShares)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* PERCENTAGE UI */}
      {splitMethod === "PERCENTAGE" && (
        <div className="border p-2 mb-2 rounded">
          <h4 className="font-medium mb-2">Percentage Split (sum to 100)</h4>
          {/* if no participants, just show a note */}
          <p className="text-sm mb-2">
            Each participant's percentage:
          </p>
          {participants.length === 0 ? (
            <p className="text-sm">No participants selected yet.</p>
          ) : (
            participants.map((part) => (
              <div key={part.id} className="flex items-center gap-2 mb-1">
                <span className="text-sm">
                  {part.name || part.email || part.id}
                </span>
                <input
                  type="number"
                  className="border p-1 w-[60px] rounded"
                  placeholder="0"
                  onChange={(e) => handleAddPercentage(part.id, e.target.value)}
                />
                <span>%</span>
              </div>
            ))
          )}
          <p className="text-xs mt-2">
            Current: {JSON.stringify(userPercentMap)}
          </p>
        </div>
      )}

      {/* EXACT_AMOUNTS UI */}
      {splitMethod === "EXACT_AMOUNTS" && (
        <div className="border p-2 mb-2 rounded">
          <h4 className="font-medium mb-2">Exact Amounts (must sum to total)</h4>
          {participants.length === 0 ? (
            <p className="text-sm">No participants selected yet.</p>
          ) : (
            participants.map((part) => (
              <div key={part.id} className="flex items-center gap-2 mb-1">
                <span className="text-sm">
                  {part.name || part.email || part.id}
                </span>
                <input
                  type="number"
                  className="border p-1 w-[60px] rounded"
                  placeholder="0"
                  onChange={(e) =>
                    handleAddExactAmount(part.id, e.target.value)
                  }
                />
              </div>
            ))
          )}
          <p className="text-xs mt-2">
            Current: {JSON.stringify(exactAmountsMap)}
          </p>
        </div>
      )}

      {/* SHARES UI */}
      {splitMethod === "SHARES" && (
        <div className="border p-2 mb-2 rounded">
          <h4 className="font-medium mb-2">Shares (sum used to split total)</h4>
          {participants.length === 0 ? (
            <p className="text-sm">No participants selected yet.</p>
          ) : (
            participants.map((part) => (
              <div key={part.id} className="flex items-center gap-2 mb-1">
                <span className="text-sm">
                  {part.name || part.email || part.id}
                </span>
                <input
                  type="number"
                  className="border p-1 w-[60px] rounded"
                  placeholder="0"
                  onChange={(e) => handleAddShares(part.id, e.target.value)}
                />
              </div>
            ))
          )}
          <p className="text-xs mt-2">Current: {JSON.stringify(sharesMap)}</p>
        </div>
      )}
    </div>
  );
}

export default SplitOptionsPanel;
