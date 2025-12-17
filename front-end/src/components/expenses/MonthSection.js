import React, { useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import ExpenseCard from "./ExpenseCard";

function MonthSection({ monthKey, expenses, expandedExpenseId, onToggleExpand, myUserId, onOpenChat, defaultCollapsed = false }) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  
  // Calculate month summary
  const monthTotal = expenses.reduce((sum, exp) => sum + (exp.totalAmount || 0), 0);
  const expenseCount = expenses.length;
  
  const handleHeaderClick = () => {
    setIsCollapsed(!isCollapsed);
  };
  
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

export default MonthSection;
