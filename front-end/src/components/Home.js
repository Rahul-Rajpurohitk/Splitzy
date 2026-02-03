import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { fetchExpensesThunk, backgroundSyncExpensesThunk } from '../features/expense/expenseSlice';
import Friends from './Friends';
import Notification from './Notification';
import SplitzySocket from './SplitzySocket';
import { disconnectSocket } from '../socket';
import ExpenseCenter from './expenses/ExpenseCenter';
import '../home.css';
import Groups from './Groups';
import ProfilePanel from './ProfilePanel';
import { 
  FiHome, FiBarChart2, FiUsers, FiX, FiClock, 
  FiChevronDown, FiChevronUp, FiTrendingUp, FiPlus, FiMenu, FiArrowLeft
} from 'react-icons/fi';
import ChatDropdown from './chat/ChatDropdown';
import ChatWindow from './chat/ChatWindow';
import AnalyticsDashboard from './analytics/AnalyticsDashboard';

const API_URL = process.env.REACT_APP_API_URL;

// Category icons for recent activity
const CATEGORY_ICONS = {
  food: '🍕', dining: '🍕', restaurant: '🍕',
  groceries: '🛒', shopping: '🛍️',
  transport: '🚗', transportation: '🚗', travel: '✈️',
  entertainment: '🎬', movies: '🎬',
  utilities: '⚡', bills: '📄',
  rent: '🏠', housing: '🏠',
  healthcare: '❤️', medical: '❤️',
  education: '📚', fitness: '💪', gym: '💪',
  subscriptions: '💳', gifts: '🎁',
  events: '🎉', pets: '🐕',
  other: '📋'
};

function getCategoryIcon(category) {
  if (!category) return '📋';
  const lower = category.toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return '📋';
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

// Safe number formatting to prevent NaN/Infinity display
function safeNumber(value, defaultValue = 0) {
  if (value === null || value === undefined || !isFinite(value)) {
    return defaultValue;
  }
  return value;
}

function safeFixed(value, decimals = 2) {
  const num = safeNumber(value);
  return num.toFixed(decimals);
}

function Home() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const myUserId = localStorage.getItem('myUserId');
  const username = localStorage.getItem('myUserName');
  const avatarUrl = localStorage.getItem('myUserAvatar') || '';
  const token = localStorage.getItem('splitzyToken');

  const [showUserMenu, setShowUserMenu] = useState(false);
  // selectedView now includes: 'dashboard', 'analytics', 'profile', 'settings', 'people', 'menu', 'chat'
  const [selectedView, setSelectedView] = useState('dashboard');
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [openChats, setOpenChats] = useState([]);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [mobileChatThread, setMobileChatThread] = useState(null); // For full-page mobile chat
  
  // People page tab state (mobile)
  const [peopleTab, setPeopleTab] = useState('friends'); // 'friends' or 'groups'
  const [triggerAddFriend, setTriggerAddFriend] = useState(false);
  const [triggerAddGroup, setTriggerAddGroup] = useState(false);
  
  // Detect if mobile
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Add body class when People/Chat page is active (for disabling background scroll)
  useEffect(() => {
    if (selectedView === 'people' || selectedView === 'chat') {
      document.body.classList.add('mobile-overlay-active');
    } else {
      document.body.classList.remove('mobile-overlay-active');
    }
    return () => document.body.classList.remove('mobile-overlay-active');
  }, [selectedView]);
  
  // Recent activity state
  const [recentActivity, setRecentActivity] = useState([]);
  const [activityExpanded, setActivityExpanded] = useState(true);
  
  // Add dashboard-active class to body for mobile scroll lock (auth pages should scroll)
  // Also trigger a viewport recalculation for iOS Safari
  useEffect(() => {
    document.body.classList.add('dashboard-active');
    
    // Fix for iOS Safari viewport issues on initial load
    const fixViewport = () => {
      // Force a reflow to fix iOS viewport calculation
      window.scrollTo(0, 0);
      document.body.style.height = '100%';
      document.body.style.overflow = 'hidden';
    };
    
    // Run immediately and after a short delay (for iOS Safari)
    fixViewport();
    const timer = setTimeout(fixViewport, 100);
    
    return () => {
      clearTimeout(timer);
      document.body.classList.remove('dashboard-active');
      document.body.style.height = '';
      document.body.style.overflow = '';
    };
  }, []);
  
  // Socket event handling REMOVED from Home.js
  // REASON: ExpenseCenter.js already listens to socket events and handles refresh
  // Having both caused duplicate fetches and unnecessary re-renders
  // ExpenseCenter uses backgroundSyncExpensesThunk which respects filters and only updates if changed

  // RELIABILITY: Background sync every 60 seconds (increased from 30s)
  // This is a FALLBACK only - primary updates come from socket events handled by ExpenseCenter
  // Uses backgroundSyncExpensesThunk which only updates if data actually changed
  useEffect(() => {
    if (!myUserId || !token) return;

    const syncInterval = setInterval(() => {
      // Only sync if document is visible (user is actively using the app)
      if (document.visibilityState === 'visible') {
        console.log('[Home] Background sync - checking for updates');
        dispatch(backgroundSyncExpensesThunk({ userId: myUserId, token }));
      }
    }, 60000); // 60 seconds (increased from 30s to reduce unnecessary fetches)

    return () => clearInterval(syncInterval);
  }, [myUserId, token, dispatch]);

  // Auto-hide right panel when switching to analytics
  useEffect(() => {
    if (selectedView === 'analytics') {
      setShowRightPanel(false);
    } else if (selectedView === 'dashboard') {
      setShowRightPanel(true);
    }
  }, [selectedView]);

  const MAX_OPEN_CHATS = 4;

  const handleOpenChat = (thread) => {
    const existing = openChats.find(c => c.thread.id === thread.id);
    if (existing) {
      if (existing.minimized) {
        setOpenChats(prev => prev.map(c => 
          c.thread.id === thread.id ? { ...c, minimized: false } : c
        ));
      }
      return;
    }
    setOpenChats(prev => {
      if (prev.length >= MAX_OPEN_CHATS) {
        return [...prev.slice(1), { thread, minimized: false }];
      }
      return [...prev, { thread, minimized: false }];
    });
  };

  // Mobile full-page chat handler
  const handleMobileOpenChat = (thread) => {
    setMobileChatThread(thread);
    setSelectedView('chat');
  };

  const handleMobileCloseChat = () => {
    setMobileChatThread(null);
    setSelectedView('people');
  };

  const handleCloseChat = (threadId) => {
    setOpenChats(prev => prev.filter(c => c.thread.id !== threadId));
  };

  const handleMinimizeChat = (threadId) => {
    setOpenChats(prev => prev.map(c => 
      c.thread.id === threadId ? { ...c, minimized: true } : c
    ));
  };

  const handleExpandChat = (threadId) => {
    setOpenChats(prev => prev.map(c => 
      c.thread.id === threadId ? { ...c, minimized: false } : c
    ));
  };

  // Get expenses from Redux
  const expenses = useSelector((state) => state.expense.list);

  // Calculate user's overall balance - split by shared and personal
  // IMPORTANT: Account for settled amounts to show effective balance
  const balanceData = useMemo(() => {
    let sharedOwed = 0;
    let sharedOwing = 0;
    let personalTotal = 0;
    let expenseCount = expenses.length;

    expenses.forEach((expense) => {
      const myParticipant = expense.participants?.find(p => p.userId === myUserId);
      if (myParticipant) {
        const net = myParticipant.net || 0;
        // Use share if available, otherwise fall back to owes (backend might use either)
        const share = myParticipant.share || myParticipant.owes || 0;
        const settledAmount = myParticipant.settledAmount || 0;
        const isFullySettled = myParticipant.fullySettled || false;

        if (expense.isPersonal) {
          // Personal expenses - just track total spent
          personalTotal += share;
        } else {
          // Shared expenses - track owed/owing with settlement adjustments
          // If fully settled, this expense contributes 0 to balance
          if (isFullySettled || expense.isSettled) {
            // Fully settled - no outstanding balance
          } else if (net > 0) {
            // I'm owed money - others owe me
            // Note: settledAmount on MY participant is what I'VE settled, not what others paid me
            sharedOwed += net;
          } else if (net < 0) {
            // I owe money - calculate effective amount after my settlements
            const amountIOwe = Math.abs(net);
            const effectiveOwing = Math.max(0, amountIOwe - settledAmount);
            sharedOwing += effectiveOwing;
          }
        }
      }
    });

    const sharedBalance = sharedOwed - sharedOwing;

    return {
      sharedOwed,
      sharedOwing,
      sharedBalance,
      personalTotal,
      expenseCount,
    };
  }, [expenses, myUserId]);

  // Calculate additional stats for left panel
  const statsData = useMemo(() => {
    const thisMonth = new Date();
    const lastMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - 1, 1);
    const weekAgo = new Date(thisMonth.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    let thisMonthTotal = 0;
    let lastMonthTotal = 0;
    let personalCount = 0;
    let personalThisMonth = 0;
    let personalTotal = 0;
    let settledCount = 0;
    let pendingCount = 0;
    let thisWeekCount = 0;
    let biggestExpense = 0;
    let myTotalShare = 0;
    
    expenses.forEach(exp => {
      const expDate = new Date(exp.date || exp.createdAt);
      const myPart = exp.participants?.find(p => p.userId === myUserId);
      // Use share if available, otherwise fall back to owes (backend might use either)
      const myShare = myPart?.share || myPart?.owes || 0;
      
      if (expDate.getMonth() === thisMonth.getMonth() && expDate.getFullYear() === thisMonth.getFullYear()) {
        thisMonthTotal += myShare;
        if (myShare > biggestExpense) biggestExpense = myShare;
        if (exp.isPersonal) personalThisMonth += myShare;
      } else if (expDate.getMonth() === lastMonth.getMonth() && expDate.getFullYear() === lastMonth.getFullYear()) {
        lastMonthTotal += myShare;
      }
      
      if (expDate >= weekAgo) thisWeekCount++;
      
      if (exp.isPersonal) {
        personalCount++;
        personalTotal += myShare;
      }
      // Count as settled if whole expense is settled OR if my part is settled
      const mySettledAmount = myPart?.settledAmount || 0;
      const myFullySettled = myPart?.fullySettled || false;
      const myRemainingAmount = Math.abs((myPart?.share || myPart?.owes || 0) - mySettledAmount);
      const isMyPartSettled = myFullySettled || myRemainingAmount < 0.01;

      if (exp.isSettled || isMyPartSettled) settledCount++;
      else pendingCount++;
      
      myTotalShare += myShare;
    });
    
    const monthOverMonth = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal * 100) : 0;
    const avgPerExpense = expenses.length > 0 ? myTotalShare / expenses.length : 0;
    const avgPersonalExpense = personalCount > 0 ? personalTotal / personalCount : 0;
    
    return {
      thisMonthTotal,
      lastMonthTotal,
      monthOverMonth,
      personalCount,
      personalThisMonth,
      avgPersonalExpense,
      settledCount,
      pendingCount,
      avgPerExpense,
      biggestExpense,
      thisWeekCount,
      totalExpenses: expenses.length
    };
  }, [expenses, myUserId]);

  // Recent activity from expenses (most recent 5)
  useEffect(() => {
    const sorted = [...expenses].sort((a, b) => 
      new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)
    );
    
    const recent = sorted.slice(0, 5).map(exp => {
      const myPart = exp.participants?.find(p => p.userId === myUserId);
      const net = myPart?.net || 0;
      return {
        id: exp.id,
        description: exp.description,
        category: exp.category,
        amount: exp.totalAmount,
        net,
        date: exp.createdAt || exp.date,
        groupName: exp.groupName
      };
    });
    
    setRecentActivity(recent);
  }, [expenses, myUserId]);

  useEffect(() => {
    const token = localStorage.getItem('splitzyToken');
    if (!token) {
      navigate('/login');
      return;
    }

    axios
      .get(`${API_URL}/home`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        if (response.status === 200 && response.data === 'Authorized') {
          console.log('You are authorized to view this page!');
        }
      })
      .catch((error) => {
        console.error('Error accessing /home:', error);
        navigate('/login');
      });
  }, [navigate]);

  const handleLogout = () => {
    disconnectSocket();
    localStorage.removeItem('splitzyToken');
    localStorage.removeItem('myUserId');
    localStorage.removeItem('myUserName');
    localStorage.removeItem('myUserEmail');
    window.location.href = '/login';
  };

  // Determine balance status based on shared expenses only
  let balanceStatus = "settled";
  let balanceColor = "var(--muted)";
  let balanceIcon = "✓";
  if (balanceData.sharedBalance > 0) {
    balanceStatus = "positive";
    balanceColor = "#22c55e";
    balanceIcon = "↑";
  } else if (balanceData.sharedBalance < 0) {
    balanceStatus = "negative";
    balanceColor = "#ef4444";
    balanceIcon = "↓";
  }
  
  // State for balance card scroll position
  const [balanceCardIndex, setBalanceCardIndex] = React.useState(0);

  // Touch swipe handlers for balance cards
  const balanceSwipeRef = React.useRef({ startX: 0, startY: 0 });

  const handleBalanceTouchStart = (e) => {
    balanceSwipeRef.current.startX = e.touches[0].clientX;
    balanceSwipeRef.current.startY = e.touches[0].clientY;
  };

  const handleBalanceTouchEnd = (e) => {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - balanceSwipeRef.current.startX;
    const deltaY = endY - balanceSwipeRef.current.startY;

    // Only swipe horizontally if horizontal movement > vertical movement
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX < 0 && balanceCardIndex < 1) {
        // Swipe left - go to next card
        setBalanceCardIndex(1);
      } else if (deltaX > 0 && balanceCardIndex > 0) {
        // Swipe right - go to previous card
        setBalanceCardIndex(0);
      }
    }
  };

  return (
    <div className="app-shell">
      <SplitzySocket />

      <div className="app-bg">
      <header className="topbar">
          <div className="brand">
            <div className="brand-mark">S</div>
            <div className="brand-text">
              <span className="brand-name">Splitzy</span>
              <span className="brand-sub">Shared expenses, simplified</span>
            </div>
          </div>
          <div className="top-actions">
            <button
              className={`nav-icon-pill ${selectedView === 'dashboard' ? 'active' : ''}`}
              title="Dashboard"
              onClick={() => setSelectedView('dashboard')}
            >
              <FiHome size={16} />
              <span className="nav-icon-text">Dashboard</span>
            </button>
            <button
              className={`nav-icon-pill ${selectedView === 'analytics' ? 'active' : ''}`}
              title="Analytics"
              onClick={() => setSelectedView('analytics')}
            >
              <FiBarChart2 size={16} />
              <span className="nav-icon-text">Analytics</span>
            </button>
            {!showRightPanel && (
              <button
                className="nav-icon-pill panel-toggle"
                title="Show Friends & Groups"
                onClick={() => setShowRightPanel(true)}
              >
                <FiUsers size={16} />
                <span className="nav-icon-text">People</span>
              </button>
            )}
            <ChatDropdown onSelectThread={(t) => { 
              console.log("[Home] onSelectThread received:", t);
              handleOpenChat(t); 
              setSelectedView('dashboard'); 
            }} />
          <Notification />
            <div className="user-pill dropdown" onClick={() => setShowUserMenu(!showUserMenu)}>
              <div className="avatar">
                {avatarUrl ? <img src={avatarUrl} alt="avatar" className="avatar-img" /> : (username || 'U')[0]}
              </div>
              <div className="user-meta">
                <span className="user-name">{username || 'You'}</span>
                <span className="user-role">Member</span>
              </div>
            </div>
            {showUserMenu && (
              <div className="user-menu">
                <button onClick={() => { setSelectedView('profile'); setShowUserMenu(false); }} className="user-menu-item">
                  Profile
                </button>
                <button onClick={() => { setSelectedView('settings'); setShowUserMenu(false); }} className="user-menu-item">
                  Settings (soon)
                </button>
                <button onClick={handleLogout} className="user-menu-item danger">
            Logout
          </button>
              </div>
            )}
        </div>
      </header>

        <div className={`main-grid ${!showRightPanel ? 'right-panel-hidden' : ''}`}>
          {/* Left Panel - Balance & Activity (Desktop only, hidden on mobile) */}
          <aside className="panel left-panel desktop-only">
            
            <div className="panel-header">
              <span>Your Balance</span>
            </div>
            
            {/* Horizontal Scrollable Balance Cards */}
            <div className="balance-cards-container">
              <div
                className="balance-cards-wrapper"
                onTouchStart={handleBalanceTouchStart}
                onTouchEnd={handleBalanceTouchEnd}
              >
                <div
                  className="balance-cards-scroll"
                  style={{ transform: `translateX(-${balanceCardIndex * 100}%)` }}
                >
                {/* Shared Balance Card */}
                <div className={`balance-card-slide ${balanceStatus}`}>
                  <div className="balance-header">
                    <span className="balance-icon" style={{ color: balanceColor }}>{balanceIcon}</span>
                    <span className="balance-title">Shared Balance</span>
                    <span className="balance-type-badge">👥</span>
                  </div>
                  <div className="balance-amount" style={{ color: balanceColor }}>
                    {safeNumber(balanceData.sharedBalance) >= 0 ? '+' : '-'}${safeFixed(Math.abs(safeNumber(balanceData.sharedBalance)))}
                  </div>
                  <div className="balance-breakdown">
                    <div className="breakdown-item positive">
                      <span className="bd-label">You're owed</span>
                      <span className="bd-value">${safeFixed(balanceData.sharedOwed)}</span>
                    </div>
                    <div className="breakdown-item negative">
                      <span className="bd-label">You owe</span>
                      <span className="bd-value">${safeFixed(balanceData.sharedOwing)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Personal Spending Card */}
                <div className="balance-card-slide personal">
                  <div className="balance-header">
                    <span className="balance-icon" style={{ color: '#818cf8' }}>💰</span>
                    <span className="balance-title">Personal Spending</span>
                    <span className="balance-type-badge">👤</span>
                  </div>
                  <div className="balance-amount" style={{ color: '#818cf8' }}>
                    ${safeFixed(balanceData.personalTotal)}
                  </div>
                  <div className="balance-breakdown">
                    <div className="breakdown-item">
                      <span className="bd-label">This month</span>
                      <span className="bd-value">${safeFixed(statsData.personalThisMonth, 0)}</span>
                    </div>
                    <div className="breakdown-item">
                      <span className="bd-label">Avg expense</span>
                      <span className="bd-value">${safeFixed(statsData.avgPersonalExpense, 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
              </div>
              
              {/* Scroll Indicators */}
              <div className="balance-dots">
                <button 
                  className={`balance-dot ${balanceCardIndex === 0 ? 'active' : ''}`}
                  onClick={() => setBalanceCardIndex(0)}
                  aria-label="Shared balance"
                />
                <button 
                  className={`balance-dot ${balanceCardIndex === 1 ? 'active' : ''}`}
                  onClick={() => setBalanceCardIndex(1)}
                  aria-label="Personal spending"
                />
              </div>
            </div>

            {/* Monthly Spending Summary */}
            <div className="panel-header spaced">
              <span className="activity-header-text">
                <FiTrendingUp size={12} />
                This Month
              </span>
            </div>
            <div className="monthly-summary-card">
              <div className="monthly-amount">${safeFixed(statsData.thisMonthTotal, 0)}</div>
              <div className="monthly-comparison">
                {safeNumber(statsData.monthOverMonth) !== 0 && (
                  <span className={`trend-badge ${safeNumber(statsData.monthOverMonth) > 0 ? 'up' : 'down'}`}>
                    {safeNumber(statsData.monthOverMonth) > 0 ? '↑' : '↓'} {safeFixed(Math.abs(safeNumber(statsData.monthOverMonth)), 0)}%
                  </span>
                )}
                <span className="vs-last">vs last month</span>
              </div>
            </div>

            {/* Primary KPIs Grid */}
            <div className="kpi-grid-home">
              <div className="kpi-item total">
                <span className="kpi-emoji">📊</span>
                <span className="kpi-number">{safeNumber(statsData.totalExpenses, 0)}</span>
                <span className="kpi-text">Total</span>
              </div>
              <div className="kpi-item pending">
                <span className="kpi-emoji">⏳</span>
                <span className="kpi-number">{safeNumber(statsData.pendingCount, 0)}</span>
                <span className="kpi-text">Pending</span>
              </div>
              <div className="kpi-item settled">
                <span className="kpi-emoji">✓</span>
                <span className="kpi-number">{safeNumber(statsData.settledCount, 0)}</span>
                <span className="kpi-text">Settled</span>
              </div>
              <div className="kpi-item personal">
                <span className="kpi-emoji">👤</span>
                <span className="kpi-number">{safeNumber(statsData.personalCount, 0)}</span>
                <span className="kpi-text">Personal</span>
              </div>
            </div>
            
            {/* Secondary KPIs */}
            <div className="secondary-kpis">
              <div className="secondary-kpi">
                <span className="sk-label">Avg per expense</span>
                <span className="sk-value">${safeFixed(statsData.avgPerExpense, 0)}</span>
              </div>
              <div className="secondary-kpi">
                <span className="sk-label">Biggest this month</span>
                <span className="sk-value highlight">${safeFixed(statsData.biggestExpense, 0)}</span>
              </div>
              <div className="secondary-kpi">
                <span className="sk-label">This week</span>
                <span className="sk-value">{safeNumber(statsData.thisWeekCount, 0)} expenses</span>
              </div>
            </div>

            {/* Recent Activity - Always at bottom */}
            <div className="recent-activity-section">
              <div 
                className="panel-header spaced clickable" 
                onClick={() => setActivityExpanded(!activityExpanded)}
              >
                <span className="activity-header-text">
                  <FiClock size={12} />
                  Recent Activity
                </span>
                {activityExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
              </div>
              
              {activityExpanded && (
                <div className="activity-list">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((activity, idx) => (
                      <div key={activity.id || idx} className="activity-item">
                        <div className="activity-icon">
                          {getCategoryIcon(activity.category)}
                        </div>
                        <div className="activity-content">
                          <span className="activity-desc">{activity.description}</span>
                          <span className="activity-meta">
                            {activity.groupName && <span className="activity-group">{activity.groupName}</span>}
                            <span className="activity-time">{formatTimeAgo(activity.date)}</span>
                          </span>
                        </div>
                        <div className={`activity-amount ${activity.net >= 0 ? 'positive' : 'negative'}`}>
                          {activity.net >= 0 ? '+' : ''}{activity.net.toFixed(2)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-activity">No recent activity</div>
                  )}
                </div>
              )}
            </div>
        </aside>

          {/* Center Panel - Expenses / Analytics / Profile / People / Menu */}
          <section className="panel center-panel">
            {selectedView === 'dashboard' && (
              <ExpenseCenter 
                onOpenChat={handleOpenChat} 
                externalShowAddModal={showAddExpenseModal}
                onCloseAddModal={() => setShowAddExpenseModal(false)}
              />
            )}
            {selectedView === 'analytics' && <AnalyticsDashboard />}
            {selectedView === 'profile' && (
              <ProfilePanel
                mode={selectedView}
                onBack={() => setSelectedView(isMobile ? 'menu' : 'dashboard')}
                onUpdatedProfile={(p) => {
                  if (p.name) localStorage.setItem('myUserName', p.name);
                  if (p.email) localStorage.setItem('myUserEmail', p.email);
                  if (p.avatarUrl !== undefined) localStorage.setItem('myUserAvatar', p.avatarUrl || '');
                }}
              />
            )}
            
            {/* Mobile People View - Via Portal for true edge-to-edge */}
            {selectedView === 'people' && createPortal(
              <div className="mobile-people-container">
                <div className="mobile-people-page">
                  {/* Tab Header */}
                  <div className="people-tabs-header">
                    <button 
                      className={`people-tab-btn ${peopleTab === 'friends' ? 'active' : ''}`}
                      onClick={() => setPeopleTab('friends')}
                    >
                      Friends
                    </button>
                    <button 
                      className={`people-tab-btn ${peopleTab === 'groups' ? 'active' : ''}`}
                      onClick={() => setPeopleTab('groups')}
                    >
                      Groups
                    </button>
                  </div>
                  
                  {/* Tab Content */}
                  <div className="people-tab-content">
                    {peopleTab === 'friends' && (
                      <Friends 
                        onOpenChat={(thread) => {
                          console.log('[People] Opening chat:', thread);
                          handleMobileOpenChat(thread);
                        }}
                        isMobile={true}
                        externalTriggerAdd={triggerAddFriend}
                        onAddModalClosed={() => setTriggerAddFriend(false)}
                        hideHeader={true}
                      />
                    )}
                    {peopleTab === 'groups' && (
                      <Groups 
                        onOpenChat={(thread) => {
                          console.log('[People] Opening group chat:', thread);
                          handleMobileOpenChat(thread);
                        }}
                        isMobile={true}
                        externalTriggerAdd={triggerAddGroup}
                        onAddModalClosed={() => setTriggerAddGroup(false)}
                        hideHeader={true}
                      />
                    )}
                  </div>
                  
                  {/* FAB inside container */}
                  <button 
                    className="people-fab"
                    onClick={() => {
                      if (peopleTab === 'friends') {
                        setTriggerAddFriend(true);
                      } else {
                        setTriggerAddGroup(true);
                      }
                    }}
                  >
                    <FiPlus size={18} />
                    <span>Add {peopleTab === 'friends' ? 'Friend' : 'Group'}</span>
                  </button>
                </div>
              </div>,
              document.body
            )}
            
            {/* Mobile Full-Page Chat View - Using Portal */}
            {selectedView === 'chat' && mobileChatThread && createPortal(
              <div className="mobile-chat-fullscreen">
                <ChatWindow
                  thread={mobileChatThread}
                  onClose={handleMobileCloseChat}
                  onMinimize={handleMobileCloseChat}
                  minimized={false}
                  isMobileFullPage={true}
                />
              </div>,
              document.body
            )}
            
            {/* Mobile Menu View */}
            {selectedView === 'menu' && (
              <div className="mobile-page-view menu-view">
                {/* User Profile Card */}
                <div className="menu-card user-card">
                  <div className="menu-user-row">
                    <div className="avatar avatar-lg">
                      {avatarUrl ? <img src={avatarUrl} alt="avatar" className="avatar-img" /> : (username || 'U')[0]}
                    </div>
                    <div className="menu-user-info">
                      <span className="menu-user-name">{username || 'You'}</span>
                      <span className="menu-user-email">{localStorage.getItem('myUserEmail') || ''}</span>
                    </div>
                  </div>
                  <div className="menu-user-actions">
                    <button className="menu-action-btn" onClick={() => setSelectedView('profile')}>
                      <FiUsers size={16} />
                      <span>Profile</span>
                    </button>
                    <button className="menu-action-btn danger" onClick={handleLogout}>
                      <FiX size={16} />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>

                {/* Balance Section */}
                <div className="mobile-menu-section">
                  <h3>Your Balance</h3>
                  <div className="balance-cards-container">
                    <div
                      className="balance-cards-wrapper"
                      onTouchStart={handleBalanceTouchStart}
                      onTouchEnd={handleBalanceTouchEnd}
                    >
                      <div
                        className="balance-cards-scroll"
                        style={{ transform: `translateX(-${balanceCardIndex * 100}%)` }}
                      >
                        <div className={`balance-card-slide ${balanceStatus}`}>
                          <div className="balance-header">
                            <span className="balance-icon" style={{ color: balanceColor }}>{balanceIcon}</span>
                            <span className="balance-title">Shared Balance</span>
                            <span className="balance-type-badge">👥</span>
                          </div>
                          <div className="balance-amount" style={{ color: balanceColor }}>
                            {safeNumber(balanceData.sharedBalance) >= 0 ? '+' : '-'}${safeFixed(Math.abs(safeNumber(balanceData.sharedBalance)))}
                          </div>
                          <div className="balance-breakdown">
                            <div className="breakdown-item positive">
                              <span className="bd-label">You're owed</span>
                              <span className="bd-value">${safeFixed(balanceData.sharedOwed)}</span>
                            </div>
                            <div className="breakdown-item negative">
                              <span className="bd-label">You owe</span>
                              <span className="bd-value">${safeFixed(balanceData.sharedOwing)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="balance-card-slide personal">
                          <div className="balance-header">
                            <span className="balance-icon" style={{ color: '#818cf8' }}>💰</span>
                            <span className="balance-title">Personal Spending</span>
                            <span className="balance-type-badge">👤</span>
                          </div>
                          <div className="balance-amount" style={{ color: '#818cf8' }}>
                            ${safeFixed(balanceData.personalTotal)}
                          </div>
                          <div className="balance-breakdown">
                            <div className="breakdown-item">
                              <span className="bd-label">This month</span>
                              <span className="bd-value">${safeFixed(statsData.personalThisMonth, 0)}</span>
                            </div>
                            <div className="breakdown-item">
                              <span className="bd-label">Avg expense</span>
                              <span className="bd-value">${safeFixed(statsData.avgPersonalExpense, 0)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="balance-dots">
                      <button
                        className={`balance-dot ${balanceCardIndex === 0 ? 'active' : ''}`}
                        onClick={() => setBalanceCardIndex(0)}
                      />
                      <button
                        className={`balance-dot ${balanceCardIndex === 1 ? 'active' : ''}`}
                        onClick={() => setBalanceCardIndex(1)}
                      />
                    </div>
                  </div>
                </div>

                {/* This Month Card */}
                <div className="mobile-menu-section">
                  <h3><FiTrendingUp size={14} /> This Month</h3>
                  <div className="monthly-summary-card">
                    <div className="monthly-amount">${safeFixed(statsData.thisMonthTotal, 0)}</div>
                    <div className="monthly-comparison">
                      {safeNumber(statsData.monthOverMonth) !== 0 && (
                        <span className={`trend-badge ${safeNumber(statsData.monthOverMonth) > 0 ? 'up' : 'down'}`}>
                          {safeNumber(statsData.monthOverMonth) > 0 ? '↑' : '↓'} {safeFixed(Math.abs(safeNumber(statsData.monthOverMonth)), 0)}%
                        </span>
                      )}
                      <span className="vs-last">vs last month</span>
                    </div>
                  </div>
                </div>

                {/* Overview KPIs */}
                <div className="mobile-menu-section">
                  <h3>Overview</h3>
                  <div className="kpi-grid-home">
                    <div className="kpi-item total">
                      <span className="kpi-emoji">📊</span>
                      <span className="kpi-number">{safeNumber(statsData.totalExpenses, 0)}</span>
                      <span className="kpi-text">Total</span>
                    </div>
                    <div className="kpi-item pending">
                      <span className="kpi-emoji">⏳</span>
                      <span className="kpi-number">{safeNumber(statsData.pendingCount, 0)}</span>
                      <span className="kpi-text">Pending</span>
                    </div>
                    <div className="kpi-item settled">
                      <span className="kpi-emoji">✓</span>
                      <span className="kpi-number">{safeNumber(statsData.settledCount, 0)}</span>
                      <span className="kpi-text">Settled</span>
                    </div>
                    <div className="kpi-item personal">
                      <span className="kpi-emoji">👤</span>
                      <span className="kpi-number">{safeNumber(statsData.personalCount, 0)}</span>
                      <span className="kpi-text">Personal</span>
                    </div>
                  </div>
                </div>

                {/* Stats Card */}
                <div className="mobile-menu-section">
                  <h3>Stats</h3>
                  <div className="secondary-kpis">
                    <div className="secondary-kpi">
                      <span className="sk-label">Avg per expense</span>
                      <span className="sk-value">${safeFixed(statsData.avgPerExpense, 0)}</span>
                    </div>
                    <div className="secondary-kpi">
                      <span className="sk-label">Biggest this month</span>
                      <span className="sk-value highlight">${safeFixed(statsData.biggestExpense, 0)}</span>
                    </div>
                    <div className="secondary-kpi">
                      <span className="sk-label">This week</span>
                      <span className="sk-value">{safeNumber(statsData.thisWeekCount, 0)} expenses</span>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="mobile-menu-section">
                  <h3><FiClock size={14} /> Recent Activity</h3>
                  <div className="activity-list">
                    {recentActivity.length > 0 ? (
                      recentActivity.map((activity, idx) => (
                        <div key={activity.id || idx} className="activity-item">
                          <div className="activity-icon">
                            {getCategoryIcon(activity.category)}
                          </div>
                          <div className="activity-content">
                            <span className="activity-desc">{activity.description}</span>
                            <span className="activity-meta">
                              {activity.groupName && <span className="activity-group">{activity.groupName}</span>}
                              <span className="activity-time">{formatTimeAgo(activity.date)}</span>
                            </span>
                          </div>
                          <div className={`activity-amount ${activity.net >= 0 ? 'positive' : 'negative'}`}>
                            {activity.net >= 0 ? '+' : ''}{activity.net.toFixed(2)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-activity">No recent activity</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Right Panel - Friends & Groups (Desktop only) */}
          <aside className={`panel sidebar desktop-only ${!showRightPanel ? 'panel-collapsed' : ''}`}>
            {showRightPanel && (
              <>
                <div className="sidebar-header">
                  <span className="sidebar-title">People</span>
                  <button 
                    className="sidebar-close-btn"
                    onClick={() => setShowRightPanel(false)}
                    title="Hide panel"
                  >
                    <FiX size={14} />
                  </button>
                </div>
                <Friends onOpenChat={handleOpenChat} />
                <div className="panel-divider" />
                <Groups onOpenChat={handleOpenChat} />
              </>
            )}
          </aside>
        </div>
        {/* Multiple chat windows */}
        <div className="chat-windows-container">
          {openChats.map((chat, idx) => {
            const EXPANDED_WIDTH = 380;
            const MINIMIZED_WIDTH = 160;
            const GAP = 20;
            
            let rightPosition = 20;
            for (let i = 0; i < idx; i++) {
              rightPosition += (openChats[i].minimized ? MINIMIZED_WIDTH : EXPANDED_WIDTH) + GAP;
            }
            
            return (
              <ChatWindow
                key={chat.thread.id}
                thread={chat.thread}
                minimized={chat.minimized}
                rightPosition={rightPosition}
                onClose={() => handleCloseChat(chat.thread.id)}
                onMinimize={() => handleMinimizeChat(chat.thread.id)}
                onExpand={() => handleExpandChat(chat.thread.id)}
              />
            );
          })}
        </div>
        
        {/* Mobile Bottom Navigation */}
        <nav className="mobile-bottom-nav">
          <button 
            className={`mobile-nav-item ${selectedView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setSelectedView('dashboard')}
          >
            <FiHome size={20} />
            <span>Home</span>
          </button>
          <button 
            className={`mobile-nav-item ${selectedView === 'analytics' ? 'active' : ''}`}
            onClick={() => setSelectedView('analytics')}
          >
            <FiBarChart2 size={20} />
            <span>Stats</span>
          </button>
          <button 
            className="mobile-nav-item mobile-nav-add"
            onClick={() => setShowAddExpenseModal(true)}
          >
            <FiPlus size={22} />
          </button>
          <button 
            className={`mobile-nav-item ${selectedView === 'people' ? 'active' : ''}`}
            onClick={() => setSelectedView('people')}
          >
            <FiUsers size={20} />
            <span>People</span>
          </button>
          <button 
            className={`mobile-nav-item ${selectedView === 'menu' ? 'active' : ''}`}
            onClick={() => setSelectedView('menu')}
          >
            <FiMenu size={20} />
            <span>Menu</span>
          </button>
        </nav>
      </div>
    </div>
  );
}

export default Home;
