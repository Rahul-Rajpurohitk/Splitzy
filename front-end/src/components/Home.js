import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import Friends from './Friends';
import Notification from './Notification';
import SplitzySocket from './SplitzySocket';
import socket from '../socket';
import ExpenseCenter from './expenses/ExpenseCenter';
import '../home.css';
import Groups from './Groups';
import ProfilePanel from './ProfilePanel';
import { 
  FiHome, FiBarChart2, FiUsers, FiX, FiClock, 
  FiChevronDown, FiChevronUp, FiDollarSign, FiTrendingUp, FiPieChart
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
  const date = new Date(dateStr);
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
}

function Home() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const myUserId = localStorage.getItem('myUserId');
  const username = localStorage.getItem('myUserName');
  const avatarUrl = localStorage.getItem('myUserAvatar') || '';

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [selectedView, setSelectedView] = useState('dashboard');
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [openChats, setOpenChats] = useState([]);
  
  // Recent activity state
  const [recentActivity, setRecentActivity] = useState([]);
  const [activityExpanded, setActivityExpanded] = useState(true);

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

  // Calculate user's overall balance
  const balanceData = useMemo(() => {
    let totalOwed = 0;
    let totalOwing = 0;
    let expenseCount = expenses.length;

    expenses.forEach((expense) => {
      const myParticipant = expense.participants?.find(p => p.userId === myUserId);
      if (myParticipant) {
        const net = myParticipant.net || 0;
        if (net > 0) {
          totalOwed += net;
        } else if (net < 0) {
          totalOwing += Math.abs(net);
        }
      }
    });

    const overallBalance = totalOwed - totalOwing;
    
    return {
      totalOwed,
      totalOwing,
      overallBalance,
      expenseCount,
    };
  }, [expenses, myUserId]);

  // Calculate additional stats for left panel
  const statsData = useMemo(() => {
    const thisMonth = new Date();
    const lastMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - 1, 1);
    
    let thisMonthTotal = 0;
    let lastMonthTotal = 0;
    let personalCount = 0;
    let settledCount = 0;
    
    expenses.forEach(exp => {
      const expDate = new Date(exp.date || exp.createdAt);
      const myPart = exp.participants?.find(p => p.userId === myUserId);
      
      if (expDate.getMonth() === thisMonth.getMonth() && expDate.getFullYear() === thisMonth.getFullYear()) {
        thisMonthTotal += exp.totalAmount || 0;
      } else if (expDate.getMonth() === lastMonth.getMonth() && expDate.getFullYear() === lastMonth.getFullYear()) {
        lastMonthTotal += exp.totalAmount || 0;
      }
      
      if (exp.isPersonal) personalCount++;
      if (exp.isSettled) settledCount++;
    });
    
    const monthOverMonth = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal * 100) : 0;
    
    return {
      thisMonthTotal,
      lastMonthTotal,
      monthOverMonth,
      personalCount,
      settledCount,
      avgPerExpense: expenses.length > 0 ? expenses.reduce((sum, e) => sum + (e.totalAmount || 0), 0) / expenses.length : 0
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
    socket.disconnect();
    localStorage.removeItem('splitzyToken');
    localStorage.removeItem('myUserId');
    localStorage.removeItem('myUserName');
    localStorage.removeItem('myUserEmail');
    window.location.href = '/login';
  };

  // Determine balance status
  let balanceStatus = "settled";
  let balanceColor = "var(--muted)";
  let balanceIcon = "✓";
  if (balanceData.overallBalance > 0) {
    balanceStatus = "positive";
    balanceColor = "#22c55e";
    balanceIcon = "↑";
  } else if (balanceData.overallBalance < 0) {
    balanceStatus = "negative";
    balanceColor = "#ef4444";
    balanceIcon = "↓";
  }

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
          {/* Left Panel - Balance & Activity */}
          <aside className="panel left-panel">
            <div className="panel-header">
              <span>Your Balance</span>
            </div>
            
            {/* Overall Balance Card */}
            <div className={`balance-card ${balanceStatus}`}>
              <div className="balance-header">
                <span className="balance-icon" style={{ color: balanceColor }}>{balanceIcon}</span>
                <span className="balance-title">Net Balance</span>
              </div>
              <div className="balance-amount" style={{ color: balanceColor }}>
                {balanceData.overallBalance >= 0 ? '+' : '-'}${Math.abs(balanceData.overallBalance).toFixed(2)}
              </div>
              <div className="balance-breakdown">
                <div className="breakdown-item positive">
                  <span className="bd-label">You're owed</span>
                  <span className="bd-value">${balanceData.totalOwed.toFixed(2)}</span>
                </div>
                <div className="breakdown-item negative">
                  <span className="bd-label">You owe</span>
                  <span className="bd-value">${balanceData.totalOwing.toFixed(2)}</span>
                </div>
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
              <div className="monthly-amount">${statsData.thisMonthTotal.toFixed(0)}</div>
              <div className="monthly-comparison">
                {statsData.monthOverMonth !== 0 && (
                  <span className={`trend-badge ${statsData.monthOverMonth > 0 ? 'up' : 'down'}`}>
                    {statsData.monthOverMonth > 0 ? '↑' : '↓'} {Math.abs(statsData.monthOverMonth).toFixed(0)}%
                  </span>
                )}
                <span className="vs-last">vs last month</span>
              </div>
            </div>

            {/* Key Stats Grid */}
            <div className="stats-grid-compact">
              <div className="stat-compact">
                <FiDollarSign size={14} className="stat-icon" />
                <div className="stat-info">
                  <span className="stat-num">{balanceData.expenseCount}</span>
                  <span className="stat-txt">Total</span>
                </div>
              </div>
              <div className="stat-compact">
                <FiPieChart size={14} className="stat-icon" />
                <div className="stat-info">
                  <span className="stat-num">{statsData.personalCount}</span>
                  <span className="stat-txt">Personal</span>
                </div>
              </div>
              <div className="stat-compact settled">
                <span className="stat-num">{statsData.settledCount}</span>
                <span className="stat-txt">Settled</span>
              </div>
              <div className="stat-compact">
                <span className="stat-num">${statsData.avgPerExpense.toFixed(0)}</span>
                <span className="stat-txt">Avg</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="panel-header spaced">
              <span>Quick actions</span>
            </div>
            <div className="quick-actions">
              <button className="qa-btn" onClick={() => window.dispatchEvent(new CustomEvent('modalOpened'))}>
                New expense
              </button>
              <button className="qa-btn ghost" onClick={() => setSelectedView('analytics')}>
                View analytics
              </button>
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

          {/* Center Panel - Expenses / Analytics / Profile */}
          <section className="panel center-panel">
            {selectedView === 'dashboard' && (
              <ExpenseCenter onOpenChat={handleOpenChat} />
            )}
            {selectedView === 'analytics' && <AnalyticsDashboard />}
            {selectedView === 'profile' && (
              <ProfilePanel
                mode={selectedView}
                onBack={() => setSelectedView('dashboard')}
                onUpdatedProfile={(p) => {
                  if (p.name) localStorage.setItem('myUserName', p.name);
                  if (p.email) localStorage.setItem('myUserEmail', p.email);
                  if (p.avatarUrl !== undefined) localStorage.setItem('myUserAvatar', p.avatarUrl || '');
                }}
              />
            )}
          </section>

          {/* Right Panel - Friends & Groups */}
          <aside className={`panel sidebar ${!showRightPanel ? 'panel-collapsed' : ''}`}>
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
                <Friends />
                <div className="panel-divider" />
                <Groups />
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
      </div>
    </div>
  );
}

export default Home;
