import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { 
  FiTrendingUp, FiTrendingDown, FiPieChart, FiCalendar,
  FiRefreshCw, FiArrowUp, FiArrowDown, FiAlertCircle,
  FiZap, FiDollarSign, FiUsers, FiTarget, FiAward,
  FiActivity, FiGrid, FiStar, FiCheckCircle, FiFilter, FiX
} from 'react-icons/fi';
import './AnalyticsDashboard.css';

const API_URL = process.env.REACT_APP_API_URL;

// Category icons
const CATEGORY_ICONS = {
  food: '🍕', dining: '🍕', restaurant: '🍕',
  groceries: '🛒', shopping: '🛍️',
  transport: '🚗', transportation: '🚗', travel: '✈️',
  entertainment: '🎬', movies: '🎬',
  utilities: '⚡', bills: '📄',
  rent: '🏠', housing: '🏠',
  healthcare: '❤️', medical: '❤️',
  education: '📚', fitness: '💪', gym: '💪',
  subscriptions: '💳', gifts: '🎁', events: '🎉', pets: '🐕',
  other: '📋', general: '💰'
};

const CATEGORY_COLORS = [
  '#38bdf8', '#818cf8', '#fb7185', '#fbbf24', '#4ade80',
  '#f472b6', '#a78bfa', '#60a5fa', '#f97316', '#14b8a6'
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

function AnalyticsDashboard() {
  const token = localStorage.getItem('splitzyToken');
  const myUserId = localStorage.getItem('myUserId');
  
  // Get expenses from Redux for local calculations
  const expenses = useSelector((state) => state.expense.list);
  
  // API data
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState(null);
  const [balances, setBalances] = useState(null);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('month');
  const [granularity, setGranularity] = useState('DAILY');
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, settled, unsettled
  const [activeKPI, setActiveKPI] = useState(null); // For clickable KPIs
  
  // Get unique categories from expenses
  const availableCategories = useMemo(() => {
    const cats = new Set();
    expenses.forEach(exp => {
      if (exp.category) cats.add(exp.category);
    });
    return Array.from(cats).sort();
  }, [expenses]);
  
  // Filter expenses based on current filters
  const filteredExpenses = useMemo(() => {
    let result = [...expenses];
    
    // Apply date range filter
    const now = new Date();
    let startDate = new Date();
    switch (dateRange) {
      case 'week': startDate.setDate(now.getDate() - 7); break;
      case 'month': startDate.setMonth(now.getMonth() - 1); break;
      case 'quarter': startDate.setMonth(now.getMonth() - 3); break;
      case 'year': startDate.setFullYear(now.getFullYear() - 1); break;
      default: startDate.setMonth(now.getMonth() - 1);
    }
    result = result.filter(exp => {
      const expDate = new Date(exp.date || exp.createdAt);
      return expDate >= startDate && expDate <= now;
    });
    
    // Apply category filter
    if (filterCategory) {
      result = result.filter(exp => 
        exp.category?.toLowerCase() === filterCategory.toLowerCase()
      );
    }
    
    // Apply status filter
    if (filterStatus === 'settled') {
      result = result.filter(exp => exp.isSettled);
    } else if (filterStatus === 'unsettled') {
      result = result.filter(exp => !exp.isSettled);
    }
    
    // Apply KPI filter
    if (activeKPI === 'unsettled') {
      result = result.filter(exp => !exp.isSettled);
    } else if (activeKPI === 'personal') {
      result = result.filter(exp => exp.isPersonal);
    }
    
    return result;
  }, [expenses, dateRange, filterCategory, filterStatus, activeKPI]);
  
  const getDateRange = useCallback(() => {
    const end = new Date();
    let start = new Date();
    
    switch (dateRange) {
      case 'week': start.setDate(end.getDate() - 7); break;
      case 'month': start.setMonth(end.getMonth() - 1); break;
      case 'quarter': start.setMonth(end.getMonth() - 3); break;
      case 'year': start.setFullYear(end.getFullYear() - 1); break;
      default: start.setMonth(end.getMonth() - 1);
    }
    
    return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
  }, [dateRange]);
  
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const { startDate, endDate } = getDateRange();
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [summaryRes, trendsRes, balancesRes] = await Promise.all([
        axios.get(`${API_URL}/analytics/summary?startDate=${startDate}&endDate=${endDate}`, { headers }),
        axios.get(`${API_URL}/analytics/trends?startDate=${startDate}&endDate=${endDate}&granularity=${granularity}&includeComparison=true`, { headers }),
        axios.get(`${API_URL}/analytics/balances`, { headers })
      ]);
      
      setSummary(summaryRes.data);
      setTrends(trendsRes.data);
      setBalances(balancesRes.data);
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [token, getDateRange, granularity]);
  
  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);
  
  useEffect(() => {
    switch (dateRange) {
      case 'week': setGranularity('DAILY'); break;
      case 'month': setGranularity('DAILY'); break;
      case 'quarter': setGranularity('WEEKLY'); break;
      case 'year': setGranularity('MONTHLY'); break;
      default: setGranularity('DAILY');
    }
  }, [dateRange]);

  // ============ LOCAL CALCULATIONS FOR ADVANCED INSIGHTS ============
  
  // Calculate spending by day of week with proper scaling
  const weekdaySpending = useMemo(() => {
    const data = Array(7).fill(0);
    const counts = Array(7).fill(0);
    
    filteredExpenses.forEach(exp => {
      const date = new Date(exp.date || exp.createdAt);
      const day = date.getDay();
      const myPart = exp.participants?.find(p => p.userId === myUserId);
      if (myPart) {
        data[day] += myPart.share || 0;
        counts[day]++;
      }
    });
    
    const maxSpend = Math.max(...data, 1);
    return WEEKDAYS.map((name, i) => ({
      name,
      total: data[i],
      count: counts[i],
      intensity: maxSpend > 0 ? data[i] / maxSpend : 0
    }));
  }, [filteredExpenses, myUserId]);

  // Calculate group spending breakdown
  const groupSpending = useMemo(() => {
    const groups = {};
    
    filteredExpenses.forEach(exp => {
      if (exp.groupName) {
        const myPart = exp.participants?.find(p => p.userId === myUserId);
        if (myPart) {
          if (!groups[exp.groupName]) {
            groups[exp.groupName] = { name: exp.groupName, total: 0, count: 0 };
          }
          groups[exp.groupName].total += myPart.share || 0;
          groups[exp.groupName].count++;
        }
      }
    });
    
    return Object.values(groups).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [filteredExpenses, myUserId]);

  // Calculate top expense items (largest individual expenses)
  const topExpenses = useMemo(() => {
    return [...filteredExpenses]
      .filter(exp => exp.participants?.find(p => p.userId === myUserId))
      .sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0))
      .slice(0, 5)
      .map(exp => ({
        id: exp.id,
        description: exp.description,
        category: exp.category,
        amount: exp.totalAmount,
        date: exp.date || exp.createdAt,
        isSettled: exp.isSettled
      }));
  }, [filteredExpenses, myUserId]);

  // Calculate spending velocity (comparison with previous period)
  const spendingVelocity = useMemo(() => {
    const now = new Date();
    let periodDays = 30;
    if (dateRange === 'week') periodDays = 7;
    if (dateRange === 'quarter') periodDays = 90;
    if (dateRange === 'year') periodDays = 365;
    
    const currentStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const prevStart = new Date(currentStart.getTime() - periodDays * 24 * 60 * 60 * 1000);
    
    let currentSpend = 0;
    let prevSpend = 0;
    
    expenses.forEach(exp => {
      const date = new Date(exp.date || exp.createdAt);
      const myPart = exp.participants?.find(p => p.userId === myUserId);
      if (myPart) {
        const share = myPart.share || 0;
        if (date >= currentStart && date <= now) {
          currentSpend += share;
        } else if (date >= prevStart && date < currentStart) {
          prevSpend += share;
        }
      }
    });
    
    const change = prevSpend > 0 ? ((currentSpend - prevSpend) / prevSpend) * 100 : 0;
    
    return {
      current: currentSpend,
      previous: prevSpend,
      change,
      trend: change > 5 ? 'up' : change < -5 ? 'down' : 'stable'
    };
  }, [expenses, myUserId, dateRange]);

  // Calculate forecast (projected spending)
  const spendingForecast = useMemo(() => {
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let monthSpend = 0;
    
    expenses.forEach(exp => {
      const date = new Date(exp.date || exp.createdAt);
      if (date >= monthStart && date <= now) {
        const myPart = exp.participants?.find(p => p.userId === myUserId);
        if (myPart) {
          monthSpend += myPart.share || 0;
        }
      }
    });
    
    const dailyAvg = dayOfMonth > 0 ? monthSpend / dayOfMonth : 0;
    const projected = dailyAvg * daysInMonth;
    const daysRemaining = daysInMonth - dayOfMonth;
    
    return {
      currentSpend: monthSpend,
      dailyAvg,
      projected,
      daysRemaining
    };
  }, [expenses, myUserId]);

  // Settlement score (percentage of settled expenses)
  const settlementScore = useMemo(() => {
    let settled = 0;
    let total = 0;
    let unsettledCount = 0;
    
    filteredExpenses.forEach(exp => {
      const myPart = exp.participants?.find(p => p.userId === myUserId);
      if (myPart) {
        total++;
        if (exp.isSettled || myPart.fullySettled || Math.abs(myPart.net || 0) < 0.01) {
          settled++;
        } else {
          unsettledCount++;
        }
      }
    });
    
    return {
      percentage: total > 0 ? (settled / total) * 100 : 100,
      unsettledCount
    };
  }, [filteredExpenses, myUserId]);

  // Category breakdown from filtered expenses
  const categoryBreakdown = useMemo(() => {
    const categories = {};
    
    filteredExpenses.forEach(exp => {
      const cat = exp.category || 'other';
      const myPart = exp.participants?.find(p => p.userId === myUserId);
      if (myPart) {
        if (!categories[cat]) {
          categories[cat] = { category: cat, amount: 0, count: 0 };
        }
        categories[cat].amount += myPart.share || 0;
        categories[cat].count++;
      }
    });
    
    return Object.values(categories).sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses, myUserId]);

  const totalCategorySpend = categoryBreakdown.reduce((sum, c) => sum + c.amount, 0);

  // Personal vs Shared expense breakdown
  const expenseTypeBreakdown = useMemo(() => {
    let personal = { count: 0, amount: 0 };
    let shared = { count: 0, amount: 0 };
    
    filteredExpenses.forEach(exp => {
      const myPart = exp.participants?.find(p => p.userId === myUserId);
      const share = myPart?.share || 0;
      
      if (exp.isPersonal) {
        personal.count++;
        personal.amount += share;
      } else {
        shared.count++;
        shared.amount += share;
      }
    });
    
    const total = personal.amount + shared.amount;
    return {
      personal: { ...personal, percentage: total > 0 ? (personal.amount / total) * 100 : 0 },
      shared: { ...shared, percentage: total > 0 ? (shared.amount / total) * 100 : 0 },
      total
    };
  }, [filteredExpenses, myUserId]);

  // Monthly comparison data (current vs previous month)
  const monthlyComparison = useMemo(() => {
    const now = new Date();
    
    const months = [];
    // Get data for last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthName = monthStart.toLocaleString('default', { month: 'short' });
      
      let total = 0;
      expenses.forEach(exp => {
        const expDate = new Date(exp.date || exp.createdAt);
        if (expDate >= monthStart && expDate <= monthEnd) {
          const myPart = exp.participants?.find(p => p.userId === myUserId);
          if (myPart) {
            total += myPart.share || 0;
          }
        }
      });
      
      months.push({ name: monthName, amount: total, isCurrent: i === 0 });
    }
    
    const maxAmount = Math.max(...months.map(m => m.amount), 1);
    return months.map(m => ({ ...m, percentage: (m.amount / maxAmount) * 100 }));
  }, [expenses, myUserId]);

  // Payment status breakdown
  const paymentStatus = useMemo(() => {
    let settled = { count: 0, amount: 0 };
    let unsettled = { count: 0, amount: 0 };
    let partial = { count: 0, amount: 0 };
    
    filteredExpenses.forEach(exp => {
      const myPart = exp.participants?.find(p => p.userId === myUserId);
      if (!myPart) return;
      
      const share = myPart.share || 0;
      
      if (exp.isSettled || myPart.fullySettled) {
        settled.count++;
        settled.amount += share;
      } else if (myPart.settledAmount > 0 && myPart.settledAmount < share) {
        partial.count++;
        partial.amount += share;
      } else {
        unsettled.count++;
        unsettled.amount += share;
      }
    });
    
    return { settled, unsettled, partial };
  }, [filteredExpenses, myUserId]);

  // Spending streaks and patterns
  const spendingPatterns = useMemo(() => {
    const sortedExpenses = [...filteredExpenses]
      .filter(exp => exp.participants?.find(p => p.userId === myUserId))
      .sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));
    
    // Find biggest single day spend
    const dailySpending = {};
    sortedExpenses.forEach(exp => {
      const dateKey = new Date(exp.date || exp.createdAt).toDateString();
      const myPart = exp.participants?.find(p => p.userId === myUserId);
      if (!dailySpending[dateKey]) dailySpending[dateKey] = 0;
      dailySpending[dateKey] += myPart?.share || 0;
    });
    
    let biggestDay = { date: null, amount: 0 };
    Object.entries(dailySpending).forEach(([date, amount]) => {
      if (amount > biggestDay.amount) {
        biggestDay = { date, amount };
      }
    });
    
    // Count spending days
    const spendingDays = Object.keys(dailySpending).length;
    
    // Average per spending day
    const totalSpent = Object.values(dailySpending).reduce((sum, amt) => sum + amt, 0);
    const avgPerSpendingDay = spendingDays > 0 ? totalSpent / spendingDays : 0;
    
    return {
      biggestDay,
      spendingDays,
      avgPerSpendingDay,
      totalTransactions: sortedExpenses.length
    };
  }, [filteredExpenses, myUserId]);

  // Handle KPI click for filtering
  const handleKPIClick = (kpiType) => {
    setActiveKPI(activeKPI === kpiType ? null : kpiType);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilterCategory('');
    setFilterStatus('all');
    setActiveKPI(null);
  };

  const hasActiveFilters = filterCategory || filterStatus !== 'all' || activeKPI;

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
        <FiAlertCircle size={24} />
        <p>{error}</p>
        <button className="retry-btn" onClick={fetchAnalytics}>
          <FiRefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  const spending = summary?.spending;
  const friendBalances = balances?.friendBalances || [];
  const trendPoints = trends?.dataPoints || [];
  const trendSummary = trends?.summary;
  
  return (
    <div className="analytics-dashboard">
      {/* Header with filters */}
      <div className="analytics-header">
        <div className="analytics-title">
          <FiActivity size={18} />
          <h2>Spending Insights</h2>
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
          
          <button 
            className={`icon-btn filter-toggle ${showFilters ? 'active' : ''} ${hasActiveFilters ? 'has-filters' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            title="Toggle Filters"
          >
            <FiFilter size={14} />
            {hasActiveFilters && <span className="filter-badge"></span>}
          </button>
          
          <button className="icon-btn" onClick={fetchAnalytics} title="Refresh">
            <FiRefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Inline Filters Panel */}
      {showFilters && (
        <div className="inline-filters">
          <div className="filter-row">
            <div className="filter-item">
              <label><FiPieChart size={12} /> Category</label>
              <select 
                value={filterCategory} 
                onChange={(e) => setFilterCategory(e.target.value)}
                className="filter-select"
              >
                <option value="">All Categories</option>
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>{getCategoryIcon(cat)} {cat}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-item">
              <label><FiCheckCircle size={12} /> Status</label>
              <div className="filter-chips">
                {['all', 'settled', 'unsettled'].map(status => (
                  <button
                    key={status}
                    className={`filter-chip ${filterStatus === status ? 'active' : ''}`}
                    onClick={() => setFilterStatus(status)}
                  >
                    {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
            {hasActiveFilters && (
              <button className="clear-filters-btn" onClick={clearFilters}>
                <FiX size={12} /> Clear
              </button>
            )}
          </div>
          
          {activeKPI && (
            <div className="active-filter-tag">
              Filtering by: <strong>{activeKPI}</strong>
              <button onClick={() => setActiveKPI(null)}><FiX size={10} /></button>
            </div>
          )}
        </div>
      )}

      <div className="analytics-content">
        {/* KPI Row - Clickable Insights */}
        <div className="insight-cards">
          {/* Spending Velocity */}
          <div 
            className={`insight-card velocity ${spendingVelocity.trend} ${activeKPI === 'velocity' ? 'selected' : ''}`}
            onClick={() => handleKPIClick('velocity')}
            role="button"
            tabIndex={0}
          >
            <div className="insight-icon">
              {spendingVelocity.trend === 'up' ? <FiTrendingUp /> : 
               spendingVelocity.trend === 'down' ? <FiTrendingDown /> : <FiActivity />}
            </div>
            <div className="insight-content">
              <span className="insight-value">
                {spendingVelocity.change >= 0 ? '+' : ''}{spendingVelocity.change.toFixed(1)}%
              </span>
              <span className="insight-label">vs last period</span>
            </div>
          </div>
          
          {/* Daily Average */}
          <div 
            className={`insight-card highlight ${activeKPI === 'daily' ? 'selected' : ''}`}
            onClick={() => handleKPIClick('daily')}
            role="button"
            tabIndex={0}
          >
            <div className="insight-icon"><FiZap /></div>
            <div className="insight-content">
              <span className="insight-value">{formatCurrency(spending?.averagePerDay || spendingForecast.dailyAvg)}</span>
              <span className="insight-label">avg per day</span>
            </div>
          </div>
          
          {/* Monthly Forecast */}
          <div 
            className={`insight-card forecast ${activeKPI === 'forecast' ? 'selected' : ''}`}
            onClick={() => handleKPIClick('forecast')}
            role="button"
            tabIndex={0}
          >
            <div className="insight-icon"><FiTarget /></div>
            <div className="insight-content">
              <span className="insight-value">{formatCurrency(spendingForecast.projected)}</span>
              <span className="insight-label">projected this month</span>
            </div>
          </div>
          
          {/* Settlement Score - Clickable to filter unsettled */}
          <div 
            className={`insight-card score ${activeKPI === 'unsettled' ? 'selected' : ''}`}
            onClick={() => handleKPIClick('unsettled')}
            role="button"
            tabIndex={0}
          >
            <div className="insight-icon"><FiCheckCircle /></div>
            <div className="insight-content">
              <span className="insight-value">{settlementScore.percentage.toFixed(0)}%</span>
              <span className="insight-label">
                settled up {settlementScore.unsettledCount > 0 && `(${settlementScore.unsettledCount} pending)`}
              </span>
            </div>
          </div>
        </div>

        {/* Main Analytics Grid */}
        <div className="analytics-main-grid">
          {/* Spending Trend */}
          <div className="chart-section">
            <div className="section-header">
              <h3><FiTrendingUp size={14} /> Spending Trend</h3>
              {trendSummary && (
                <div className={`trend-badge ${trendSummary.trendDirection?.toLowerCase()}`}>
                  {trendSummary.trendDirection === 'UP' && <FiArrowUp size={10} />}
                  {trendSummary.trendDirection === 'DOWN' && <FiArrowDown size={10} />}
                  {Math.abs(trendSummary.trendPercentage || 0).toFixed(1)}%
                </div>
              )}
            </div>
            
            <div className="trend-chart-area">
              {trendPoints.length > 0 ? (
                <div className="area-chart">
                  <svg viewBox="0 0 400 120" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4"/>
                        <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.05"/>
                      </linearGradient>
                    </defs>
                    {(() => {
                      const maxVal = Math.max(...trendPoints.map(p => p.spending || 0), 1);
                      const points = trendPoints.map((p, i) => {
                        const x = (i / Math.max(trendPoints.length - 1, 1)) * 400;
                        const y = 110 - ((p.spending || 0) / maxVal) * 100;
                        return `${x},${y}`;
                      }).join(' ');
                      const areaPath = `M0,110 L${points} L400,110 Z`;
                      return (
                        <>
                          <path d={areaPath} fill="url(#areaGradient)" />
                          <polyline points={points} fill="none" stroke="#38bdf8" strokeWidth="2" />
                        </>
                      );
                    })()}
                  </svg>
                  <div className="chart-labels">
                    {trendPoints.filter((_, i) => i % Math.ceil(trendPoints.length / 5) === 0).map((p, i) => (
                      <span key={i}>{p.label}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="no-data">No spending data for this period</div>
              )}
            </div>
            
            {trendSummary && (
              <div className="chart-stats">
                <div className="chart-stat">
                  <span className="stat-value">{formatCurrency(trendSummary.highestPeriodAmount)}</span>
                  <span className="stat-label">Peak</span>
                </div>
                <div className="chart-stat">
                  <span className="stat-value">{formatCurrency(trendSummary.averagePerPeriod)}</span>
                  <span className="stat-label">Average</span>
                </div>
                <div className="chart-stat">
                  <span className="stat-value">{formatCurrency(trendSummary.lowestPeriodAmount)}</span>
                  <span className="stat-label">Low</span>
                </div>
              </div>
            )}
          </div>

          {/* Category Breakdown with Donut */}
          <div className="category-section">
            <div className="section-header">
              <h3><FiPieChart size={14} /> Category Breakdown</h3>
            </div>
            
            <div className="category-visual">
              {categoryBreakdown.length > 0 ? (
                <>
                  <div className="donut-chart">
                    <svg viewBox="0 0 100 100">
                      {(() => {
                        let cumulative = 0;
                        return categoryBreakdown.slice(0, 6).map((cat, i) => {
                          const pct = totalCategorySpend > 0 ? (cat.amount / totalCategorySpend) * 100 : 0;
                          const start = cumulative;
                          cumulative += pct;
                          const r = 38;
                          const circumference = 2 * Math.PI * r;
                          const offset = (start / 100) * circumference;
                          const length = (pct / 100) * circumference;
                          
                          return (
                            <circle
                              key={i}
                              cx="50" cy="50" r={r}
                              fill="none"
                              stroke={CATEGORY_COLORS[i]}
                              strokeWidth="12"
                              strokeDasharray={`${length} ${circumference - length}`}
                              strokeDashoffset={-offset}
                              transform="rotate(-90 50 50)"
                              style={{ cursor: 'pointer' }}
                              onClick={() => setFilterCategory(filterCategory === cat.category ? '' : cat.category)}
                            />
                          );
                        });
                      })()}
                      <text x="50" y="46" textAnchor="middle" className="donut-total">
                        {formatCurrency(totalCategorySpend)}
                      </text>
                      <text x="50" y="57" textAnchor="middle" className="donut-label">
                        total
                      </text>
                    </svg>
                  </div>
                  
                  <div className="category-legend">
                    {categoryBreakdown.slice(0, 6).map((cat, i) => (
                      <div 
                        key={i} 
                        className={`legend-item ${filterCategory === cat.category ? 'active' : ''}`}
                        onClick={() => setFilterCategory(filterCategory === cat.category ? '' : cat.category)}
                        role="button"
                        tabIndex={0}
                      >
                        <span className="legend-dot" style={{ background: CATEGORY_COLORS[i] }} />
                        <span className="legend-icon">{getCategoryIcon(cat.category)}</span>
                        <span className="legend-name">{cat.category}</span>
                        <span className="legend-amount">{formatCurrency(cat.amount)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="no-data">No category data</div>
              )}
            </div>
          </div>
        </div>

        {/* Secondary Grid - Heatmap, Groups, Top Expenses */}
        <div className="analytics-secondary-grid">
          {/* Weekday Heatmap - Fixed */}
          <div className="heatmap-section">
            <div className="section-header">
              <h3><FiGrid size={14} /> Spending by Day</h3>
            </div>
            
            <div className="weekday-heatmap">
              {weekdaySpending.map((day, i) => {
                const barHeight = Math.max(day.intensity * 100, 5);
                return (
                  <div key={i} className="heatmap-cell">
                    <div 
                      className="heatmap-bar"
                      style={{ 
                        height: `${barHeight}%`,
                        background: day.total > 0 
                          ? `linear-gradient(to top, rgba(56, 189, 248, ${0.3 + day.intensity * 0.7}), rgba(129, 140, 248, ${0.3 + day.intensity * 0.7}))`
                          : 'rgba(255,255,255,0.1)'
                      }}
                    >
                      <span className="heatmap-value">{formatCurrency(day.total)}</span>
                    </div>
                    <span className="heatmap-label">{day.name}</span>
                  </div>
                );
              })}
            </div>
            
            <div className="heatmap-insight">
              <FiStar size={12} />
              <span>
                {(() => {
                  const maxDay = weekdaySpending.reduce((max, d) => d.total > max.total ? d : max, weekdaySpending[0]);
                  return maxDay.total > 0 
                    ? `${maxDay.name} is your highest spending day`
                    : 'No spending data for this period';
                })()}
              </span>
            </div>
          </div>

          {/* Group Breakdown */}
          <div className="groups-section">
            <div className="section-header">
              <h3><FiUsers size={14} /> Group Spending</h3>
            </div>
            
            <div className="group-list">
              {groupSpending.length > 0 ? (
                groupSpending.map((group, i) => (
                  <div key={i} className="group-item">
                    <div className="group-avatar" style={{ 
                      background: `linear-gradient(135deg, ${CATEGORY_COLORS[i]}, ${CATEGORY_COLORS[(i + 1) % CATEGORY_COLORS.length]})`
                    }}>
                      {group.name.charAt(0)}
                    </div>
                    <div className="group-info">
                      <span className="group-name">{group.name}</span>
                      <span className="group-count">{group.count} expenses</span>
                    </div>
                    <span className="group-amount">{formatCurrency(group.total)}</span>
                  </div>
                ))
              ) : (
                <div className="no-data">No group expenses</div>
              )}
            </div>
          </div>

          {/* Top Expenses */}
          <div className="top-expenses-section">
            <div className="section-header">
              <h3><FiAward size={14} /> Top Expenses</h3>
            </div>
            
            <div className="top-expenses-list">
              {topExpenses.length > 0 ? (
                topExpenses.map((exp, i) => (
                  <div key={exp.id || i} className={`top-expense-item ${exp.isSettled ? 'settled' : ''}`}>
                    <span className="expense-rank">#{i + 1}</span>
                    <span className="expense-icon">{getCategoryIcon(exp.category)}</span>
                    <div className="expense-info">
                      <span className="expense-name">{exp.description}</span>
                      <span className="expense-date">
                        {new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {exp.isSettled && <span className="settled-badge">Settled</span>}
                      </span>
                    </div>
                    <span className="expense-amount">{formatCurrency(exp.amount)}</span>
                  </div>
                ))
              ) : (
                <div className="no-data">No expenses found</div>
              )}
            </div>
          </div>
        </div>

        {/* Settlement Status Row */}
        <div className="settlement-row">
          <div className="settlement-section full-width">
            <div className="section-header">
              <h3><FiDollarSign size={14} /> Friend Balances</h3>
            </div>
            
            <div className="settlement-grid">
              {friendBalances.length > 0 ? (
                friendBalances.slice(0, 6).map((fb, idx) => {
                  const isOwed = fb.balance >= 0;
                  const maxBalance = Math.max(...friendBalances.map(f => Math.abs(f.balance)), 1);
                  const barWidth = Math.min((Math.abs(fb.balance) / maxBalance) * 100, 100);
                  
                  return (
                    <div key={idx} className="settlement-card">
                      <div className="settlement-avatar" style={{ 
                        background: isOwed ? 'linear-gradient(135deg, #4ade80, #22c55e)' : 'linear-gradient(135deg, #fb7185, #ef4444)'
                      }}>
                        {fb.friendName?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="settlement-details">
                        <span className="settlement-name">{fb.friendName}</span>
                        <div className="settlement-bar-container">
                          <div 
                            className={`settlement-bar ${isOwed ? 'positive' : 'negative'}`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                      <span className={`settlement-amount ${isOwed ? 'positive' : 'negative'}`}>
                        {isOwed ? '+' : ''}{formatCurrency(fb.balance)}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="no-data centered">All settled up! 🎉</div>
              )}
            </div>
          </div>
        </div>

        {/* Advanced Analytics Grid */}
        <div className="analytics-advanced-grid">
          {/* Monthly Comparison Bar Chart */}
          <div className="monthly-comparison-section">
            <div className="section-header">
              <h3><FiCalendar size={14} /> Monthly Comparison</h3>
            </div>
            
            <div className="monthly-bars">
              {monthlyComparison.map((month, i) => (
                <div key={i} className={`month-bar-wrapper ${month.isCurrent ? 'current' : ''}`}>
                  <div 
                    className="month-bar"
                    style={{ height: `${Math.max(month.percentage, 5)}%` }}
                  >
                    <span className="month-bar-value">{formatCurrency(month.amount)}</span>
                  </div>
                  <span className="month-bar-label">{month.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Personal vs Shared Breakdown */}
          <div className="expense-type-section">
            <div className="section-header">
              <h3><FiUsers size={14} /> Personal vs Shared</h3>
            </div>
            
            <div className="expense-type-visual">
              <div className="type-donut">
                <svg viewBox="0 0 100 100">
                  <circle
                    cx="50" cy="50" r="40"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50" cy="50" r="40"
                    fill="none"
                    stroke="#818cf8"
                    strokeWidth="8"
                    strokeDasharray={`${(expenseTypeBreakdown.personal.percentage / 100) * 251.2} 251.2`}
                    strokeDashoffset="0"
                    transform="rotate(-90 50 50)"
                  />
                  <circle
                    cx="50" cy="50" r="40"
                    fill="none"
                    stroke="#4ade80"
                    strokeWidth="8"
                    strokeDasharray={`${(expenseTypeBreakdown.shared.percentage / 100) * 251.2} 251.2`}
                    strokeDashoffset={`${-(expenseTypeBreakdown.personal.percentage / 100) * 251.2}`}
                    transform="rotate(-90 50 50)"
                  />
                  <text x="50" y="48" textAnchor="middle" className="donut-count">
                    {filteredExpenses.length}
                  </text>
                  <text x="50" y="58" textAnchor="middle" className="donut-sublabel">
                    expenses
                  </text>
                </svg>
              </div>
              
              <div className="type-legend">
                <div 
                  className={`type-item ${activeKPI === 'personal' ? 'active' : ''}`}
                  onClick={() => handleKPIClick('personal')}
                >
                  <span className="type-dot" style={{ background: '#818cf8' }}></span>
                  <div className="type-info">
                    <span className="type-label">👤 Personal</span>
                    <span className="type-value">{formatCurrency(expenseTypeBreakdown.personal.amount)}</span>
                  </div>
                  <span className="type-count">{expenseTypeBreakdown.personal.count}</span>
                </div>
                
                <div className="type-item">
                  <span className="type-dot" style={{ background: '#4ade80' }}></span>
                  <div className="type-info">
                    <span className="type-label">👥 Shared</span>
                    <span className="type-value">{formatCurrency(expenseTypeBreakdown.shared.amount)}</span>
                  </div>
                  <span className="type-count">{expenseTypeBreakdown.shared.count}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Status */}
          <div className="payment-status-section">
            <div className="section-header">
              <h3><FiCheckCircle size={14} /> Payment Status</h3>
            </div>
            
            <div className="payment-status-bars">
              <div className="status-bar-item">
                <div className="status-bar-header">
                  <span className="status-label">✓ Settled</span>
                  <span className="status-value">{formatCurrency(paymentStatus.settled.amount)}</span>
                </div>
                <div className="status-bar-track">
                  <div 
                    className="status-bar-fill settled"
                    style={{ width: `${paymentStatus.settled.amount > 0 ? Math.max((paymentStatus.settled.amount / (paymentStatus.settled.amount + paymentStatus.unsettled.amount + paymentStatus.partial.amount)) * 100, 5) : 0}%` }}
                  ></div>
                </div>
                <span className="status-count">{paymentStatus.settled.count} expenses</span>
              </div>
              
              <div className="status-bar-item">
                <div className="status-bar-header">
                  <span className="status-label">⏳ Pending</span>
                  <span className="status-value">{formatCurrency(paymentStatus.unsettled.amount)}</span>
                </div>
                <div className="status-bar-track">
                  <div 
                    className="status-bar-fill pending"
                    style={{ width: `${paymentStatus.unsettled.amount > 0 ? Math.max((paymentStatus.unsettled.amount / (paymentStatus.settled.amount + paymentStatus.unsettled.amount + paymentStatus.partial.amount)) * 100, 5) : 0}%` }}
                  ></div>
                </div>
                <span className="status-count">{paymentStatus.unsettled.count} expenses</span>
              </div>
            </div>
          </div>
        </div>

        {/* Spending Insights Row */}
        <div className="spending-insights-row">
          <div className="insight-stat-card">
            <div className="stat-icon">🔥</div>
            <div className="stat-info">
              <span className="stat-number">{spendingPatterns.spendingDays}</span>
              <span className="stat-text">days with spending</span>
            </div>
          </div>
          
          <div className="insight-stat-card">
            <div className="stat-icon">💸</div>
            <div className="stat-info">
              <span className="stat-number">{formatCurrency(spendingPatterns.avgPerSpendingDay)}</span>
              <span className="stat-text">avg per spending day</span>
            </div>
          </div>
          
          <div className="insight-stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <span className="stat-number">{spendingPatterns.totalTransactions}</span>
              <span className="stat-text">total transactions</span>
            </div>
          </div>
          
          {spendingPatterns.biggestDay.date && (
            <div className="insight-stat-card highlight">
              <div className="stat-icon">🏆</div>
              <div className="stat-info">
                <span className="stat-number">{formatCurrency(spendingPatterns.biggestDay.amount)}</span>
                <span className="stat-text">biggest spending day</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="analytics-footer">
          <span className="period-info">
            <FiCalendar size={12} />
            {summary?.periodLabel || 'Current Period'}
            {hasActiveFilters && ` • ${filteredExpenses.length} expenses filtered`}
          </span>
          <span className="update-time">
            Updated: {new Date(summary?.generatedAt || Date.now()).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
