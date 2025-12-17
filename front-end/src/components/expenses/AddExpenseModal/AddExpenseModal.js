import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaBalanceScale, FaPercent, FaDollarSign, FaShareAlt, FaListUl } from "react-icons/fa";



// -------------- HELPER FUNCTIONS --------------

function getPaidMap(payerMode, payers, myUserId, amount) {
  const paidMap = {};
  if (payers && payers.length > 0) {
    // Use the actual paid amounts from the payers array.
    payers.forEach((p) => {
      paidMap[p.userId] = p.paidAmount;
    });
  } else {
    // Fallback to current behavior.
    if (payerMode === "you") {
      paidMap[myUserId] = amount;
    } else {
      paidMap[payerMode] = amount;
    }
  }
  return paidMap;
}



function computeOwedTwoPerson(participants, amount, myUserId, fullOwe) {
  const owedMap = {};
  if (participants.length === 2) {
    if (fullOwe === "you") {
      // Creator owes full: assign the full amount to creator,
      // so creator's owed is amount and friend's owed is 0.
      participants.forEach((p) => {
        owedMap[p.id] = p.id === myUserId ? amount : 0;
      });
    } else {
      // fullOwe === "other": friend owes full:
      // assign 0 to creator and amount to friend.
      participants.forEach((p) => {
        owedMap[p.id] = p.id === myUserId ? 0 : amount;
      });
    }
  }
  return owedMap;
}





function getMyNet(participants, payerMode, payers, myUserId, amount, splitMethod, items, taxRate, tipRate, fullOwe) {
  // 1) Who paid
  const paidMap = getPaidMap(payerMode, payers, myUserId, amount);
  // But you actually have payerMode, so do:
  // const paidMap = getPaidMap(payerMode, payers, myUserId, amount);

  // 2) Who owes
  const owedMap = computeOwedMap(participants, amount, splitMethod, { items, taxRate, tipRate, myUserId, payerMode, fullOwe});

  // 3) My net
  const paid = paidMap[myUserId] || 0;
  const owes = owedMap[myUserId] || 0;
  return paid - owes;
}


// (B) computeOwedMap uses new approach
function computeOwedMap(participants, amount, splitMethod, { items, taxRate, tipRate,  myUserId, fullOwe  }) {
  switch (splitMethod) {
    case "EQUALLY":
      return computeOwedEqually(participants, amount);
    case "PERCENTAGE":
      return computeOwedPercentage(participants, amount);
    case "TWO_PERSON":
      return computeOwedTwoPerson(participants, amount, myUserId, fullOwe);
    case "EXACT_AMOUNTS":
      return computeOwedExact(participants);
    case "SHARES":
      return computeOwedShares(participants, amount);
    case "ITEMIZED":
      return computeOwedItemized(participants, items, taxRate, tipRate);
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
function computeOwedItemized(participants, items, taxRate, tipRate) {
  const owedMap = {};
  
  // Initialize owedMap
  participants.forEach((p) => {
      owedMap[p.id] = 0;
  });

  // Calculate base item amounts
  const subtotal = items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  items.forEach((item) => {
      const itemAmount = parseFloat(item.amount) || 0;
      const totalSharesForItem = Object.values(item.userShares).reduce((sum, share) => sum + share, 0);
      
      Object.entries(item.userShares).forEach(([uid, fraction]) => {
          if (owedMap[uid] != null && totalSharesForItem > 0) {
              owedMap[uid] += itemAmount * (fraction / totalSharesForItem);
          }
      });
  });

  // Calculate tax and tip amounts
  const taxAmount = subtotal * (taxRate / 100);
  const tipAmount = (subtotal + taxAmount) * (tipRate / 100);
  const extraAmount = taxAmount + tipAmount;
  
  // Distribute tax and tip equally
  const extraPerPerson = extraAmount / participants.length;
  participants.forEach((p) => {
      owedMap[p.id] += extraPerPerson;
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
  items,
  taxRate,
  tipRate,
  fullOwe
) {
  // 1) Build paidMap & owedMap
  const paidMap = getPaidMap(payerMode, payers, myUserId, amount);
  const owedMap = computeOwedMap(prevParticipants, amount, splitMethod, { items, taxRate, tipRate, myUserId, payerMode, fullOwe});

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

  const [taxRate, setTaxRate] = useState(0);
  const [tipRate, setTipRate] = useState(0);
  const [splitError, setSplitError] = useState("");
  const [fullOwe, setFullOwe] = useState("you"); // "you" means creator owes full; "other" means the other participant owes full
  const [isPersonal, setIsPersonal] = useState(false); // Personal expense - not shared with others


    // --------------------------
  // 2) Basic Expense Fields
  // --------------------------
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  // At the top of your AddExpenseModal.js (inside your component)
  const [availableGroups, setAvailableGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);

  // Category options with icons
  const CATEGORIES = [
    { key: "general", label: "General", icon: "💰" },
    { key: "food", label: "Food & Dining", icon: "🍽️" },
    { key: "groceries", label: "Groceries", icon: "🛒" },
    { key: "transport", label: "Transport", icon: "🚗" },
    { key: "entertainment", label: "Entertainment", icon: "🎬" },
    { key: "shopping", label: "Shopping", icon: "🛍️" },
    { key: "travel", label: "Travel", icon: "✈️" },
    { key: "utilities", label: "Utilities", icon: "💡" },
    { key: "rent", label: "Rent", icon: "🏠" },
    { key: "healthcare", label: "Healthcare", icon: "🏥" },
    { key: "education", label: "Education", icon: "📚" },
    { key: "subscriptions", label: "Subscriptions", icon: "📱" },
    { key: "gifts", label: "Gifts", icon: "🎁" },
    { key: "sports", label: "Sports & Fitness", icon: "⚽" },
    { key: "pets", label: "Pets", icon: "🐾" },
    { key: "coffee", label: "Coffee & Drinks", icon: "☕" },
    { key: "games", label: "Games", icon: "🎮" },
    { key: "music", label: "Music & Events", icon: "🎵" },
    { key: "other", label: "Other", icon: "📝" },
  ];

  const selectedCategory = CATEGORIES.find(c => c.key === category) || CATEGORIES[0];

  useEffect(() => {
    // Fetch groups for the current user
    axios
      .get(`${process.env.REACT_APP_API_URL}/groups/${myUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setAvailableGroups(res.data);
      })
      .catch((err) => {
        console.error("Error fetching groups", err);
      });
  }, [myUserId, token]);


  // --------------------------
  // 3) Payer Info
  //    mode: "you", "multiple", or a specific userId
  // --------------------------
  const [payerMode, setPayerMode] = useState("you");
  const [payers, setPayers] = useState([]); // only used if multiple



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

  const [items, setItems] = useState([]);


  const defaultItem = useCallback(() => ({
      name: "",
      amount: 0,
      userShares: participants.reduce((acc, p) => {
        acc[p.id] = 1;
        return acc;
      }, {}),
    }),
    [participants]
  );

  const itemSubtotal = useMemo(
    () => items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0),
    [items]
  );
  const itemTax = useMemo(() => itemSubtotal * (taxRate / 100), [itemSubtotal, taxRate]);
  const itemTip = useMemo(
    () => (itemSubtotal + itemTax) * (tipRate / 100),
    [itemSubtotal, itemTax, tipRate]
  );
  const itemGrandTotal = useMemo(
    () => itemSubtotal + itemTax + itemTip,
    [itemSubtotal, itemTax, itemTip]
  );


  const handleItemRowChange = (index, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: field === "amount" ? Math.max(0, parseFloat(value) || 0) : value,
      };
      return next;
    });
  };

  const handleItemUserShareChange = (itemIndex, userId, value) => {
    const numVal = parseFloat(value);
    setItems((prev) => {
      const next = [...prev];
      const shareMap = { ...(next[itemIndex].userShares || {}) };
      shareMap[userId] = isNaN(numVal) ? 0 : Math.max(0, numVal);
      next[itemIndex] = { ...next[itemIndex], userShares: shareMap };
      return next;
    });
  };

  const handleAddItemRow = () => {
    setItems((prev) => [...prev, defaultItem()]);
  };

  const handleRemoveItemRow = (index) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };
  

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



  useEffect(() => {
    if (payerMode === "multiple") {
      const updatedPayers = participants.map((p) => {
        // Try to preserve any already-entered paid amount if the payer is already there
        const existing = payers.find((payer) => payer.userId === p.id);
        return {
          userId: p.id,
          payerName: p.name,
          paidAmount: existing ? existing.paidAmount : 0,
        };
      });
      const hasChange =
        updatedPayers.length !== payers.length ||
        updatedPayers.some((u, idx) => {
          const curr = payers[idx];
          return !curr || u.userId !== curr.userId || u.paidAmount !== curr.paidAmount;
        });
      if (hasChange) {
        setPayers(updatedPayers);
      }
    }
  }, [payerMode, participants, payers]);
  

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

  // Ensure at least one item row when switching to itemized
  useEffect(() => {
    if (splitMethod === "ITEMIZED" && items.length === 0) {
      setItems([defaultItem()]);
    }
  }, [splitMethod, items.length, defaultItem]);

  // Sync amount with itemized totals when in itemized mode
  useEffect(() => {
    if (splitMethod === "ITEMIZED") {
      setAmount(itemGrandTotal);
    }
  }, [splitMethod, itemGrandTotal, setAmount]);

  // For ITEMIZED
  //const [items, setItems] = useState([]);
  //const [itemName, setItemName] = useState("");
  //const [itemCost, setItemCost] = useState("");
  //const [itemUserShares, setItemUserShares] = useState({});

  /*const handleAddItem = () => {
    const newItem = {
      name: itemName,
      amount: parseFloat(itemCost) || 0,
      userShares: itemUserShares,
    };
    setItems([...items, newItem]);
    setItemName("");
    setItemCost("");
    setItemUserShares({});
  };*/

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
  const inlinePanelRef = useRef(null);

  // If user clicks "Paid by X"
  const openPayerPanel = () => setPanelType("payer");
  // If user clicks "split equally"
  const openSplitPanel = () => setPanelType("split");
  // Close inline panel when clicking outside
  useEffect(() => {
    if (!panelType) return;
    const handleClickOutside = (e) => {
      if (inlinePanelRef.current && !inlinePanelRef.current.contains(e.target)) {
        setPanelType(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [panelType]);

  const computedParticipants = useMemo(() => {
    return updateComputedParticipants(participants, payerMode, payers, myUserId, amount, splitMethod, items, taxRate, tipRate, fullOwe);
  }, [participants, payerMode, payers, myUserId, amount, splitMethod, items, taxRate, tipRate, fullOwe]);

  // 1) Call your new helper
  const myNet = useMemo(() => {
    return getMyNet(
      computedParticipants,   // Use the computedParticipants rather than raw participants
      payerMode,
      payers,
      myUserId,
      amount,
      splitMethod,
      items,
      taxRate,
      tipRate,
      fullOwe
    );
  }, [computedParticipants, payerMode, payers, myUserId, amount, splitMethod, items, taxRate, tipRate, fullOwe]);
  

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
        items,
        taxRate,
        tipRate,
        fullOwe
      );
      // Log the computation details for debugging
      console.log('Computing with:', {
        payerMode,
        payers: payers.map(p => ({ ...p })),
        splitMethod,
        amount,
        participantsPercents: prev.map(p => ({ 
          id: p.id, 
          name: p.name, 
          percent: p.percent 
        }))
      });
      
      if (shallowCheckComputedFields(prev, updated)) {
        return prev;
      }
      return updated;
    });
  }, [participants, payers, amount, splitMethod, items, payerMode, myUserId, taxRate, tipRate, myNet, fullOwe]);
  



  


  // --------------------------
  // 6) Construct final data & save
  // --------------------------
  const validateSplit = () => {
    if (splitMethod === "PERCENTAGE") {
      const totalPct = participants.reduce((sum, p) => sum + (p.percent || 0), 0);
      if (totalPct <= 0) return "Percentages must be greater than 0.";
      if (Math.abs(totalPct - 100) > 0.01) return "Percentages must sum to 100%.";
    }
    if (splitMethod === "EXACT_AMOUNTS") {
      const totalExact = participants.reduce((sum, p) => sum + (p.exact || 0), 0);
      if (totalExact <= 0) return "Exact amounts must be greater than 0.";
      if (Math.abs(totalExact - amount) > 0.01) return "Exact amounts must total the expense.";
    }
    if (splitMethod === "SHARES") {
      const totalShares = participants.reduce((sum, p) => sum + (p.shares || 0), 0);
      if (totalShares <= 0) return "Shares must sum to more than 0.";
    }
    if (splitMethod === "ITEMIZED") {
      if (itemGrandTotal <= 0) return "Add at least one item with cost.";
    }
    return "";
  };

  const handleSave = () => {
    const err = validateSplit();
    if (err) {
      setSplitError(err);
      setPanelType("split");
      return;
    }
    setSplitError("");
    console.log("Final participants before saving:", participants);

    let finalSplitMethod = splitMethod;
    let finalPayerInfo = [];

    // If exactly two participants and we're using a two-person split, force the payer info.
    if (computedParticipants.length === 2 && splitMethod === "TWO_PERSON" && payerMode !== "multiple") {
      const creator = computedParticipants.find(p => p.id === myUserId);
      const otherParticipant = computedParticipants.find(p => p.id !== myUserId);
      if (fullOwe === "you") {
        // Creator owes full: friend is credited with what they effectively paid.
        finalPayerInfo = [
          {
            userId: otherParticipant.id,
            payerName: otherParticipant.name,
            paidAmount: otherParticipant.net, // friend’s net reflects actual contribution
          },
        ];
      } else {
        // fullOwe === "other": other participant owes full, so creator is credited.
        finalPayerInfo = [
          {
            userId: myUserId,
            payerName: myRealName,
            paidAmount: creator.net, // creator’s net reflects actual contribution
          },
        ];
      }
    } else {
      // For non-two-person splits:
      if (payerMode === "multiple") {
        finalPayerInfo = payers;
      } else {
        finalPayerInfo = [
          {
            userId: payerMode === "you" ? myUserId : payerMode,
            payerName:
              payerMode === "you"
                ? myRealName
                : computedParticipants.find((p) => p.id === payerMode)?.name || "Unknown",
            paidAmount: amount,
          },
        ];
      }
    }
      

    const finalData = {
      participants: computedParticipants.map(p => ({ ...p, userId: p.id })),
      description,
      category,
      amount,
      date,
      notes,
      group: selectedGroup,
      payerInfo: {
        mode: payerMode,
        payers:finalPayerInfo,
      },
      splitMethod: finalSplitMethod,
      items,
      taxRate,
      tipRate,
      fullOwe,
      isPersonal
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
  if (splitMethod === "PERCENTAGE") splitText = "by percentage";
  if (splitMethod === "EXACT_AMOUNTS") splitText = "exact amounts";
  if (splitMethod === "SHARES") splitText = "shares";
  if (splitMethod === "ITEMIZED") splitText = "itemized";
  

  const splitOptions = [
    { key: "EQUALLY", label: "Equally", icon: <FaBalanceScale size={24} /> },
    { key: "PERCENTAGE", label: "Percentage", icon: <FaPercent size={24} /> },
    { key: "EXACT_AMOUNTS", label: "Exact amounts", icon: <FaDollarSign size={24} /> },
    { key: "SHARES", label: "Shares", icon: <FaShareAlt size={24} /> },
    { key: "ITEMIZED", label: "Itemized", icon: <FaListUl size={24} /> },
  ];
  

  

  // 2) Decide which message to show
  // Update the message display section
  let userMessage = "";
  const participant = participants.find(p => p.id === myUserId);
  if (participant) {
    const paid = participant.paid || 0;
    const owes = participant.owes || 0;
    
    userMessage = `You ${paid > 0 ? `paid $${paid.toFixed(2)},` : ''} 
                  ${owes > 0 ? `owe $${owes.toFixed(2)},` : ''} 
                  ${myNet > 0 ? `get back $${myNet.toFixed(2)}` : 
                    myNet < 0 ? `owe $${Math.abs(myNet).toFixed(2)}` : 
                    'are settled'}`;
  }

  const summary = useMemo(() => {
    return participants.map(p => ({
      name: p.name,
      paid: p.paid.toFixed(2),
      owes: p.owes.toFixed(2),
      net: p.net.toFixed(2)
    }));
  }, [participants]);
  
  useEffect(() => {
    console.log('Transaction summary:', summary);
  }, [summary]);
  


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
  return createPortal(
    <div className="modal-overlay glass-backdrop">
      <div className="add-expense-grid">
        {/* Left Card */}
        <div className="glass-card modal-card">
          <div className="modal-top">
            <h2 className="modal-title">Create Expense</h2>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>

          {/* Personal Expense Toggle */}
          <div className="personal-expense-toggle">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={isPersonal}
                onChange={(e) => {
                  setIsPersonal(e.target.checked);
                  if (e.target.checked) {
                    // Reset to just the creator when switching to personal
                    setParticipants([{ 
                      id: myUserId, 
                      name: "You",
                      percent: 0, exact: 0, shares: 0,
                      paid: 0, owes: 0, net: 0
                    }]);
                    setPayerMode("you");
                    setSplitMethod("EQUALLY");
                    setSelectedGroup(null); // Clear group selection for personal expense
                  }
                }}
              />
              <span className="slider"></span>
            </label>
            <span className="toggle-label">
              {isPersonal ? '👤 Personal expense (just for you)' : '👥 Shared expense'}
            </span>
          </div>

          {!isPersonal && (
          <div className="form-section">
            <label className="label">With you</label>
            <div className="multi-input">
              {participants.map((p) => (
                <div key={p.id} className="pill">
                  <span>{p.name || p.email || p.id}</span>
                  {p.id !== myUserId && (
                    <button onClick={() => handleRemoveParticipant(p.id)}>×</button>
                  )}
                </div>
              ))}
              <input
                type="text"
                className="chip-input"
                placeholder="Search friends (3+ chars)"
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>
            {searchResults.length > 0 && (
              <div className="dropdown-list open">
                {searchResults.map((u) => (
                  <div
                    key={u.id}
                    className="dropdown-item"
                    onClick={() => handleSelectFriend(u)}
                  >
                    <div className="avatar-mini">{u.name?.[0] || "U"}</div>
                    <span className="tile-title">{u.name}</span>
                    <span className="tile-sub">{u.email}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Category Picker */}
          <div className="form-section">
            <label className="label">Category</label>
            <button 
              type="button"
              className="category-selector"
              onClick={() => setShowCategoryPicker(!showCategoryPicker)}
            >
              <span className="category-icon">{selectedCategory.icon}</span>
              <span className="category-label">{selectedCategory.label}</span>
              <span className="category-arrow">▼</span>
            </button>
            {showCategoryPicker && (
              <div className="category-picker">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    className={`category-option ${category === cat.key ? 'active' : ''}`}
                    onClick={() => {
                      setCategory(cat.key);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <span className="cat-icon">{cat.icon}</span>
                    <span className="cat-label">{cat.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="form-section">
            <label className="label">Description</label>
            <input
              type="text"
              className="input modern"
              placeholder="e.g. Dinner at Applebee's"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="amount-block">
            <label className="label">Amount</label>
            <input
              type="number"
              step="0.01"
              className="input modern amount-input"
              placeholder="0.00"
              value={amount || ""}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            />
            <div className="amount-meta">
              <div className="inline-text center">
                Paid by{" "}
                <span className="link inline-trigger" onClick={openPayerPanel}>{payerText}</span>, split{" "}
                <span className="link inline-trigger" onClick={openSplitPanel}>{splitText}</span>
              </div>
              <p className="hero-amount">${amount.toFixed(2)}</p>
              <div className="muted tiny center">{userMessage}</div>
            </div>
          </div>

          {panelType && (
            <div className="inline-panel glass-card" ref={inlinePanelRef}>
              <div className="modal-top">
                <h3 className="modal-title-sm">
                  {panelType === "payer" ? "Who paid?" : "Split options"}
                </h3>
              </div>

              <div className={`panel-body swap-panel ${panelType}`}>
                {panelType === "payer" && (
                  <>
                    {participants.map((p) => (
                      <label key={p.id} className="radio-tile">
                        <input
                          type="radio"
                          name="payer"
                          checked={payerMode === p.id}
                          onChange={() => setPayerMode(p.id)}
                        />
                        <span>{p.name || p.id}</span>
                      </label>
                    ))}
                    <label className="radio-tile">
                      <input
                        type="radio"
                        name="payer"
                        checked={payerMode === "multiple"}
                        onChange={() => setPayerMode("multiple")}
                      />
                      <span>Multiple people</span>
                    </label>

                    {payerMode === "multiple" && (
                      <div className="boxed">
                        {payers.map((payr) => {
                          const partObj = participants.find(
                            (pp) => pp.id === payr.userId
                          );
                          return (
                            <div key={payr.userId} className="inline-pair">
                              <span className="muted small">
                                {partObj ? partObj.name : payr.userId}
                              </span>
                              <input
                                type="number"
                                className="input compact"
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

                {panelType === "split" && (
                  <>
                    {participants.length === 2 && (
                      <div className="two-toggle">
                        <button
                          className={`chip full ${splitMethod === "TWO_PERSON" && fullOwe === "other" ? "active" : ""}`}
                          onClick={() => {
                            setSplitMethod("TWO_PERSON");
                            setFullOwe("other");
                          }}
                        >
                          They owe full
                        </button>
                        <button
                          className={`chip full ${splitMethod === "TWO_PERSON" && fullOwe === "you" ? "active" : ""}`}
                          onClick={() => {
                            setSplitMethod("TWO_PERSON");
                            setFullOwe("you");
                          }}
                        >
                          You owe full
                        </button>
                      </div>
                    )}

                    <div className="icon-row">
                      {splitOptions.map((option) => (
                        <button
                          key={option.key}
                          title={option.label}
                          className={`icon-btn ${splitMethod === option.key ? "active" : ""}`}
                          onClick={() => handleChangeSplitMethod(option.key)}
                        >
                          {option.icon}
                        </button>
                      ))}
                    </div>

                    {splitMethod === "EQUALLY" && (
                      <p className="muted small">Everyone splits the total equally.</p>
                    )}

                    {splitMethod === "PERCENTAGE" && (
                      <div className="boxed">
                        <p className="muted tiny">Assign % (sum to 100)</p>
                        {participants.map((p, idx) => (
                          <div key={p.id} className="inline-pair">
                            <span className="muted small">{p.name || p.id}</span>
                            <input
                              type="number"
                              className="input compact"
                              placeholder="0"
                              value={p.percent || ""}
                              onChange={(e) => {
                              const newVal = Math.max(0, parseFloat(e.target.value) || 0);
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
                      <div className="boxed">
                        <p className="muted tiny">Enter exact amounts (must sum to total)</p>
                        {participants.map((p, idx) => (
                          <div key={p.id} className="inline-pair">
                            <span className="muted small">{p.name || p.id}</span>
                            <input
                              type="number"
                              className="input compact"
                              placeholder="0"
                              value={p.exact || ""}
                              onChange={(e) => {
                              const newVal = Math.max(0, parseFloat(e.target.value) || 0);
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
                      <div className="boxed">
                        <p className="muted tiny">Assign shares to split the total</p>
                        {participants.map((p, idx) => (
                          <div key={p.id} className="inline-pair">
                            <span className="muted small">{p.name || p.id}</span>
                            <input
                              type="number"
                              className="input compact"
                              placeholder="0"
                              value={p.shares || ""}
                              onChange={(e) => {
                              const newVal = Math.max(0, parseFloat(e.target.value) || 0);
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
                      <div className="itemized-panel">
                        {items.map((item, idx) => (
                          <div key={idx} className="item-card">
                            <div className="item-row">
                              <input
                                type="text"
                                className="input modern"
                                placeholder="Item name"
                                value={item.name}
                                onChange={(e) => handleItemRowChange(idx, "name", e.target.value)}
                              />
                              <input
                                type="number"
                                className="input modern compact"
                                placeholder="0.00"
                                value={item.amount}
                                onChange={(e) => handleItemRowChange(idx, "amount", e.target.value)}
                              />
                              {items.length > 1 && (
                                <button
                                  type="button"
                                  className="chip ghost sm"
                                  onClick={() => handleRemoveItemRow(idx)}
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                            <div className="share-grid">
                              {participants.map((p) => (
                                <label key={p.id} className="share-chip">
                                  <span className="share-name">{p.name || p.id}</span>
                                  <input
                                    type="number"
                                    className="input compact"
                                    min="0"
                                    value={item.userShares?.[p.id] ?? 0}
                                    onChange={(e) =>
                                      handleItemUserShareChange(idx, p.id, e.target.value)
                                    }
                                  />
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}

                        <button type="button" className="ghost-link" onClick={handleAddItemRow}>
                          + Add item
                        </button>

                        <div className="tax-tip-row">
                          <div className="form-section">
                            <label className="label">Tax (%)</label>
                            <input
                              type="number"
                              className="input modern"
                              value={taxRate}
                              onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div className="form-section">
                            <label className="label">Tip (%)</label>
                            <input
                              type="number"
                              className="input modern"
                              value={tipRate}
                              onChange={(e) => setTipRate(parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </div>

                        <div className="totals-row">
                          <span>Subtotal: ${itemSubtotal.toFixed(2)}</span>
                          <span>Tax: ${itemTax.toFixed(2)}</span>
                          <span>Tip: ${itemTip.toFixed(2)}</span>
                          <span className="strong">Grand: ${itemGrandTotal.toFixed(2)}</span>
                          {splitError && <span className="error-text">{splitError}</span>}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          <div className="row-2col equal">
            <div className="form-section">
              <label className="label">Date</label>
              <DatePicker
                selected={date ? new Date(date) : null}
                onChange={(selectedDate) => {
                  if (selectedDate) {
                    setDate(selectedDate.toISOString().slice(0, 10));
                  }
                }}
                dateFormat="yyyy-MM-dd"
                placeholderText="Select date"
                className="input modern"
              />
            </div>
            {!isPersonal && (
              <div className="form-section">
                <label className="label">Group</label>
                <button
                  onClick={() => setShowGroupModal(true)}
                  className="input ghost group-select"
                >
                  {selectedGroup ? selectedGroup.groupName : "No group"}
                </button>
              </div>
            )}
          </div>

          <div className="form-section">
            <label className="label">Notes</label>
            <input
              type="text"
              className="input modern"
              placeholder="Add notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="footer-actions">
            <button className="chip ghost" onClick={onClose}>Cancel</button>
            <button className="chip primary" onClick={handleSave}>Save</button>
          </div>
        </div>

      </div>

      {showGroupModal && (
        <div className="modal-overlay glass-backdrop">
          <div className="glass-card modal-content-sm floating elevated">
            <div className="modal-header">
              <h3>Select a Group</h3>
              <button className="close-btn" onClick={() => setShowGroupModal(false)}>×</button>
            </div>
            {availableGroups && availableGroups.length > 0 ? (
              availableGroups.map((grp) => (
                <div
                  key={grp.id}
                  className="dropdown-item"
                  onClick={() => {
                    setSelectedGroup(grp);
                    setShowGroupModal(false);
                  }}
                >
                  <div className="avatar-mini">{grp.groupName?.[0] || "G"}</div>
                  <div className="tile-body">
                    <span className="tile-title">{grp.groupName}</span>
                    <span className="tile-sub">{grp.groupType || "Group"}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="muted small">No groups available.</div>
            )}
          </div>
        </div>
      )}
    </div>
  , document.body);
}

export default AddExpenseModal;
