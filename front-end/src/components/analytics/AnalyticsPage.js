// src/components/analytics/AnalyticsPage.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiHome, FiBarChart2, FiUsers, FiBell, FiLogOut } from 'react-icons/fi';
import AnalyticsDashboard from './AnalyticsDashboard';
import SplitzySocket from '../SplitzySocket';
import Notification from '../Notification';
import '../../home.css';

/**
 * AnalyticsPage - Standalone analytics page with navigation
 *
 * This component wraps AnalyticsDashboard with the app's navigation header,
 * allowing /analytics to be a proper route while maintaining consistent UX.
 */
function AnalyticsPage() {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);

  const username = localStorage.getItem('myUserName') || 'User';
  const avatarUrl = localStorage.getItem('myUserAvatar') || '';
  const token = localStorage.getItem('splitzyToken');

  // Redirect to login if no token
  useEffect(() => {
    if (!token) {
      navigate('/login?returnUrl=/analytics');
    }
  }, [token, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('splitzyToken');
    localStorage.removeItem('myUserId');
    localStorage.removeItem('myUserName');
    localStorage.removeItem('myUserAvatar');
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!token) return null;

  return (
    <div className="home-layout analytics-page" data-testid="analytics-page">
      {/* WebSocket connection for real-time updates */}
      <SplitzySocket />

      {/* Top Navigation Bar */}
      <header className="top-bar" data-testid="analytics-header">
        <div className="top-bar-left">
          <div className="logo-mark">S</div>
          <div className="logo-text">
            <span className="logo-name">Splitzy</span>
            <span className="logo-tagline">Shared expenses, simplified</span>
          </div>
        </div>

        <nav className="top-bar-center">
          <button
            className="nav-icon-btn"
            title="Dashboard"
            onClick={() => navigate('/home')}
            data-testid="nav-dashboard"
          >
            <FiHome size={20} />
            <span className="nav-icon-text">Dashboard</span>
          </button>

          <button
            className="nav-icon-btn active"
            title="Analytics"
            data-testid="nav-analytics"
          >
            <FiBarChart2 size={20} />
            <span className="nav-icon-text">Analytics</span>
          </button>

          <button
            className="nav-icon-btn"
            title="People"
            onClick={() => navigate('/home?view=people')}
            data-testid="nav-people"
          >
            <FiUsers size={20} />
            <span className="nav-icon-text">People</span>
          </button>

          <div className="notification-wrapper">
            <button
              className="nav-icon-btn"
              title="Notifications"
              onClick={() => setShowNotifications(!showNotifications)}
              data-testid="nav-notifications"
            >
              <FiBell size={20} />
              <span className="nav-icon-text">Notifications</span>
            </button>
            {showNotifications && (
              <Notification onClose={() => setShowNotifications(false)} />
            )}
          </div>
        </nav>

        <div className="top-bar-right">
          <div
            className="user-menu-trigger"
            onClick={() => navigate('/home?view=profile')}
            data-testid="user-profile"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={username} className="user-avatar" />
            ) : (
              <div className="user-avatar-placeholder">{getInitials(username)}</div>
            )}
            <div className="user-info">
              <span className="user-name">{username}</span>
              <span className="user-role">Member</span>
            </div>
          </div>

          <button
            className="nav-icon-btn logout-btn"
            title="Logout"
            onClick={handleLogout}
            data-testid="logout-btn"
          >
            <FiLogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Content - Analytics Dashboard */}
      <main className="analytics-main-content" data-testid="analytics-content">
        <AnalyticsDashboard />
      </main>
    </div>
  );
}

export default AnalyticsPage;
