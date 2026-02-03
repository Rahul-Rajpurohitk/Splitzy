import React, { useState, useMemo, useCallback } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import ExpenseCard from "./ExpenseCard";

function MonthSection({ monthKey, expenses, expandedExpenseId, onToggleExpand, myUserId, onOpenChat, defaultCollapsed = false }) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // Memoize month summary calculations - only recompute when expenses change
  const { monthTotal, expenseCount } = useMemo(() => ({
    monthTotal: expenses.reduce((sum, exp) => sum + (exp.totalAmount || 0), 0),
    expenseCount: expenses.length,
  }), [expenses]);
  
  // Memoize callback for performance
  const handleHeaderClick = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);
  
  return (
    <div className="month-section">
      <div 
        className={`month-header clickable ${isCollapsed ? 'collapsed' : ''}`}
        onClick={handleHeaderClick}
      >
        <div className="month-header-left">
          <span className="month-expand-icon">
            {isCollapsed ? <FiChevronDown size={14} /> : <FiChevronUp size={14} />}
          </span>
          <span className="month-label">{monthKey}</span>
          <span className="month-count">{expenseCount} expense{expenseCount !== 1 ? 's' : ''}</span>
        </div>
        <span className="month-total">${monthTotal.toFixed(2)}</span>
      </div>
      
      <div className={`expenses-stack ${isCollapsed ? 'collapsed' : ''}`}>
        {!isCollapsed && expenses.map((exp) => (
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

// Custom comparison function for React.memo
// Prevents re-render if expenses array has same IDs and updatedAt timestamps
function arePropsEqual(prevProps, nextProps) {
  // Quick reference equality check
  if (prevProps === nextProps) return true;

  // Check primitive props
  if (prevProps.monthKey !== nextProps.monthKey ||
      prevProps.expandedExpenseId !== nextProps.expandedExpenseId ||
      prevProps.myUserId !== nextProps.myUserId ||
      prevProps.defaultCollapsed !== nextProps.defaultCollapsed) {
    return false;
  }

  // Check expenses array - compare by IDs and updatedAt
  if (prevProps.expenses.length !== nextProps.expenses.length) return false;

  // Use shallow comparison of expense IDs and updatedAt
  for (let i = 0; i < prevProps.expenses.length; i++) {
    const prev = prevProps.expenses[i];
    const next = nextProps.expenses[i];
    if (prev.id !== next.id || prev.updatedAt !== next.updatedAt) {
      return false;
    }
  }

  return true;
}

export default React.memo(MonthSection, arePropsEqual);
