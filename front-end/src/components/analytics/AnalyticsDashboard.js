import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
  FiTrendingUp, FiTrendingDown, FiPieChart, FiCalendar,
  FiRefreshCw, FiArrowUp, FiArrowDown, FiAlertCircle,
  FiZap, FiDollarSign, FiUsers, FiTarget, FiAward,
  FiActivity, FiGrid, FiStar, FiCheckCircle, FiFilter, FiX,
  FiUser, FiInfo
} from 'react-icons/fi';
import api, { cachedGet, invalidateCache } from '../../services/api';
import './AnalyticsDashboard.css';

const API_URL = process.env.REACT_APP_API_URL;

// ============ TOOLTIP COMPONENT ============
const Tooltip = ({ children, content, position = 'top' }) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const ref = useRef(null);
  
  const handleMouseEnter = (e) => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setCoords({
        x: rect.left + rect.width / 2,
        y: position === 'top' ? rect.top : rect.bottom
      });
    }
    setVisible(true);
  };
  
  return (
    <span 
      ref={ref}
      className="tooltip-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && content && (
        <div className={`tooltip-content tooltip-${position}`} style={{ 
          left: coords.x,
          top: position === 'top' ? coords.y - 8 : coords.y + 8
        }}>
          {content}
        </div>
      )}
    </span>
  );
};

// ============ INSIGHT DESCRIPTIONS ============
const INSIGHT_TOOLTIPS = {
  velocity: "Compares your spending in the current period vs the previous equivalent period. A positive value means you're spending more.",
  daily: "Your average daily spending based on your expenses in the selected time range.",
  forecast: `Projected total for this period. Calculated using your average spending per active day (${new Date().getDate()} days so far), projecting remaining days at 70% activity rate.`,
  settlement: "Percentage of expenses that have been fully settled. Click to filter and see pending expenses.",
  category: "Breakdown of your spending by category. Click a category to filter all data by it.",
  trend: "Visual representation of your spending over time. Higher peaks indicate higher spending days.",
  weekday: "Spending patterns by day of week. Helps identify which days you tend to spend more.",
  group: "Spending breakdown by group. Shows which groups have the highest shared expenses.",
  friend: "Balance summary with each friend. Positive means they owe you, negative means you owe them.",
  personal: "Personal expenses are tracked only for yourself and not shared with others.",
  monthly: "Month-over-month spending comparison for the last 6 months."
};

// ============ CACHE CONFIG ============
const ANALYTICS_CACHE_TTL = 60000; // 1 minute cache for analytics data

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
  const [retryCount, setRetryCount] = useState(0);
  const [dateRange, setDateRange] = useState('month');
  const [granularity, setGranularity] = useState('DAILY');
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, settled, unsettled
  const [activeKPI, setActiveKPI] = useState(null); // For clickable KPIs
  
  // Friend and Group filter states
  const [filterFriend, setFilterFriend] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [friends, setFriends] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  
  // Fetch friends and groups for filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      if (!myUserId || !token) return;
      setLoadingFilters(true);
      
      try {
        const [friendsRes, groupsRes] = await Promise.all([
          cachedGet(`/home/friends?userId=${myUserId}`, {}, ANALYTICS_CACHE_TTL * 5),
          cachedGet(`/groups/${myUserId}`, {}, ANALYTICS_CACHE_TTL * 5)
        ]);
        
        setFriends(friendsRes.data || []);
        setGroups(groupsRes.data || []);
      } catch (err) {
        console.warn('Failed to fetch filter options:', err.message);
        // Non-critical error, don't block the UI
      } finally {
        setLoadingFilters(false);
      }
    };
    
    fetchFilterOptions();
  }, [myUserId, token]);
  
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
    
    // Apply friend filter - show expenses where this friend is a participant
    if (filterFriend) {
      result = result.filter(exp => 
        exp.participants?.some(p => p.userId === filterFriend)
      );
    }
    
    // Apply group filter
    if (filterGroup) {
      result = result.filter(exp => exp.groupId === filterGroup);
    }
    
    // Apply KPI filter
    if (activeKPI === 'unsettled') {
      result = result.filter(exp => !exp.isSettled);
    } else if (activeKPI === 'personal') {
      result = result.filter(exp => exp.isPersonal);
    }
    
    return result;
  }, [expenses, dateRange, filterCategory, filterStatus, filterFriend, filterGroup, activeKPI]);
  
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
  
  // Track if initial load is complete to enable background refreshes
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async (forceRefresh = false, backgroundRefresh = false) => {
    // For background refresh, don't show loading spinner - just update data silently
    if (backgroundRefresh && initialLoadComplete) {
      setIsBackgroundRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    const { startDate, endDate } = getDateRange();

    // Invalidate cache if force refresh
    if (forceRefresh) {
      invalidateCache('/analytics');
    }

    try {
      // Use cached API calls for better performance
      const fetchFn = forceRefresh ? api.get.bind(api) :
        (url) => cachedGet(url, {}, ANALYTICS_CACHE_TTL);

      const [summaryRes, trendsRes, balancesRes] = await Promise.allSettled([
        fetchFn(`/analytics/summary?startDate=${startDate}&endDate=${endDate}`),
        fetchFn(`/analytics/trends?startDate=${startDate}&endDate=${endDate}&granularity=${granularity}&includeComparison=true`),
        fetchFn(`/analytics/balances`)
      ]);

      // Handle partial failures gracefully
      if (summaryRes.status === 'fulfilled') {
        setSummary(summaryRes.value.data);
      } else {
        console.warn('Summary fetch failed:', summaryRes.reason?.message);
      }

      if (trendsRes.status === 'fulfilled') {
        setTrends(trendsRes.value.data);
      } else {
        console.warn('Trends fetch failed:', trendsRes.reason?.message);
      }

      if (balancesRes.status === 'fulfilled') {
        setBalances(balancesRes.value.data);
      } else {
        console.warn('Balances fetch failed:', balancesRes.reason?.message);
      }

      // Only show error if ALL requests failed AND it's not a background refresh
      const allFailed = [summaryRes, trendsRes, balancesRes].every(r => r.status === 'rejected');
      if (allFailed && !backgroundRefresh) {
        const errorMsg = summaryRes.reason?.response?.status === 429
          ? 'Too many requests. Please wait a moment and try again.'
          : 'Failed to load analytics data. Please try again.';
        setError(errorMsg);
        setRetryCount(prev => prev + 1);
      } else {
        setRetryCount(0);
      }

      // Mark initial load as complete
      if (!initialLoadComplete) {
        setInitialLoadComplete(true);
      }

    } catch (err) {
      console.error('Analytics fetch error:', err);
      // Don't show errors for background refreshes
      if (!backgroundRefresh) {
        const errorMsg = err.response?.status === 429
          ? 'Rate limit exceeded. Please wait and try again.'
          : err.response?.status === 401
          ? 'Session expired. Please log in again.'
          : 'Failed to load analytics data';
        setError(errorMsg);
        setRetryCount(prev => prev + 1);
      }
    } finally {
      setLoading(false);
      setIsBackgroundRefreshing(false);
    }
  }, [token, getDateRange, granularity, initialLoadComplete]);
  
  // Initial fetch - show loading spinner
  useEffect(() => {
    if (!initialLoadComplete) {
      fetchAnalytics();
    }
  }, []); // Only run once on mount

  // When dateRange or granularity changes, do a background refresh (no loading spinner)
  useEffect(() => {
    if (initialLoadComplete) {
      console.log('[Analytics] Filter changed - background refreshing');
      invalidateCache('/analytics');
      fetchAnalytics(true, true);
    }
  }, [dateRange, granularity]); // Only trigger when these specific filters change

  // Listen for real-time expense events via Redux socket state and refresh analytics in background
  const lastSocketEvent = useSelector((state) => state.socket.lastEvent);

  useEffect(() => {
    if (!lastSocketEvent) return;

    // Handle expense events that should trigger analytics refresh - do it in background
    if (lastSocketEvent.eventType === 'EXPENSE_EVENT') {
      const eventType = lastSocketEvent.payload?.type;
      if (['EXPENSE_CREATED', 'EXPENSE_UPDATED', 'EXPENSE_DELETED', 'EXPENSE_SETTLED'].includes(eventType)) {
        console.log('[Analytics] Expense event received:', eventType, '- background refreshing analytics');
        invalidateCache('/analytics');
        // Use background refresh to avoid disrupting user interaction
        fetchAnalytics(true, true);
      }
    }
  }, [lastSocketEvent, fetchAnalytics]);

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

  // Calculate forecast (projected spending) - uses filtered expenses for accuracy
  const spendingForecast = useMemo(() => {
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - dayOfMonth;
    
    // Use filtered expenses for the current period
    const periodExpenses = filteredExpenses.length > 0 ? filteredExpenses : expenses;
    
    // Calculate spending within the date range
    let periodSpend = 0;
    let spendingDays = new Set();
    
    periodExpenses.forEach(exp => {
      const date = new Date(exp.date || exp.createdAt);
      const myPart = exp.participants?.find(p => p.userId === myUserId);
      if (myPart) {
        periodSpend += myPart.share || 0;
        spendingDays.add(date.toDateString());
      }
    });
    
    // Calculate projection based on actual spending days, not calendar days
    const activeDays = spendingDays.size || 1;
    const avgPerActiveDay = periodSpend / activeDays;
    
    // Project remaining spending based on expected active days
    // Assume ~70% of remaining days will have spending activity
    const expectedActiveDaysRemaining = Math.ceil(daysRemaining * 0.7);
    const projectedRemaining = avgPerActiveDay * expectedActiveDaysRemaining;
    const projected = periodSpend + projectedRemaining;
    
    return {
      currentSpend: periodSpend,
      dailyAvg: avgPerActiveDay,
      projected: projected,
      daysRemaining,
      activeDays
    };
  }, [filteredExpenses, expenses, myUserId]);

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
    setFilterFriend('');
    setFilterGroup('');
    setActiveKPI(null);
  };

  const hasActiveFilters = filterCategory || filterStatus !== 'all' || filterFriend || filterGroup || activeKPI;
  
  // Get active filter summary for display
  const activeFilterSummary = useMemo(() => {
    const parts = [];
    if (filterCategory) parts.push(`Category: ${filterCategory}`);
    if (filterStatus !== 'all') parts.push(`Status: ${filterStatus}`);
    if (filterFriend) {
      const friend = friends.find(f => f.id === filterFriend);
      parts.push(`Friend: ${friend?.name || 'Unknown'}`);
    }
    if (filterGroup) {
      const group = groups.find(g => g.id === filterGroup);
      parts.push(`Group: ${group?.groupName || 'Unknown'}`);
    }
    if (activeKPI) parts.push(`KPI: ${activeKPI}`);
    return parts.join(' • ');
  }, [filterCategory, filterStatus, filterFriend, filterGroup, activeKPI, friends, groups]);

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
          
          <button
            className={`icon-btn ${isBackgroundRefreshing ? 'refreshing' : ''}`}
            onClick={() => fetchAnalytics(true, true)}
            title={isBackgroundRefreshing ? "Refreshing..." : "Refresh"}
            disabled={isBackgroundRefreshing}
          >
            <FiRefreshCw size={14} className={isBackgroundRefreshing ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Inline Filters Panel */}
      {showFilters && (
        <div className="inline-filters">
          <div className="filter-row">
            <div className="filter-item">
              <Tooltip content="Filter expenses by spending category">
                <label><FiPieChart size={12} /> Category</label>
              </Tooltip>
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
              <Tooltip content="Filter by payment settlement status">
                <label><FiCheckCircle size={12} /> Status</label>
              </Tooltip>
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
            
            <div className="filter-item">
              <Tooltip content="Filter expenses shared with a specific friend">
                <label><FiUser size={12} /> Friend</label>
              </Tooltip>
              <select 
                value={filterFriend} 
                onChange={(e) => setFilterFriend(e.target.value)}
                className="filter-select"
                disabled={loadingFilters}
              >
                <option value="">All Friends</option>
                {friends.map(friend => (
                  <option key={friend.id} value={friend.id}>{friend.name}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-item">
              <Tooltip content="Filter expenses from a specific group">
                <label><FiUsers size={12} /> Group</label>
              </Tooltip>
              <select 
                value={filterGroup} 
                onChange={(e) => setFilterGroup(e.target.value)}
                className="filter-select"
                disabled={loadingFilters}
              >
                <option value="">All Groups</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>{group.groupName}</option>
                ))}
              </select>
            </div>
            
            {hasActiveFilters && (
              <button className="clear-filters-btn" onClick={clearFilters}>
                <FiX size={12} /> Clear All
              </button>
            )}
          </div>
          
          {hasActiveFilters && (
            <div className="active-filter-tag">
              <FiFilter size={10} /> Active: <strong>{activeFilterSummary}</strong>
              <span className="filter-count">{filteredExpenses.length} expenses</span>
            </div>
          )}
        </div>
      )}

      <div className="analytics-content">
        {/* Hero KPI Row - Main Metrics */}
        <div className="hero-kpi-section">
          <div className="hero-kpi-grid">
            <Tooltip content="Total amount spent across all expenses in this period" position="bottom">
              <div className="hero-kpi total">
                <span className="hero-emoji">💰</span>
                <div className="hero-kpi-content">
                  <span className="hero-kpi-value">{formatCurrency(spending?.totalSpent || 0)}</span>
                  <span className="hero-kpi-label">Total Spent</span>
                </div>
              </div>
            </Tooltip>
            
            <Tooltip content="Number of transactions in the selected period" position="bottom">
              <div className="hero-kpi count">
                <span className="hero-emoji">📊</span>
                <div className="hero-kpi-content">
                  <span className="hero-kpi-value">{filteredExpenses.length}</span>
                  <span className="hero-kpi-label">Transactions</span>
                </div>
              </div>
            </Tooltip>
            
            <Tooltip content={INSIGHT_TOOLTIPS.forecast} position="bottom">
              <div className="hero-kpi forecast">
                <span className="hero-emoji">🎯</span>
                <div className="hero-kpi-content">
                  <span className="hero-kpi-value">{formatCurrency(spendingForecast.projected)}</span>
                  <span className="hero-kpi-label">Projected</span>
                </div>
              </div>
            </Tooltip>
            
            <Tooltip content="Your highest spending day in this period" position="bottom">
              <div className="hero-kpi peak">
                <span className="hero-emoji">🏆</span>
                <div className="hero-kpi-content">
                  <span className="hero-kpi-value">{formatCurrency(spendingPatterns.biggestDay.amount || 0)}</span>
                  <span className="hero-kpi-label">Peak Day</span>
                </div>
              </div>
            </Tooltip>
            
            <Tooltip content={INSIGHT_TOOLTIPS.settlement} position="bottom">
              <div 
                className={`hero-kpi settlement ${activeKPI === 'unsettled' ? 'selected' : ''}`}
                onClick={() => handleKPIClick('unsettled')}
                role="button"
                tabIndex={0}
              >
                <span className="hero-emoji">✅</span>
                <div className="hero-kpi-content">
                  <span className="hero-kpi-value">{settlementScore.percentage.toFixed(0)}%</span>
                  <span className="hero-kpi-label">Settled</span>
                </div>
              </div>
            </Tooltip>
            
            <Tooltip content={INSIGHT_TOOLTIPS.velocity} position="bottom">
              <div className={`hero-kpi velocity ${spendingVelocity.trend}`}>
                <span className="hero-emoji">{spendingVelocity.trend === 'up' ? '📈' : spendingVelocity.trend === 'down' ? '📉' : '➡️'}</span>
                <div className="hero-kpi-content">
                  <span className="hero-kpi-value">{spendingVelocity.change >= 0 ? '+' : ''}{spendingVelocity.change.toFixed(0)}%</span>
                  <span className="hero-kpi-label">vs Last Period</span>
                </div>
              </div>
            </Tooltip>
          </div>
        </div>

        {/* Top Charts Row: Monthly Comparison, Personal vs Shared, Payment Status */}
        <div className="analytics-top-charts">
          {/* Monthly Comparison Bar Chart */}
          <div className="chart-panel monthly-panel">
            <div className="section-header">
              <h3><FiCalendar size={14} /> Monthly Comparison</h3>
            </div>
            
            <div className="monthly-bars compact">
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
          <div className="chart-panel personal-shared-panel">
            <div className="section-header">
              <h3><FiUsers size={14} /> Personal vs Shared</h3>
            </div>
            
            <div className="expense-type-compact">
              <div className="type-donut-mini">
                <svg viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10"/>
                  <circle
                    cx="50" cy="50" r="40" fill="none" stroke="#818cf8" strokeWidth="10"
                    strokeDasharray={`${(expenseTypeBreakdown.personal.percentage / 100) * 251.2} 251.2`}
                    transform="rotate(-90 50 50)"
                  />
                  <circle
                    cx="50" cy="50" r="40" fill="none" stroke="#4ade80" strokeWidth="10"
                    strokeDasharray={`${(expenseTypeBreakdown.shared.percentage / 100) * 251.2} 251.2`}
                    strokeDashoffset={`${-(expenseTypeBreakdown.personal.percentage / 100) * 251.2}`}
                    transform="rotate(-90 50 50)"
                  />
                  <text x="50" y="48" textAnchor="middle" className="donut-count">{filteredExpenses.length}</text>
                  <text x="50" y="58" textAnchor="middle" className="donut-sublabel">expenses</text>
                </svg>
              </div>
              <div className="type-legend-compact">
                <div className={`type-row ${activeKPI === 'personal' ? 'active' : ''}`} onClick={() => handleKPIClick('personal')}>
                  <span className="type-dot" style={{ background: '#818cf8' }}></span>
                  <span className="type-name">👤 Personal</span>
                  <span className="type-amount">{formatCurrency(expenseTypeBreakdown.personal.amount)}</span>
                  <span className="type-badge">{expenseTypeBreakdown.personal.count}</span>
                </div>
                <div className="type-row">
                  <span className="type-dot" style={{ background: '#4ade80' }}></span>
                  <span className="type-name">👥 Shared</span>
                  <span className="type-amount">{formatCurrency(expenseTypeBreakdown.shared.amount)}</span>
                  <span className="type-badge">{expenseTypeBreakdown.shared.count}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Status */}
          <div className="chart-panel payment-panel">
            <div className="section-header">
              <h3><FiCheckCircle size={14} /> Payment Status</h3>
            </div>
            
            <div className="payment-bars-compact">
              <div className="payment-row settled">
                <div className="payment-header">
                  <span className="payment-label">✓ Settled</span>
                  <span className="payment-value">{formatCurrency(paymentStatus.settled.amount)}</span>
                </div>
                <div className="payment-bar-track">
                  <div 
                    className="payment-bar-fill"
                    style={{ width: `${paymentStatus.settled.amount > 0 ? Math.max((paymentStatus.settled.amount / (paymentStatus.settled.amount + paymentStatus.unsettled.amount + paymentStatus.partial.amount)) * 100, 5) : 0}%` }}
                  ></div>
                </div>
                <span className="payment-count">{paymentStatus.settled.count} expenses</span>
              </div>
              
              <div className="payment-row pending">
                <div className="payment-header">
                  <span className="payment-label">⏳ Pending</span>
                  <span className="payment-value">{formatCurrency(paymentStatus.unsettled.amount)}</span>
                </div>
                <div className="payment-bar-track">
                  <div 
                    className="payment-bar-fill warning"
                    style={{ width: `${paymentStatus.unsettled.amount > 0 ? Math.max((paymentStatus.unsettled.amount / (paymentStatus.settled.amount + paymentStatus.unsettled.amount + paymentStatus.partial.amount)) * 100, 5) : 0}%` }}
                  ></div>
                </div>
                <span className="payment-count">{paymentStatus.unsettled.count} expenses</span>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary KPI Strip */}
        <div className="secondary-kpi-strip">
          <Tooltip content={INSIGHT_TOOLTIPS.daily} position="bottom">
            <div className="strip-kpi">
              <FiZap className="strip-icon" />
              <span className="strip-value">{formatCurrency(spending?.averagePerDay || spendingForecast.dailyAvg)}</span>
              <span className="strip-label">avg/day</span>
            </div>
          </Tooltip>
          <div className="strip-divider"></div>
          <div className="strip-kpi">
            <FiCalendar className="strip-icon" />
            <span className="strip-value">{spendingPatterns.spendingDays}</span>
            <span className="strip-label">active days</span>
          </div>
          <div className="strip-divider"></div>
          <div className="strip-kpi clickable" onClick={() => handleKPIClick('personal')}>
            <FiUser className="strip-icon" />
            <span className="strip-value">{expenseTypeBreakdown.personal.count}</span>
            <span className="strip-label">personal</span>
          </div>
          <div className="strip-divider"></div>
          <div className="strip-kpi">
            <FiUsers className="strip-icon" />
            <span className="strip-value">{expenseTypeBreakdown.shared.count}</span>
            <span className="strip-label">shared</span>
          </div>
          <div className="strip-divider"></div>
          <div className="strip-kpi">
            <FiTarget className="strip-icon" />
            <span className="strip-value">{formatCurrency(topExpenses[0]?.amount || 0)}</span>
            <span className="strip-label">largest</span>
          </div>
        </div>

        {/* Main Analytics Grid: Category + Spending Trend Side by Side */}
        <div className="analytics-dual-grid">
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

          {/* Spending Trend - Now inline with Category */}
          <div className="trend-section-inline">
            <div className="section-header">
              <Tooltip content={INSIGHT_TOOLTIPS.trend}>
                <h3><FiTrendingUp size={14} /> Spending Trend <FiInfo size={10} className="header-info" /></h3>
              </Tooltip>
              {trendSummary && (
                <div className={`trend-badge ${trendSummary.trendDirection?.toLowerCase()}`}>
                  {trendSummary.trendDirection === 'UP' && <FiArrowUp size={10} />}
                  {trendSummary.trendDirection === 'DOWN' && <FiArrowDown size={10} />}
                  {Math.abs(trendSummary.trendPercentage || 0).toFixed(1)}%
                </div>
              )}
            </div>
            
            <div className="trend-chart-inline">
              {trendPoints.length > 0 ? (
                <div className="area-chart">
                  <svg viewBox="0 0 400 80" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="areaGradientInline" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4"/>
                        <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.05"/>
                      </linearGradient>
                    </defs>
                    {(() => {
                      const maxVal = Math.max(...trendPoints.map(p => p.spending || 0), 1);
                      const points = trendPoints.map((p, i) => {
                        const x = (i / Math.max(trendPoints.length - 1, 1)) * 400;
                        const y = 70 - ((p.spending || 0) / maxVal) * 60;
                        return `${x},${y}`;
                      }).join(' ');
                      const areaPath = `M0,70 L${points} L400,70 Z`;
                      return (
                        <>
                          <path d={areaPath} fill="url(#areaGradientInline)" />
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
                <div className="no-data">No trend data</div>
              )}
            </div>
            
            {trendSummary && (
              <div className="chart-stats-inline">
                <div className="chart-stat">
                  <span className="stat-value">{formatCurrency(trendSummary.highestPeriodAmount)}</span>
                  <span className="stat-label">Peak</span>
                </div>
                <div className="chart-stat">
                  <span className="stat-value">{formatCurrency(trendSummary.averagePerPeriod)}</span>
                  <span className="stat-label">Avg</span>
                </div>
                <div className="chart-stat">
                  <span className="stat-value">{formatCurrency(trendSummary.lowestPeriodAmount)}</span>
                  <span className="stat-label">Low</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Secondary Grid - Heatmap, Groups, Top Expenses */}
        <div className="analytics-secondary-grid">
          {/* Weekday Spending - Fixed Bar Chart */}
          <div className="heatmap-section">
            <div className="section-header">
              <h3><FiGrid size={14} /> Spending by Day</h3>
            </div>
            
            <div className="weekday-bars-container">
              {weekdaySpending.map((day, i) => {
                // Calculate proper height based on max value
                const maxVal = Math.max(...weekdaySpending.map(d => d.total), 1);
                const heightPercent = day.total > 0 ? Math.max((day.total / maxVal) * 100, 8) : 5;
                const opacity = day.total > 0 ? 0.5 + (day.total / maxVal) * 0.5 : 0.2;
                
                return (
                  <div key={i} className="weekday-bar-col">
                    <div className="weekday-bar-wrapper">
                      <div 
                        className={`weekday-bar ${day.total > 0 ? 'active' : ''}`}
                        style={{ 
                          height: `${heightPercent}%`,
                          opacity: opacity
                        }}
                      />
                      <span className="weekday-amount">{formatCurrency(day.total)}</span>
                    </div>
                    <span className="weekday-label">{day.name}</span>
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

        {/* Friend Balances - At Bottom - Full Width */}
        <div className="friend-balances-section">
          <div className="section-header">
            <h3><FiDollarSign size={14} /> Friend Balances</h3>
          </div>
          
          <div className="friend-balances-grid">
            {friendBalances.length > 0 ? (
              friendBalances.slice(0, 8).map((fb, idx) => {
                const isOwed = fb.balance >= 0;
                const maxBalance = Math.max(...friendBalances.map(f => Math.abs(f.balance)), 1);
                const barWidth = Math.min((Math.abs(fb.balance) / maxBalance) * 100, 100);
                
                return (
                  <div key={idx} className="friend-balance-card">
                    <div className="friend-avatar" style={{ 
                      background: isOwed ? 'linear-gradient(135deg, #4ade80, #22c55e)' : 'linear-gradient(135deg, #fb7185, #ef4444)'
                    }}>
                      {fb.friendName?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="friend-details">
                      <span className="friend-name">{fb.friendName}</span>
                      <div className="friend-bar-container">
                        <div 
                          className={`friend-bar ${isOwed ? 'positive' : 'negative'}`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                    <span className={`friend-amount ${isOwed ? 'positive' : 'negative'}`}>
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
