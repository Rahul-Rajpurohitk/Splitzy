import React, { useState } from "react";

function ItemizedExpenseModal({ participants, onDone, onCancel }) {

  // Add at the top (inside the component):
  const [taxRate, setTaxRate] = useState(0);
  const [tipRate, setTipRate] = useState(0);
  const [items, setItems] = useState([
    { name: "", amount: 0, userShares: {} },
  ]);

  const handleAddItem = () => {
    setItems([...items, { name: "", amount: 0, userShares: {} }]);
  };

  const handleChangeItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleUserShareChange = (itemIndex, userId, checked) => {
    const newItems = [...items];
    const userShares = { ...newItems[itemIndex].userShares };
    userShares[userId] = checked ? 1 : 0;  // Either full share or no share, can be fractional if needed
    newItems[itemIndex].userShares = userShares;
    setItems(newItems);
  };

  // Replace the calculateSubtotal & totals section with:
  const calculateSubtotal = () =>
      items.reduce((acc, item) => acc + parseFloat(item.amount || 0), 0);
  const subtotal = calculateSubtotal();
  const taxAmount = subtotal * (taxRate / 100);
  const tipAmount = (subtotal + taxAmount) * (tipRate / 100);
  const grandTotal = subtotal + taxAmount + tipAmount;
    
    // Update handleDone to send tax and tip info:
  const handleDone = () => {
      onDone({ items, taxRate, tipRate, grandTotal });
  };

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-auto p-4">
      <h2 className="text-xl font-bold mb-4">Itemized expense</h2>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left">Item</th>
            <th className="text-left">Cost</th>
            {participants.map((p) => (
              <th key={p.userId}>{p.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx}>
              <td>
                <input
                  type="text"
                  className="border p-1"
                  value={item.name}
                  onChange={(e) => handleChangeItem(idx, "name", e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  className="border p-1"
                  value={item.amount}
                  onChange={(e) => handleChangeItem(idx, "amount", e.target.value)}
                />
              </td>
              {participants.map((p) => (
                <td key={p.userId}>
                  <input
                    type="checkbox"
                    checked={item.userShares[p.userId] > 0}
                    onChange={(e) =>
                      handleUserShareChange(idx, p.userId, e.target.checked)
                    }
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
				
			<div className="mt-4">
			<label className="block text-sm">Tax (%)</label>
			<input
					type="number"
					className="border p-1"
					value={taxRate}
					onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
			/>
			</div>
			<div className="mt-4">
			<label className="block text-sm">Tip (%)</label>
			<input
					type="number"
					className="border p-1"
					value={tipRate}
					onChange={(e) => setTipRate(parseFloat(e.target.value) || 0)}
			/>
			</div>

			<div className="mt-4 font-bold">
			Subtotal: ${subtotal.toFixed(2)} <br />
			Tax: ${taxAmount.toFixed(2)} <br />
			Tip: ${tipAmount.toFixed(2)} <br />
			Grand Total: ${grandTotal.toFixed(2)}
			</div>

      <button onClick={handleAddItem} className="mt-2 px-2 py-1 bg-green-500 text-white">
        + Add Item
      </button>

      <div className="mt-4 font-bold">
        Subtotal: ${calculateSubtotal().toFixed(2)}
      </div>

      <div className="flex gap-4 mt-4">
        <button className="px-3 py-2 bg-gray-300" onClick={onCancel}>
          Cancel
        </button>
        <button className="px-3 py-2 bg-green-500 text-white" onClick={handleDone}>
          Done
        </button>
      </div>
    </div>
  );
}

export default ItemizedExpenseModal;
