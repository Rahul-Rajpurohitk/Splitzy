package com.splitzy.splitzy.dto.analytics;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Main dashboard summary response containing all key metrics at a glance.
 * This is the primary response for the dashboard overview.
 */
public class DashboardSummary {
    
    // Balance Overview
    private BalanceSummary balance;
    
    // Spending Overview
    private SpendingSummary spending;
    
    // Settlement Status
    private SettlementSummary settlements;
    
    // Activity Metrics
    private ActivityMetrics activity;
    
    // Quick Stats
    private QuickStats quickStats;
    
    // Top Categories (limit 5)
    private List<CategoryBreakdown> topCategories = new ArrayList<>();
    
    // Recent Expenses (limit 5)
    private List<ExpenseSnapshot> recentExpenses = new ArrayList<>();
    
    // Pending Actions
    private List<PendingAction> pendingActions = new ArrayList<>();
    
    // Metadata
    private LocalDateTime generatedAt;
    private String periodLabel; // e.g., "December 2024", "This Week"
    
    // Nested DTOs
    
    public static class BalanceSummary {
        private double totalOwed;       // Total others owe you
        private double totalOwing;      // Total you owe others
        private double netBalance;      // totalOwed - totalOwing
        private int friendsOwingYou;    // Count of friends who owe you
        private int friendsYouOwe;      // Count of friends you owe
        private double largestDebt;     // Your largest single debt
        private String largestDebtTo;   // Who you owe the most to
        private double largestCredit;   // Largest amount owed to you
        private String largestCreditFrom; // Who owes you the most
        
        // Getters and Setters
        public double getTotalOwed() { return totalOwed; }
        public void setTotalOwed(double totalOwed) { this.totalOwed = totalOwed; }
        
        public double getTotalOwing() { return totalOwing; }
        public void setTotalOwing(double totalOwing) { this.totalOwing = totalOwing; }
        
        public double getNetBalance() { return netBalance; }
        public void setNetBalance(double netBalance) { this.netBalance = netBalance; }
        
        public int getFriendsOwingYou() { return friendsOwingYou; }
        public void setFriendsOwingYou(int friendsOwingYou) { this.friendsOwingYou = friendsOwingYou; }
        
        public int getFriendsYouOwe() { return friendsYouOwe; }
        public void setFriendsYouOwe(int friendsYouOwe) { this.friendsYouOwe = friendsYouOwe; }
        
        public double getLargestDebt() { return largestDebt; }
        public void setLargestDebt(double largestDebt) { this.largestDebt = largestDebt; }
        
        public String getLargestDebtTo() { return largestDebtTo; }
        public void setLargestDebtTo(String largestDebtTo) { this.largestDebtTo = largestDebtTo; }
        
        public double getLargestCredit() { return largestCredit; }
        public void setLargestCredit(double largestCredit) { this.largestCredit = largestCredit; }
        
        public String getLargestCreditFrom() { return largestCreditFrom; }
        public void setLargestCreditFrom(String largestCreditFrom) { this.largestCreditFrom = largestCreditFrom; }
    }
    
    public static class SpendingSummary {
        private double totalSpent;          // Total spending in period
        private double averagePerExpense;   // Average expense amount
        private double averagePerDay;       // Daily average
        private double averagePerWeek;      // Weekly average
        private int expenseCount;           // Total expenses
        private double comparisonChange;    // % change from comparison period
        private String comparisonLabel;     // e.g., "vs last month"
        
        // Getters and Setters
        public double getTotalSpent() { return totalSpent; }
        public void setTotalSpent(double totalSpent) { this.totalSpent = totalSpent; }
        
        public double getAveragePerExpense() { return averagePerExpense; }
        public void setAveragePerExpense(double averagePerExpense) { this.averagePerExpense = averagePerExpense; }
        
        public double getAveragePerDay() { return averagePerDay; }
        public void setAveragePerDay(double averagePerDay) { this.averagePerDay = averagePerDay; }
        
        public double getAveragePerWeek() { return averagePerWeek; }
        public void setAveragePerWeek(double averagePerWeek) { this.averagePerWeek = averagePerWeek; }
        
        public int getExpenseCount() { return expenseCount; }
        public void setExpenseCount(int expenseCount) { this.expenseCount = expenseCount; }
        
        public double getComparisonChange() { return comparisonChange; }
        public void setComparisonChange(double comparisonChange) { this.comparisonChange = comparisonChange; }
        
        public String getComparisonLabel() { return comparisonLabel; }
        public void setComparisonLabel(String comparisonLabel) { this.comparisonLabel = comparisonLabel; }
    }
    
    public static class SettlementSummary {
        private int pendingSettlements;      // Number of unsettled balances
        private double pendingAmount;        // Total pending settlement amount
        private int settledThisPeriod;       // Settlements made this period
        private double settledAmountThisPeriod;
        private double averageSettlementTime; // Days to settle (avg)
        
        // Getters and Setters
        public int getPendingSettlements() { return pendingSettlements; }
        public void setPendingSettlements(int pendingSettlements) { this.pendingSettlements = pendingSettlements; }
        
        public double getPendingAmount() { return pendingAmount; }
        public void setPendingAmount(double pendingAmount) { this.pendingAmount = pendingAmount; }
        
        public int getSettledThisPeriod() { return settledThisPeriod; }
        public void setSettledThisPeriod(int settledThisPeriod) { this.settledThisPeriod = settledThisPeriod; }
        
        public double getSettledAmountThisPeriod() { return settledAmountThisPeriod; }
        public void setSettledAmountThisPeriod(double settledAmountThisPeriod) { this.settledAmountThisPeriod = settledAmountThisPeriod; }
        
        public double getAverageSettlementTime() { return averageSettlementTime; }
        public void setAverageSettlementTime(double averageSettlementTime) { this.averageSettlementTime = averageSettlementTime; }
    }
    
    public static class ActivityMetrics {
        private int expensesCreated;        // Expenses you created
        private int expensesParticipated;   // Expenses you're part of
        private int groupsActive;           // Groups with activity
        private int friendsInteracted;      // Friends with shared expenses
        private LocalDateTime lastActivity; // Most recent activity
        
        // Getters and Setters
        public int getExpensesCreated() { return expensesCreated; }
        public void setExpensesCreated(int expensesCreated) { this.expensesCreated = expensesCreated; }
        
        public int getExpensesParticipated() { return expensesParticipated; }
        public void setExpensesParticipated(int expensesParticipated) { this.expensesParticipated = expensesParticipated; }
        
        public int getGroupsActive() { return groupsActive; }
        public void setGroupsActive(int groupsActive) { this.groupsActive = groupsActive; }
        
        public int getFriendsInteracted() { return friendsInteracted; }
        public void setFriendsInteracted(int friendsInteracted) { this.friendsInteracted = friendsInteracted; }
        
        public LocalDateTime getLastActivity() { return lastActivity; }
        public void setLastActivity(LocalDateTime lastActivity) { this.lastActivity = lastActivity; }
    }
    
    public static class QuickStats {
        private int totalFriends;
        private int totalGroups;
        private int totalExpenses;
        private double lifetimeSpending;
        
        // Getters and Setters
        public int getTotalFriends() { return totalFriends; }
        public void setTotalFriends(int totalFriends) { this.totalFriends = totalFriends; }
        
        public int getTotalGroups() { return totalGroups; }
        public void setTotalGroups(int totalGroups) { this.totalGroups = totalGroups; }
        
        public int getTotalExpenses() { return totalExpenses; }
        public void setTotalExpenses(int totalExpenses) { this.totalExpenses = totalExpenses; }
        
        public double getLifetimeSpending() { return lifetimeSpending; }
        public void setLifetimeSpending(double lifetimeSpending) { this.lifetimeSpending = lifetimeSpending; }
    }
    
    public static class CategoryBreakdown {
        private String category;
        private double amount;
        private double percentage;
        private int count;
        private double changeFromPrevious; // % change from comparison period
        
        // Getters and Setters
        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }
        
        public double getAmount() { return amount; }
        public void setAmount(double amount) { this.amount = amount; }
        
        public double getPercentage() { return percentage; }
        public void setPercentage(double percentage) { this.percentage = percentage; }
        
        public int getCount() { return count; }
        public void setCount(int count) { this.count = count; }
        
        public double getChangeFromPrevious() { return changeFromPrevious; }
        public void setChangeFromPrevious(double changeFromPrevious) { this.changeFromPrevious = changeFromPrevious; }
    }
    
    public static class ExpenseSnapshot {
        private String id;
        private String description;
        private String category;
        private double amount;
        private String date;
        private String groupName;
        private double yourShare;
        private double yourNet; // positive = you're owed, negative = you owe
        
        // Getters and Setters
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        
        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }
        
        public double getAmount() { return amount; }
        public void setAmount(double amount) { this.amount = amount; }
        
        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }
        
        public String getGroupName() { return groupName; }
        public void setGroupName(String groupName) { this.groupName = groupName; }
        
        public double getYourShare() { return yourShare; }
        public void setYourShare(double yourShare) { this.yourShare = yourShare; }
        
        public double getYourNet() { return yourNet; }
        public void setYourNet(double yourNet) { this.yourNet = yourNet; }
    }
    
    public static class PendingAction {
        private String type; // SETTLE_UP, ACCEPT_INVITE, REVIEW_EXPENSE
        private String description;
        private String referenceId;
        private double amount;
        private String counterparty; // Friend/group name
        
        // Getters and Setters
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        
        public String getReferenceId() { return referenceId; }
        public void setReferenceId(String referenceId) { this.referenceId = referenceId; }
        
        public double getAmount() { return amount; }
        public void setAmount(double amount) { this.amount = amount; }
        
        public String getCounterparty() { return counterparty; }
        public void setCounterparty(String counterparty) { this.counterparty = counterparty; }
    }
    
    // Main class Getters and Setters
    public BalanceSummary getBalance() { return balance; }
    public void setBalance(BalanceSummary balance) { this.balance = balance; }
    
    public SpendingSummary getSpending() { return spending; }
    public void setSpending(SpendingSummary spending) { this.spending = spending; }
    
    public SettlementSummary getSettlements() { return settlements; }
    public void setSettlements(SettlementSummary settlements) { this.settlements = settlements; }
    
    public ActivityMetrics getActivity() { return activity; }
    public void setActivity(ActivityMetrics activity) { this.activity = activity; }
    
    public QuickStats getQuickStats() { return quickStats; }
    public void setQuickStats(QuickStats quickStats) { this.quickStats = quickStats; }
    
    public List<CategoryBreakdown> getTopCategories() { return topCategories; }
    public void setTopCategories(List<CategoryBreakdown> topCategories) { this.topCategories = topCategories; }
    
    public List<ExpenseSnapshot> getRecentExpenses() { return recentExpenses; }
    public void setRecentExpenses(List<ExpenseSnapshot> recentExpenses) { this.recentExpenses = recentExpenses; }
    
    public List<PendingAction> getPendingActions() { return pendingActions; }
    public void setPendingActions(List<PendingAction> pendingActions) { this.pendingActions = pendingActions; }
    
    public LocalDateTime getGeneratedAt() { return generatedAt; }
    public void setGeneratedAt(LocalDateTime generatedAt) { this.generatedAt = generatedAt; }
    
    public String getPeriodLabel() { return periodLabel; }
    public void setPeriodLabel(String periodLabel) { this.periodLabel = periodLabel; }
}

