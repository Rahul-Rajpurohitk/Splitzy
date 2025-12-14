package com.splitzy.splitzy.dto.analytics;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Analytics for a specific friend relationship.
 */
public class FriendAnalytics {
    
    private FriendProfile friend;
    private RelationshipSummary relationship;
    private List<TrendData.TrendPoint> spendingTrend = new ArrayList<>();
    private List<DashboardSummary.CategoryBreakdown> categoryBreakdown = new ArrayList<>();
    private List<DashboardSummary.ExpenseSnapshot> recentExpenses = new ArrayList<>();
    
    public static class FriendProfile {
        private String friendId;
        private String name;
        private String email;
        private String avatarUrl;
        private LocalDateTime friendsSince;
        
        // Getters and Setters
        public String getFriendId() { return friendId; }
        public void setFriendId(String friendId) { this.friendId = friendId; }
        
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        
        public String getAvatarUrl() { return avatarUrl; }
        public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
        
        public LocalDateTime getFriendsSince() { return friendsSince; }
        public void setFriendsSince(LocalDateTime friendsSince) { this.friendsSince = friendsSince; }
    }
    
    public static class RelationshipSummary {
        private double currentBalance;
        private String balanceDirection;
        private int totalSharedExpenses;
        private double totalSharedAmount;
        private double averageExpenseAmount;
        private String mostCommonCategory;
        private int sharedGroups;
        private LocalDateTime lastExpense;
        private double lifetimeSettled;     // Total amount settled between you
        
        // Getters and Setters
        public double getCurrentBalance() { return currentBalance; }
        public void setCurrentBalance(double currentBalance) { this.currentBalance = currentBalance; }
        
        public String getBalanceDirection() { return balanceDirection; }
        public void setBalanceDirection(String balanceDirection) { this.balanceDirection = balanceDirection; }
        
        public int getTotalSharedExpenses() { return totalSharedExpenses; }
        public void setTotalSharedExpenses(int totalSharedExpenses) { this.totalSharedExpenses = totalSharedExpenses; }
        
        public double getTotalSharedAmount() { return totalSharedAmount; }
        public void setTotalSharedAmount(double totalSharedAmount) { this.totalSharedAmount = totalSharedAmount; }
        
        public double getAverageExpenseAmount() { return averageExpenseAmount; }
        public void setAverageExpenseAmount(double averageExpenseAmount) { this.averageExpenseAmount = averageExpenseAmount; }
        
        public String getMostCommonCategory() { return mostCommonCategory; }
        public void setMostCommonCategory(String mostCommonCategory) { this.mostCommonCategory = mostCommonCategory; }
        
        public int getSharedGroups() { return sharedGroups; }
        public void setSharedGroups(int sharedGroups) { this.sharedGroups = sharedGroups; }
        
        public LocalDateTime getLastExpense() { return lastExpense; }
        public void setLastExpense(LocalDateTime lastExpense) { this.lastExpense = lastExpense; }
        
        public double getLifetimeSettled() { return lifetimeSettled; }
        public void setLifetimeSettled(double lifetimeSettled) { this.lifetimeSettled = lifetimeSettled; }
    }
    
    // Getters and Setters
    public FriendProfile getFriend() { return friend; }
    public void setFriend(FriendProfile friend) { this.friend = friend; }
    
    public RelationshipSummary getRelationship() { return relationship; }
    public void setRelationship(RelationshipSummary relationship) { this.relationship = relationship; }
    
    public List<TrendData.TrendPoint> getSpendingTrend() { return spendingTrend; }
    public void setSpendingTrend(List<TrendData.TrendPoint> spendingTrend) { this.spendingTrend = spendingTrend; }
    
    public List<DashboardSummary.CategoryBreakdown> getCategoryBreakdown() { return categoryBreakdown; }
    public void setCategoryBreakdown(List<DashboardSummary.CategoryBreakdown> categoryBreakdown) { this.categoryBreakdown = categoryBreakdown; }
    
    public List<DashboardSummary.ExpenseSnapshot> getRecentExpenses() { return recentExpenses; }
    public void setRecentExpenses(List<DashboardSummary.ExpenseSnapshot> recentExpenses) { this.recentExpenses = recentExpenses; }
}

