import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  FiTrendingUp, FiTrendingDown, FiDollarSign, FiUsers, 
  FiPieChart, FiBarChart2, FiCalendar, FiFilter,
  FiChevronDown, FiRefreshCw, FiArrowUp, FiArrowDown,
  FiClock, FiActivity, FiLayers, FiTarget
} from 'react-icons/fi';
import './AnalyticsDashboard.css';

const API_URL = process.env.REACT_APP_API_URL;

// Category icon mapping
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

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount || 0);
}

function formatPercentChange(value) {
  if (!value && value !== 0) return null;
  const formatted = Math.abs(value).toFixed(1);
  return value >= 0 ? `+${formatted}%` : `-${formatted}%`;
}

function AnalyticsDashboard() {
  const token = localStorage.getItem('splitzyToken');
  
  // State
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState(null);
  const [categories, setCategories] = useState(null);
  const [balances, setBalances] = useState(null);
  const [error, setError] = useState(null);
  
  // Filter state
  const [dateRange, setDateRange] = useState('month'); // week, month, quarter, year
  const [granularity, setGranularity] = useState('DAILY');
  const [showFilters, setShowFilters] = useState(false);
  
  // Get date range based on selection
  const getDateRange = useCallback(() => {
    const end = new Date();
    let start = new Date();
    
    switch (dateRange) {
      case 'week':
        start.setDate(end.getDate() - 7);
        break;
      case 'month':
        start.setMonth(end.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(end.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(end.getFullYear() - 1);
        break;
      default:
        start.setMonth(end.getMonth() - 1);
    }
    
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  }, [dateRange]);
  
  // Fetch all analytics data
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const { startDate, endDate } = getDateRange();
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch all endpoints in parallel
      const [summaryRes, trendsRes, categoriesRes, balancesRes] = await Promise.all([
        axios.get(`${API_URL}/analytics/summary?startDate=${startDate}&endDate=${endDate}`, { headers }),
        axios.get(`${API_URL}/analytics/trends?startDate=${startDate}&endDate=${endDate}&granularity=${granularity}&includeComparison=true`, { headers }),
        axios.get(`${API_URL}/analytics/categories?startDate=${startDate}&endDate=${endDate}`, { headers }),
        axios.get(`${API_URL}/analytics/balances`, { headers })
      ]);
      
      setSummary(summaryRes.data);
      setTrends(trendsRes.data);
      setCategories(categoriesRes.data);
      setBalances(balancesRes.data);
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [token, getDateRange, granularity]);
  
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);
  
  // Update granularity when date range changes
  useEffect(() => {
    switch (dateRange) {
      case 'week':
        setGranularity('DAILY');
        break;
      case 'month':
        setGranularity('DAILY');
        break;
      case 'quarter':
        setGranularity('WEEKLY');
        break;
      case 'year':
        setGranularity('MONTHLY');
        break;
      default:
        setGranularity('DAILY');
    }
  }, [dateRange]);
  
  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="loading-spinner"></div>
        <p>Loading analytics...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="analytics-error">
        <p>{error}</p>
        <button className="chip primary" onClick={fetchAnalytics}>
          <FiRefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  const balance = summary?.balance;
  const spending = summary?.spending;
  const quickStats = summary?.quickStats;
  const topCategories = summary?.topCategories || [];
  const recentExpenses = summary?.recentExpenses || [];
  const pendingActions = summary?.pendingActions || [];
  const friendBalances = balances?.friendBalances || [];
  const trendPoints = trends?.dataPoints || [];
  const trendSummary = trends?.summary;

  return (
    <div className="analytics-dashboard">
      {/* Header with filters */}
      <div className="analytics-header">
        <div className="analytics-title">
          <FiBarChart2 size={24} />
          <h2>Analytics Dashboard</h2>
        </div>
        
        <div className="analytics-controls">
          <div className="date-range-selector">
            {['week', 'month', 'quarter', 'year'].map(range => (
              <button
                key={range}
                className={`range-btn ${dateRange === range ? 'active' : ''}`}
                onClick={() => setDateRange(range)}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
          
          <button className="icon-btn" onClick={() => setShowFilters(!showFilters)} title="Filters">
            <FiFilter size={18} />
          </button>
          
          <button className="icon-btn" onClick={fetchAnalytics} title="Refresh">
            <FiRefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Balance Overview Cards */}
      <div className="analytics-cards">
        <div className="analytics-card balance-card">
          <div className="card-icon positive">
            <FiTrendingUp size={20} />
          </div>
          <div className="card-content">
            <span className="card-label">Owed to You</span>
            <span className="card-value positive">{formatCurrency(balance?.totalOwed)}</span>
            <span className="card-sub">{balance?.friendsOwingYou || 0} friends</span>
          </div>
        </div>
        
        <div className="analytics-card balance-card">
          <div className="card-icon negative">
            <FiTrendingDown size={20} />
          </div>
          <div className="card-content">
            <span className="card-label">You Owe</span>
            <span className="card-value negative">{formatCurrency(balance?.totalOwing)}</span>
            <span className="card-sub">{balance?.friendsYouOwe || 0} friends</span>
          </div>
        </div>
        
        <div className="analytics-card balance-card">
          <div className={`card-icon ${(balance?.netBalance || 0) >= 0 ? 'positive' : 'negative'}`}>
            <FiDollarSign size={20} />
          </div>
          <div className="card-content">
            <span className="card-label">Net Balance</span>
            <span className={`card-value ${(balance?.netBalance || 0) >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(balance?.netBalance)}
            </span>
            <span className="card-sub">Overall position</span>
          </div>
        </div>
        
        <div className="analytics-card spending-card">
          <div className="card-icon neutral">
            <FiActivity size={20} />
          </div>
          <div className="card-content">
            <span className="card-label">Total Spending</span>
            <span className="card-value">{formatCurrency(spending?.totalSpent)}</span>
            <span className="card-sub">{spending?.expenseCount || 0} expenses</span>
          </div>
        </div>
      </div>

      {/* Main Analytics Grid */}
      <div className="analytics-grid">
        {/* Spending Trend Chart */}
        <div className="analytics-section trend-section">
          <div className="section-header">
            <h3><FiTrendingUp size={18} /> Spending Trend</h3>
            {trendSummary && (
              <div className={`trend-badge ${trendSummary.trendDirection?.toLowerCase()}`}>
                {trendSummary.trendDirection === 'UP' && <FiArrowUp size={12} />}
                {trendSummary.trendDirection === 'DOWN' && <FiArrowDown size={12} />}
                {formatPercentChange(trendSummary.trendPercentage)}
              </div>
            )}
          </div>
          
          <div className="trend-chart">
            {trendPoints.length > 0 ? (
              <div className="chart-bars">
                {trendPoints.map((point, idx) => {
                  const maxVal = Math.max(...trendPoints.map(p => p.spending || 0), 1);
                  const height = ((point.spending || 0) / maxVal) * 100;
                  
                  return (
                    <div key={idx} className="chart-bar-container">
                      <div 
                        className="chart-bar" 
                        style={{ height: `${Math.max(height, 2)}%` }}
                        title={`${point.label}: ${formatCurrency(point.spending)}`}
                      >
                        <span className="bar-tooltip">{formatCurrency(point.spending)}</span>
                      </div>
                      <span className="bar-label">{point.label}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="no-data">No spending data for this period</div>
            )}
          </div>
          
          {trendSummary && (
            <div className="trend-stats">
              <div className="trend-stat">
                <span className="stat-label">Avg/Period</span>
                <span className="stat-value">{formatCurrency(trendSummary.averagePerPeriod)}</span>
              </div>
              <div className="trend-stat">
                <span className="stat-label">Highest</span>
                <span className="stat-value">{formatCurrency(trendSummary.highestPeriodAmount)}</span>
              </div>
              <div className="trend-stat">
                <span className="stat-label">Lowest</span>
                <span className="stat-value">{formatCurrency(trendSummary.lowestPeriodAmount)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="analytics-section category-section">
          <div className="section-header">
            <h3><FiPieChart size={18} /> Category Breakdown</h3>
          </div>
          
          <div className="category-list">
            {topCategories.length > 0 ? (
              topCategories.map((cat, idx) => (
                <div key={idx} className="category-item">
                  <div className="category-icon">{getCategoryIcon(cat.category)}</div>
                  <div className="category-info">
                    <span className="category-name">{cat.category || 'Other'}</span>
                    <div className="category-bar-container">
                      <div 
                        className="category-bar" 
                        style={{ width: `${Math.min(cat.percentage || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="category-stats">
                    <span className="category-amount">{formatCurrency(cat.amount)}</span>
                    <span className="category-percent">{(cat.percentage || 0).toFixed(1)}%</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-data">No category data available</div>
            )}
          </div>
        </div>

        {/* Friend Balances */}
        <div className="analytics-section balances-section">
          <div className="section-header">
            <h3><FiUsers size={18} /> Friend Balances</h3>
          </div>
          
          <div className="friend-balances-list">
            {friendBalances.length > 0 ? (
              friendBalances.slice(0, 6).map((fb, idx) => (
                <div key={idx} className="friend-balance-item">
                  <div className="friend-avatar">
                    {fb.friendName?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="friend-info">
                    <span className="friend-name">{fb.friendName || 'Unknown'}</span>
                    <span className="friend-expenses">{fb.sharedExpenses || 0} shared expenses</span>
                  </div>
                  <div className={`friend-balance ${fb.balance >= 0 ? 'positive' : 'negative'}`}>
                    {fb.balance >= 0 ? '+' : ''}{formatCurrency(fb.balance)}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-data">No balance data with friends</div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="analytics-section stats-section">
          <div className="section-header">
            <h3><FiLayers size={18} /> Quick Stats</h3>
          </div>
          
          <div className="quick-stats-grid">
            <div className="quick-stat">
              <FiUsers size={20} />
              <span className="stat-value">{quickStats?.totalFriends || 0}</span>
              <span className="stat-label">Friends</span>
            </div>
            <div className="quick-stat">
              <FiLayers size={20} />
              <span className="stat-value">{quickStats?.totalGroups || 0}</span>
              <span className="stat-label">Groups</span>
            </div>
            <div className="quick-stat">
              <FiActivity size={20} />
              <span className="stat-value">{quickStats?.totalExpenses || 0}</span>
              <span className="stat-label">Total Expenses</span>
            </div>
            <div className="quick-stat">
              <FiDollarSign size={20} />
              <span className="stat-value">{formatCurrency(quickStats?.lifetimeSpending)}</span>
              <span className="stat-label">Lifetime</span>
            </div>
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="analytics-section recent-section">
          <div className="section-header">
            <h3><FiClock size={18} /> Recent Expenses</h3>
          </div>
          
          <div className="recent-expenses-list">
            {recentExpenses.length > 0 ? (
              recentExpenses.map((exp, idx) => (
                <div key={idx} className="recent-expense-item">
                  <div className="expense-icon">{getCategoryIcon(exp.category)}</div>
                  <div className="expense-info">
                    <span className="expense-desc">{exp.description || 'Expense'}</span>
                    <span className="expense-date">{exp.date}</span>
                  </div>
                  <div className="expense-amounts">
                    <span className="expense-total">{formatCurrency(exp.amount)}</span>
                    <span className={`expense-share ${(exp.yourNet || 0) >= 0 ? 'positive' : 'negative'}`}>
                      {(exp.yourNet || 0) >= 0 ? '+' : ''}{formatCurrency(exp.yourNet)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-data">No recent expenses</div>
            )}
          </div>
        </div>

        {/* Pending Actions */}
        {pendingActions.length > 0 && (
          <div className="analytics-section pending-section">
            <div className="section-header">
              <h3><FiTarget size={18} /> Pending Actions</h3>
            </div>
            
            <div className="pending-actions-list">
              {pendingActions.map((action, idx) => (
                <div key={idx} className="pending-action-item">
                  <div className="action-icon">
                    <FiDollarSign size={16} />
                  </div>
                  <div className="action-info">
                    <span className="action-desc">{action.description}</span>
                    <span className="action-counterparty">{action.counterparty}</span>
                  </div>
                  <div className="action-amount">
                    {formatCurrency(action.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Period info */}
      <div className="analytics-footer">
        <span className="period-label">
          <FiCalendar size={14} />
          {summary?.periodLabel || 'Current Period'}
        </span>
        <span className="generated-at">
          Updated: {new Date(summary?.generatedAt).toLocaleString()}
        </span>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;

