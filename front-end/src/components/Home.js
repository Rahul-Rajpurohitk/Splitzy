import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
//import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import Friends from './Friends';
import Notification from './Notification';
import SplitzySocket from './SplitzySocket';
//import { closeSocket } from '../features/socket/socketSlice';
import socket from '../socket'; // <-- IMPORT the socket directly
import ExpenseCenter from './expenses/ExpenseCenter';
import '../home.css';
import Groups from './Groups';

function Home() {
  const navigate = useNavigate();
  //const dispatch = useDispatch();
  //const { connected } = useSelector((state) => state.socket);

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
    // Close WebSocket before logging out
    socket.disconnect();

    localStorage.removeItem('splitzyToken');
    localStorage.removeItem('myUserId');
    localStorage.removeItem('myUserName');
    localStorage.removeItem('myUserEmail');
    
    window.location.href = '/login';
  };

  const username = localStorage.getItem('myUserName');

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
            <Notification />
            <div className="user-pill">
              <div className="avatar">{(username || 'U')[0]}</div>
              <div className="user-meta">
                <span className="user-name">{username || 'You'}</span>
                <span className="user-role">Member</span>
              </div>
              <button onClick={handleLogout} className="logout-link">
                Logout
              </button>
            </div>
          </div>
        </header>

        <div className="main-grid">
          <aside className="panel sidebar">
            <Friends />
            <div className="panel-divider" />
            <Groups />
          </aside>

          <section className="panel center-panel">
            <ExpenseCenter />
          </section>

          <aside className="panel right-panel">
            <div className="panel-header">
              <span>Quick actions</span>
            </div>
            <div className="quick-actions">
              <button className="qa-btn">New expense</button>
              <button className="qa-btn ghost">Invite a friend</button>
              <button className="qa-btn ghost">Create group</button>
            </div>
            <div className="panel-header spaced">
              <span>Highlights</span>
            </div>
            <div className="insight-card">
              <div>
                <p className="insight-label">Open balances</p>
                <p className="insight-value">$0.00</p>
              </div>
              <div className="insight-badge">Clean slate</div>
            </div>
            <div className="insight-card">
              <div>
                <p className="insight-label">Active groups</p>
                <p className="insight-value">—</p>
              </div>
              <div className="insight-badge ghost">Start one</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default Home;
