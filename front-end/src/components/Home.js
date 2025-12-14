import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import Friends from './Friends';
import Notification from './Notification';
import SplitzySocket from './SplitzySocket';
import socket from '../socket';
import ExpenseCenter from './expenses/ExpenseCenter';
import '../home.css';
import Groups from './Groups';
import ProfilePanel from './ProfilePanel';
import { FiHome, FiBarChart2 } from 'react-icons/fi';
import ChatDropdown from './chat/ChatDropdown';
import ChatWindow from './chat/ChatWindow';
import AnalyticsDashboard from './analytics/AnalyticsDashboard';

function Home() {
  const navigate = useNavigate();
  const myUserId = localStorage.getItem('myUserId');
  const username = localStorage.getItem('myUserName');
  const avatarUrl = localStorage.getItem('myUserAvatar') || '';

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [selectedView, setSelectedView] = useState('dashboard'); // dashboard | profile | settings
  // Multiple chat windows: { thread, minimized }
  const [openChats, setOpenChats] = useState([]);

  const MAX_OPEN_CHATS = 4; // Limit max open chat windows

  const handleOpenChat = (thread) => {
    // Check if already open
    const existing = openChats.find(c => c.thread.id === thread.id);
    if (existing) {
      // If minimized, expand it
      if (existing.minimized) {
        setOpenChats(prev => prev.map(c => 
          c.thread.id === thread.id ? { ...c, minimized: false } : c
        ));
      }
      return;
    }
    // Add new chat (with limit)
    setOpenChats(prev => {
      if (prev.length >= MAX_OPEN_CHATS) {
        // Close the oldest one and add new
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
    let totalOwed = 0;  // Money others owe you (positive net)
    let totalOwing = 0; // Money you owe others (negative net)
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

  useEffect(() => {
    const token = localStorage.getItem('splitzyToken');
    if (!token) {
      navigate('/login');
      return;
    }

    axios
      .get(`${process.env.REACT_APP_API_URL}/home`, {
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

        <div className="main-grid">
          {/* Left Panel - Balance & Quick Actions */}
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

            {/* Activity Stats */}
            <div className="panel-header spaced">
              <span>Activity</span>
            </div>
            <div className="stats-row">
              <div className="stat-item">
                <span className="stat-value">{balanceData.expenseCount}</span>
                <span className="stat-label">Expenses</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{expenses.filter(e => {
                  const p = e.participants?.find(x => x.userId === myUserId);
                  return p && p.net !== 0;
                }).length}</span>
                <span className="stat-label">Unsettled</span>
              </div>
            </div>

            {/* Quick Actions - below highlights */}
            <div className="panel-header spaced">
              <span>Quick actions</span>
            </div>
            <div className="quick-actions">
              <button className="qa-btn" onClick={() => window.dispatchEvent(new CustomEvent('modalOpened'))}>
                New expense
              </button>
              <button className="qa-btn ghost">Invite a friend</button>
              <button className="qa-btn ghost">Create group</button>
            </div>
          </aside>

          {/* Center Panel - Expenses / Analytics / Profile */}
          <section className="panel center-panel">
            {selectedView === 'dashboard' && <ExpenseCenter onOpenChat={handleOpenChat} />}
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
          <aside className="panel sidebar">
            <Friends />
            <div className="panel-divider" />
            <Groups />
          </aside>
        </div>
        {/* Multiple chat windows - position based on cumulative width of chats to the right */}
        <div className="chat-windows-container">
          {openChats.map((chat, idx) => {
            // Calculate position based on actual widths of chats to the right (lower indices)
            const EXPANDED_WIDTH = 380;
            const MINIMIZED_WIDTH = 160;
            const GAP = 20;
            
            let rightPosition = 20; // Start position
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
