import React, { useState, useEffect } from "react";
import axios from "axios";


// -------------- HELPER FUNCTIONS --------------

// (A) Build a map of how much each user paid
function getPaidMap(payerMode, payers, myUserId, amount) {
  const paidMap = {};

  if (payerMode === "multiple") {
    // e.g. [ { userId: "abc", paidAmount: 20 }, { userId: "xyz", paidAmount: 30 } ]
    payers.forEach((p) => {
      paidMap[p.userId] = p.paidAmount;
    });
  } else if (payerMode === "you") {
    paidMap[myUserId] = amount;
  } else {
    // payerMode is some friend’s userId
    paidMap[payerMode] = amount;
  }

  return paidMap;
}





function getMyNet(participants, payers, myUserId, amount, splitMethod, items) {
  // 1) Who paid
  const paidMap = getPaidMap(splitMethod === "multiple" ? "multiple" : "you", payers, myUserId, amount);
  // But you actually have payerMode, so do:
  // const paidMap = getPaidMap(payerMode, payers, myUserId, amount);

  // 2) Who owes
  const owedMap = computeOwedMap(participants, amount, splitMethod, { items });

  // 3) My net
  const paid = paidMap[myUserId] || 0;
  const owes = owedMap[myUserId] || 0;
  return paid - owes;
}


// (B) computeOwedMap uses new approach
function computeOwedMap(participants, amount, splitMethod, { items }) {
  switch (splitMethod) {
    case "EQUALLY":
      return computeOwedEqually(participants, amount);
    case "PERCENTAGE":
      return computeOwedPercentage(participants, amount);
    case "EXACT_AMOUNTS":
      return computeOwedExact(participants);
    case "SHARES":
      return computeOwedShares(participants, amount);
    case "ITEMIZED":
      return computeOwedItemized(participants, items);
    default:
      return {};
  }
}

function computeOwedEqually(participants, amount) {
  const count = participants.length;
  const each = count > 0 ? amount / count : 0;
  const owedMap = {};
  participants.forEach((p) => {
    owedMap[p.id] = each;
  });
  return owedMap;
}
  
  
// Then, for computeOwedPercentage:
function computeOwedPercentage(participants, amount) {
  const owedMap = {};
  let totalPct = 0;
  participants.forEach((p) => {
    totalPct += (p.percent || 0);
  });
  // optionally check if totalPct ~ 100
  // For example, log a warning if totalPct isn't ~100
  if (Math.abs(totalPct - 100) > 0.001) {
    console.warn(`Percent sum is ${totalPct}, expected 100`);
  }

  participants.forEach((p) => {
    const pct = p.percent || 0;
    owedMap[p.id] = (pct / 100) * amount;
  });
  return owedMap;
}
  
function computeOwedExact(participants) {
  const owedMap = {};
  participants.forEach((p) => {
    owedMap[p.id] = p.exact || 0;
  });
  return owedMap;
}
  
function computeOwedShares(participants, amount) {
  const owedMap = {};
  let totalShares = 0;
  participants.forEach((p) => {
    totalShares += (p.shares || 0);
  });
  participants.forEach((p) => {
    const s = p.shares || 0;
    owedMap[p.id] = totalShares > 0 ? (s / totalShares) * amount : 0;
  });
  return owedMap;
}

// (B5) Itemized
// items = [ { name:"Pizza", amount:15, userShares:{ "abc":0.5, "xyz":0.5 } }, ... ]
function computeOwedItemized(participants, items) {
  const owedMap = {};
  participants.forEach((p) => {
    owedMap[p.id] = 0;
  });

  items.forEach((item) => {
    // e.g. item.userShares = { "abc":0.5, "xyz":0.5 }
    Object.entries(item.userShares).forEach(([uid, fraction]) => {
      if (owedMap[uid] != null) {
        owedMap[uid] += item.amount * fraction;
      }
    });
  });
  return owedMap;
}

function updateComputedParticipants(
  prevParticipants,
  payerMode,
  payers,
  myUserId,
  amount,
  splitMethod,
  items
) {
  // 1) Build paidMap & owedMap
  const paidMap = getPaidMap(payerMode, payers, myUserId, amount);
  const owedMap = computeOwedMap(prevParticipants, amount, splitMethod, { items });

  // 2) Create a new array with updated computed fields
  const newArray = prevParticipants.map((p) => {
    const paid = paidMap[p.id] || 0;
    const owes = owedMap[p.id] || 0;
    const net = paid - owes;
    return {
      ...p,
      paid,
      owes,
      net,
    };
  });

  return newArray;
}


function shallowCheckComputedFields(oldArray, newArray) {
  if (oldArray.length !== newArray.length) return false;
  for (let i = 0; i < oldArray.length; i++) {
    const oldP = oldArray[i];
    const newP = newArray[i];
    if (oldP.id !== newP.id) return false; // different user
    // Compare only the computed fields
    if (
      oldP.paid !== newP.paid ||
      oldP.owes !== newP.owes ||
      oldP.net !== newP.net
    ) {
      return false;
    }
  }
  return true; // everything matches
}



function AddExpenseModal({ onClose, onSave }) {
  const token = localStorage.getItem("splitzyToken");
  const myUserId = localStorage.getItem("myUserId");
  const myRealName = localStorage.getItem("myUserName") || "You"; // Fetch real name from localStorage

  // --------------------------
  // 1) Participants & Search
  // --------------------------
  const [participants, setParticipants] = useState([
    { id: myUserId, 
      name: "You",
      percent: 0,     // only used if splitMethod = "PERCENTAGE"
      exact: 0,       // only used if splitMethod = "EXACT_AMOUNTS"
      shares: 0,       // only used if splitMethod = "SHARES"
      // computed fields:
      paid: 0,
      owes: 0,
      net: 0

    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const handleSearchChange = async (e) => {
    const val = e.target.value;
    setSearchTerm(val);

    if (val.length >= 3) {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_URL}/search/friends?q=${val}&userId=${myUserId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log(res.data)
        setSearchResults(res.data);
      } catch (err) {
        console.error("Search error:", err);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectFriend = (user) => {
    // 1) Check if the user object has a real ID
    if (!user.id) {
      console.warn("Friend object has no 'id' field!", user);
      return; // skip if we can't add a user with no ID
    }
  
    // 2) Check if already in participants
    if (!participants.find((p) => p.id === user.id)) {
      console.log("Adding participant with id =", user.id);

      setParticipants([
        ...participants,
        {
          // We store the real ID from the search results
          id: user.id,
          name: user.name,   // or user.email, etc.
          percent: 0,
          exact: 0,
          shares: 0,
          paid: 0,
          owes: 0,
          net: 0,
        },
      ]);
    }
    setSearchTerm("");
    setSearchResults([]);
  };

  const handleRemoveParticipant = (userId) => {
    if (userId === myUserId) return; // don’t remove "You"
    setParticipants(participants.filter((p) => p.id !== userId));
  };

  // --------------------------
  // 2) Basic Expense Fields
  // --------------------------
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [group, setGroup] = useState("");

  // --------------------------
  // 3) Payer Info
  //    mode: "you", "multiple", or a specific userId
  // --------------------------
  const [payerMode, setPayerMode] = useState("you");
  const [payers, setPayers] = useState([]); // only used if multiple

  useEffect(() => {
    if (payerMode === "multiple") {
      if (payers.length === 0) {
        const defaultPayers = participants.map((p) => ({
          userId: p.id,
          payerName: p.name,
          paidAmount: 0,
        }));
        setPayers(defaultPayers);
      }
    } else {
      setPayers([]);
    }
    // eslint-disable-next-line
  }, [payerMode, participants]);

  const handlePaidAmountChange = (userId, val) => {
    setPayers((prev) =>
      prev.map((p) =>
        p.userId === userId
          ? { ...p, paidAmount: parseFloat(val) || 0 }
          : p
      )
    );
  };

  // --------------------------
  // 4) Split Method & Fields
  // --------------------------
  const [splitMethod, setSplitMethod] = useState("EQUALLY");

  // For ITEMIZED
  const [items, setItems] = useState([]);
  const [itemName, setItemName] = useState("");
  const [itemCost, setItemCost] = useState("");
  const [itemUserShares, setItemUserShares] = useState({});

  const handleAddItem = () => {
    const newItem = {
      name: itemName,
      amount: parseFloat(itemCost) || 0,
      userShares: itemUserShares,
    };
    setItems([...items, newItem]);
    setItemName("");
    setItemCost("");
    setItemUserShares({});
  };

  // For PERCENTAGE, EXACT_AMOUNTS, SHARES
  //const [userPercentMap, setUserPercentMap] = useState({});
  //const [exactAmountsMap, setExactAmountsMap] = useState({});
  //const [sharesMap, setSharesMap] = useState({});

  // --------------------------
  // 5) "Card 2" panel content
  //    Could be "payer" or "split"
  // --------------------------
  const [panelType, setPanelType] = useState(null); 
  // e.g. null | "payer" | "split"

  // If user clicks "Paid by X"
  const openPayerPanel = () => setPanelType("payer");
  // If user clicks "split equally"
  const openSplitPanel = () => setPanelType("split");
  // close card 2
  const closeRightCard = () => setPanelType(null);

    // --------------------------
  // useEffect for auto-compute
  // --------------------------
  useEffect(() => {
    console.log("Before computing:", participants);
    setParticipants((prev) => {
      const updated = updateComputedParticipants(
        prev,
        payerMode,
        payers,
        myUserId,
        amount,
        splitMethod,
        items

      );
      console.log("Updated computed participants:", updated);
      if (shallowCheckComputedFields(prev, updated)) {
        return prev; // no changes => avoid re-render loop
      } else {
        return updated;
      }
    });
  }, [participants, payers, amount, splitMethod, items, payerMode, myUserId]);




  // --------------------------
  // 6) Construct final data & save
  // --------------------------
  const handleSave = () => {
    console.log("Final participants before saving:", participants);

    const finalData = {
      participants: participants.map(p => ({ ...p, userId: p.id })),
      description,
      amount,
      date,
      notes,
      group,
      payerInfo: {
        mode: payerMode,
        payers:
          payerMode === "multiple"
            ? payers
            : [
                {
                  userId: payerMode === "you" ? myUserId : payerMode,
                  payerName:
                    payerMode === "you"
                      ? myRealName // <-- use real user name from localStorage
                      : participants.find((p) => p.id === payerMode)?.name || "Unknown",
                  paidAmount: amount,
                },
              ],
      },
      splitMethod,
      items,
    };    
    onSave(finalData);
  };

  // --------------------------
  // 7) Display strings
  // --------------------------
  let payerText = "you";
  if (payerMode === "multiple") payerText = "multiple people";
  else if (payerMode !== "you") {
    const found = participants.find((p) => p.id === payerMode);
    payerText = found ? found.name : "someone";
  }

  let splitText = "equally";
  if (splitMethod === "PERCENTAGE") splitText = "by %";
  if (splitMethod === "EXACT_AMOUNTS") splitText = "exact amounts";
  if (splitMethod === "SHARES") splitText = "shares";
  if (splitMethod === "ITEMIZED") splitText = "itemized";

  // 1) Call your new helper
  const myNet = getMyNet(participants, payers, myUserId, amount, splitMethod, items);

  // 2) Decide which message to show
  let userMessage = "";
  if (myNet > 0) {
    userMessage = `You get $${myNet.toFixed(2)}`;
  } else if (myNet < 0) {
    userMessage = `You owe $${Math.abs(myNet).toFixed(2)}`;
  } else {
    userMessage = "You are settled";
  }


  function handleChangeSplitMethod(newMethod) {
    // 1) Update the splitMethod
    setSplitMethod(newMethod);
  
    // 2) Reset unused fields for each participant
    setParticipants((prev) =>
      prev.map((p) => {
        const updated = { ...p };
  
        if (newMethod === "PERCENTAGE") {
          // Keep p.percent, reset p.shares, p.exact
          updated.shares = 0;
          updated.exact = 0;
        } else if (newMethod === "SHARES") {
          // Keep p.shares, reset p.percent, p.exact
          updated.percent = 0;
          updated.exact = 0;
        } else if (newMethod === "EXACT_AMOUNTS") {
          // Keep p.exact, reset p.percent, p.shares
          updated.percent = 0;
          updated.shares = 0;
        } else if (newMethod === "ITEMIZED") {
          // Typically itemized doesn't need .percent/.shares/.exact
          updated.percent = 0;
          updated.shares = 0;
          updated.exact = 0;
        } else {
          // If "EQUALLY" or default, zero them all
          updated.percent = 0;
          updated.shares = 0;
          updated.exact = 0;
        }
  
        return updated;
      })
    );
  }
  
  // --------------------------
  // 8) Render
  //    We'll show two separate "cards" in a flex container
  // --------------------------
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center min-h-screen">
      {/* Flex container: each "card" is a separate floating box */}
      <div className="flex flex-wrap items-center justify-center gap-8 min-h-screen">
        {/* CARD 1: Main "Add an expense" */}
        <div className="bg-white w-[320px] rounded-lg shadow relative">
          {/* Green header */}
          <div className="bg-green-500 text-white px-4 py-3 rounded-t-lg">
            <h2 className="text-lg font-semibold">Add an expense</h2>
            <button
              className="absolute top-3 right-3 text-white text-2xl"
              onClick={onClose}
            >
              &times;
            </button>
          </div>

          {/* Body */}
          <div className="p-4">
            {/* "With you" + search */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                With you
              </label>
              <input
                type="text"
                className="border p-1 rounded w-full text-sm mb-2"
                placeholder="Search friends (3+ chars)"
                value={searchTerm}
                onChange={handleSearchChange}
              />
              {searchResults.length > 0 && (
                <div className="border bg-white shadow rounded mb-2">
                  {searchResults.map((u) => (
                    <div
                      key={u.id}
                      className="p-2 cursor-pointer hover:bg-gray-100 text-sm"
                      onClick={() => handleSelectFriend(u)}
                    >
                      {u.name} ({u.email})
                    </div>
                  ))}
                </div>
              )}

              {/* Participant chips */}
              <div className="flex flex-wrap gap-2">
                {participants.map((p) => (
                  <div
                    key={p.id}
                    className="bg-gray-200 rounded-full px-3 py-1 flex items-center"
                  >
                    <span className="mr-2 text-sm">
                      {p.name || p.email || p.id}
                    </span>
                    {p.id !== myUserId && (
                      <button
                        className="text-sm text-gray-600 hover:text-red-500"
                        onClick={() => handleRemoveParticipant(p.id)}
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <input
                type="text"
                className="border w-full p-2 rounded text-sm"
                placeholder="e.g. Dinner at Applebee's"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Amount */}
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Amount
              </label>
              <input
                type="number"
                step="0.01"
                className="border w-full p-2 rounded text-sm"
                placeholder="0.00"
                value={amount || ""}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
            <p className="text-center text-xl font-bold text-gray-700 mb-2">
              ${amount.toFixed(2)}
            </p>

            {/* "Paid by X, split Y" */}
            <div className="text-sm text-gray-600 mb-2 text-center">
              Paid by{" "}
              <span
                className="font-semibold text-blue-500 cursor-pointer"
                onClick={openPayerPanel}
              >
                {payerText}
              </span>
              , split{" "}
              <span
                className="font-semibold text-green-500 cursor-pointer"
                onClick={openSplitPanel}
              >
                {splitText}
              </span>
            </div>

            <div className="text-center text-xs font-medium mb-2">
              {userMessage}
            </div>

      
            {/* Date & Notes */}
            <div className="flex justify-between mb-2">
              <button
                onClick={() => {
                  const newDate = prompt("Enter date (YYYY-MM-DD)", date);
                  if (newDate !== null) setDate(newDate);
                }}
                className="px-3 py-1 bg-gray-100 text-sm rounded"
              >
                {date || "Select date"}
              </button>
              <button
                onClick={() => {
                  const newNotes = prompt("Enter notes", notes);
                  if (newNotes !== null) setNotes(newNotes);
                }}
                className="px-3 py-1 bg-gray-100 text-sm rounded"
              >
                {notes ? "Edit notes" : "Add notes"}
              </button>
            </div>

            {/* Group */}
            <button
              onClick={() => {
                const newGroup = prompt("Enter group name (optional)", group);
                if (newGroup !== null) setGroup(newGroup);
              }}
              className="w-full py-2 bg-gray-100 text-gray-600 text-sm rounded mb-4"
            >
              {group ? group : "No group"}
            </button>

            {/* Footer */}
            <div className="text-right">
              <button
                className="px-4 py-2 rounded border mr-2 hover:bg-gray-100"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-green-500 text-white hover:bg-green-600"
                onClick={handleSave}
              >
                Save
              </button>
            </div>
          </div>
        </div>

        {/* CARD 2: Either "Choose payer" or "Split options" */}
        {panelType && (
          <div className="bg-white w-[320px] rounded-lg shadow relative">
            <div className="bg-green-500 text-white px-4 py-3 rounded-t-lg">
              {panelType === "payer" ? (
                <h3 className="text-sm font-semibold">Who paid?</h3>
              ) : (
                <h3 className="text-sm font-semibold">Split options</h3>
              )}
              <button
                className="absolute top-3 right-3 text-white text-2xl"
                onClick={closeRightCard}
              >
                &times;
              </button>
            </div>

            <div className="p-4 text-sm text-gray-700">
              {/* If we are in "payer" panel */}
              {panelType === "payer" && (
                <>
                  {participants.map((p) => (
                    <label key={p.id} className="flex items-center mb-2">
                      <input
                        type="radio"
                        name="payer"
                        className="mr-2"
                        checked={payerMode === p.id}
                        onChange={() => setPayerMode(p.id)}
                      />
                      <span>{p.name || p.id}</span>
                    </label>
                  ))}
                  {/* Multiple */}
                  <label className="flex items-center mb-2">
                    <input
                      type="radio"
                      name="payer"
                      className="mr-2"
                      checked={payerMode === "multiple"}
                      onChange={() => setPayerMode("multiple")}
                    />
                    <span>Multiple people</span>
                  </label>

                  {payerMode === "multiple" && (
                    <div className="border rounded p-2">
                      {payers.map((payr) => {
                        const partObj = participants.find(
                          (pp) => pp.id === payr.userId
                        );
                        return (
                          <div
                            key={payr.userId}
                            className="flex items-center mb-1"
                          >
                            <span className="w-1/2 text-sm">
                              {partObj ? partObj.name : payr.userId}
                            </span>
                            <input
                              type="number"
                              className="border p-1 w-1/2 rounded"
                              value={payr.paidAmount}
                              onChange={(e) =>
                                handlePaidAmountChange(
                                  payr.userId,
                                  e.target.value
                                )
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* If we are in "split" panel */}
              {panelType === "split" && (
                <>
                  {/* Buttons to pick a method */}
                  <div className="space-y-2 mb-3">
                    {["EQUALLY", "PERCENTAGE", "EXACT_AMOUNTS", "SHARES", "ITEMIZED"].map(
                      (method) => (
                        <button
                          key={method}
                          className={`w-full py-2 rounded ${
                            splitMethod === method
                              ? "bg-green-500 text-white"
                              : "bg-gray-100 text-gray-600"
                          }`}
                          onClick={() => handleChangeSplitMethod(method)}
                        >
                          {method === "EQUALLY" && "Split equally"}
                          {method === "PERCENTAGE" && "Percentage"}
                          {method === "EXACT_AMOUNTS" && "Exact amounts"}
                          {method === "SHARES" && "Shares"}
                          {method === "ITEMIZED" && "Itemized"}
                        </button>
                      )
                    )}
                  </div>

                  {/* Conditionally render advanced inputs */}
                  {splitMethod === "EQUALLY" && (
                    <div className="text-gray-600 mb-2">
                      Everyone splits the total equally.
                    </div>
                  )}

                  {splitMethod === "PERCENTAGE" && (
                    <div className="border p-2 rounded mb-2">
                      <p className="text-xs mb-2">
                        Assign % to each participant (sum = 100)
                      </p>
                      {participants.map((p, idx) => (
                        <div key={p.id} className="flex items-center mb-1">
                          <span className="w-1/2 text-sm">
                            {p.name || p.id}
                          </span>
                          <input
                            type="number"
                            className="border p-1 w-1/2 rounded"
                            placeholder="0"
                            value={p.percent || ""}
                            onChange={(e) => {
                              const newVal = parseFloat(e.target.value) || 0;
                              // update that participant’s .percent
                              setParticipants((prev) =>
                                prev.map((part, i) =>
                                  i === idx ? { ...part, percent: newVal } : part
                                )
                              );
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {splitMethod === "EXACT_AMOUNTS" && (
                    <div className="border p-2 rounded mb-2">
                      <p className="text-xs mb-2">
                        Enter exact amounts (sum must match total)
                      </p>
                      {participants.map((p, idx) => (
                        <div key={p.id} className="flex items-center mb-1">
                          <span className="w-1/2 text-sm">
                            {p.name || p.id}
                          </span>
                          <input
                            type="number"
                            className="border p-1 w-1/2 rounded"
                            placeholder="0"
                            value={p.exact || ""}
                            onChange={(e) => {
                              const newVal = parseFloat(e.target.value) || 0;
                              setParticipants((prev) =>
                                prev.map((part, i) =>
                                  i === idx ? { ...part, exact: newVal } : part
                                )
                              );
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {splitMethod === "SHARES" && (
                    <div className="border p-2 rounded mb-2">
                      <p className="text-xs mb-2">
                        Assign # of shares to each participant
                      </p>
                      {participants.map((p, idx) => (
                        <div key={p.id} className="flex items-center mb-1">
                          <span className="w-1/2 text-sm">{p.name || p.id}</span>
                          <input
                            type="number"
                            className="border p-1 w-1/2 rounded"
                            placeholder="0"
                            value={p.shares || ""}
                            onChange={(e) => {
                              const newVal = parseInt(e.target.value) || 0;
                              setParticipants((prev) =>
                                prev.map((part, i) =>
                                  i === idx ? { ...part, shares: newVal } : part
                                )
                              );
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {splitMethod === "ITEMIZED" && (
                    <div className="border p-2 rounded mb-2">
                      <p className="text-xs mb-2">
                        Add items, cost, & user shares
                      </p>
                      {/* Add new item */}
                      <div className="mb-2">
                        <input
                          type="text"
                          className="border p-1 w-full rounded mb-1"
                          placeholder="Item name"
                          value={itemName}
                          onChange={(e) => setItemName(e.target.value)}
                        />
                        <input
                          type="number"
                          className="border p-1 w-full rounded mb-1"
                          placeholder="Cost"
                          value={itemCost}
                          onChange={(e) => setItemCost(e.target.value)}
                        />
                        <textarea
                          className="border p-1 w-full rounded text-xs"
                          rows={2}
                          placeholder='{"abc123":0.5, "xyz456":0.5}'
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              setItemUserShares(parsed);
                            } catch {
                              // ignore parse errors
                            }
                          }}
                        />
                        <button
                          onClick={handleAddItem}
                          className="mt-1 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                        >
                          Add Item
                        </button>
                      </div>

                      {/* List existing items */}
                      <ul className="text-xs">
                        {items.map((it, idx) => (
                          <li key={idx} className="mb-1">
                            {it.name} - ${it.amount} - shares:{" "}
                            {JSON.stringify(it.userShares)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AddExpenseModal;
