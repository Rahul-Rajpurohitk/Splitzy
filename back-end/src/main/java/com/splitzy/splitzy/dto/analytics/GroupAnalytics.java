package com.splitzy.splitzy.dto.analytics;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Analytics for a specific group.
 */
public class GroupAnalytics {
    
    private GroupProfile group;
    private GroupFinancials financials;
    private List<MemberContribution> memberContributions = new ArrayList<>();
    private List<TrendData.TrendPoint> spendingTrend = new ArrayList<>();
    private List<DashboardSummary.CategoryBreakdown> categoryBreakdown = new ArrayList<>();
    private List<DashboardSummary.ExpenseSnapshot> recentExpenses = new ArrayList<>();
    
    public static class GroupProfile {
        private String groupId;
        private String name;
        private String description;
        private int memberCount;
        private LocalDateTime createdAt;
        private String creatorName;
        
        // Getters and Setters
        public String getGroupId() { return groupId; }
        public void setGroupId(String groupId) { this.groupId = groupId; }
        
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        
        public int getMemberCount() { return memberCount; }
        public void setMemberCount(int memberCount) { this.memberCount = memberCount; }
        
        public LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
        
        public String getCreatorName() { return creatorName; }
        public void setCreatorName(String creatorName) { this.creatorName = creatorName; }
    }
    
    public static class GroupFinancials {
        private double totalSpending;
        private int expenseCount;
        private double averageExpense;
        private double yourContribution;    // What you've paid
        private double yourShare;           // Your fair share
        private double yourBalance;         // Net (positive = owed to you)
        private String balanceDirection;
        private String topCategory;
        private double topCategoryAmount;
        private LocalDateTime lastActivity;
        
        // Per-member average
        private double averagePerMember;
        
        // Getters and Setters
        public double getTotalSpending() { return totalSpending; }
        public void setTotalSpending(double totalSpending) { this.totalSpending = totalSpending; }
        
        public int getExpenseCount() { return expenseCount; }
        public void setExpenseCount(int expenseCount) { this.expenseCount = expenseCount; }
        
        public double getAverageExpense() { return averageExpense; }
        public void setAverageExpense(double averageExpense) { this.averageExpense = averageExpense; }
        
        public double getYourContribution() { return yourContribution; }
        public void setYourContribution(double yourContribution) { this.yourContribution = yourContribution; }
        
        public double getYourShare() { return yourShare; }
        public void setYourShare(double yourShare) { this.yourShare = yourShare; }
        
        public double getYourBalance() { return yourBalance; }
        public void setYourBalance(double yourBalance) { this.yourBalance = yourBalance; }
        
        public String getBalanceDirection() { return balanceDirection; }
        public void setBalanceDirection(String balanceDirection) { this.balanceDirection = balanceDirection; }
        
        public String getTopCategory() { return topCategory; }
        public void setTopCategory(String topCategory) { this.topCategory = topCategory; }
        
        public double getTopCategoryAmount() { return topCategoryAmount; }
        public void setTopCategoryAmount(double topCategoryAmount) { this.topCategoryAmount = topCategoryAmount; }
        
        public LocalDateTime getLastActivity() { return lastActivity; }
        public void setLastActivity(LocalDateTime lastActivity) { this.lastActivity = lastActivity; }
        
        public double getAveragePerMember() { return averagePerMember; }
        public void setAveragePerMember(double averagePerMember) { this.averagePerMember = averagePerMember; }
    }
    
    public static class MemberContribution {
        private String memberId;
        private String memberName;
        private String memberAvatar;
        private double totalPaid;
        private double totalShare;
        private double balance;
        private String balanceDirection;
        private int expensesCreated;
        private double contributionPercentage; // % of group spending
        
        // Getters and Setters
        public String getMemberId() { return memberId; }
        public void setMemberId(String memberId) { this.memberId = memberId; }
        
        public String getMemberName() { return memberName; }
        public void setMemberName(String memberName) { this.memberName = memberName; }
        
        public String getMemberAvatar() { return memberAvatar; }
        public void setMemberAvatar(String memberAvatar) { this.memberAvatar = memberAvatar; }
        
        public double getTotalPaid() { return totalPaid; }
        public void setTotalPaid(double totalPaid) { this.totalPaid = totalPaid; }
        
        public double getTotalShare() { return totalShare; }
        public void setTotalShare(double totalShare) { this.totalShare = totalShare; }
        
        public double getBalance() { return balance; }
        public void setBalance(double balance) { this.balance = balance; }
        
        public String getBalanceDirection() { return balanceDirection; }
        public void setBalanceDirection(String balanceDirection) { this.balanceDirection = balanceDirection; }
        
        public int getExpensesCreated() { return expensesCreated; }
        public void setExpensesCreated(int expensesCreated) { this.expensesCreated = expensesCreated; }
        
        public double getContributionPercentage() { return contributionPercentage; }
        public void setContributionPercentage(double contributionPercentage) { this.contributionPercentage = contributionPercentage; }
    }
    
    // Getters and Setters
    public GroupProfile getGroup() { return group; }
    public void setGroup(GroupProfile group) { this.group = group; }
    
    public GroupFinancials getFinancials() { return financials; }
    public void setFinancials(GroupFinancials financials) { this.financials = financials; }
    
    public List<MemberContribution> getMemberContributions() { return memberContributions; }
    public void setMemberContributions(List<MemberContribution> memberContributions) { this.memberContributions = memberContributions; }
    
    public List<TrendData.TrendPoint> getSpendingTrend() { return spendingTrend; }
    public void setSpendingTrend(List<TrendData.TrendPoint> spendingTrend) { this.spendingTrend = spendingTrend; }
    
    public List<DashboardSummary.CategoryBreakdown> getCategoryBreakdown() { return categoryBreakdown; }
    public void setCategoryBreakdown(List<DashboardSummary.CategoryBreakdown> categoryBreakdown) { this.categoryBreakdown = categoryBreakdown; }
    
    public List<DashboardSummary.ExpenseSnapshot> getRecentExpenses() { return recentExpenses; }
    public void setRecentExpenses(List<DashboardSummary.ExpenseSnapshot> recentExpenses) { this.recentExpenses = recentExpenses; }
}

