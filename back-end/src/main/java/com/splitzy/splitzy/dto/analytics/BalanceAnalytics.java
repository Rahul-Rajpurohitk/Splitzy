package com.splitzy.splitzy.dto.analytics;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Detailed balance analytics - who owes whom and settlement status.
 */
public class BalanceAnalytics {
    
    private BalanceOverview overview;
    private List<FriendBalance> friendBalances = new ArrayList<>();
    private List<GroupBalance> groupBalances = new ArrayList<>();
    private List<BalanceHistoryPoint> balanceHistory = new ArrayList<>();
    
    public static class BalanceOverview {
        private double totalOwedToYou;
        private double totalYouOwe;
        private double netBalance;
        private int unsettledCount;
        private double largestBalance;
        private String largestBalanceWith;
        private LocalDateTime oldestUnsettled;
        private String oldestUnsettledWith;
        
        // Getters and Setters
        public double getTotalOwedToYou() { return totalOwedToYou; }
        public void setTotalOwedToYou(double totalOwedToYou) { this.totalOwedToYou = totalOwedToYou; }
        
        public double getTotalYouOwe() { return totalYouOwe; }
        public void setTotalYouOwe(double totalYouOwe) { this.totalYouOwe = totalYouOwe; }
        
        public double getNetBalance() { return netBalance; }
        public void setNetBalance(double netBalance) { this.netBalance = netBalance; }
        
        public int getUnsettledCount() { return unsettledCount; }
        public void setUnsettledCount(int unsettledCount) { this.unsettledCount = unsettledCount; }
        
        public double getLargestBalance() { return largestBalance; }
        public void setLargestBalance(double largestBalance) { this.largestBalance = largestBalance; }
        
        public String getLargestBalanceWith() { return largestBalanceWith; }
        public void setLargestBalanceWith(String largestBalanceWith) { this.largestBalanceWith = largestBalanceWith; }
        
        public LocalDateTime getOldestUnsettled() { return oldestUnsettled; }
        public void setOldestUnsettled(LocalDateTime oldestUnsettled) { this.oldestUnsettled = oldestUnsettled; }
        
        public String getOldestUnsettledWith() { return oldestUnsettledWith; }
        public void setOldestUnsettledWith(String oldestUnsettledWith) { this.oldestUnsettledWith = oldestUnsettledWith; }
    }
    
    public static class FriendBalance {
        private String friendId;
        private String friendName;
        private String friendAvatar;
        private double balance;             // Positive = they owe you, Negative = you owe them
        private String balanceDirection;    // OWED_TO_YOU, YOU_OWE, SETTLED
        private int sharedExpenses;         // Total expenses together
        private double totalShared;         // Total amount in shared expenses
        private LocalDateTime lastActivity;
        private List<ExpenseBalance> unsettledExpenses;
        
        // Getters and Setters
        public String getFriendId() { return friendId; }
        public void setFriendId(String friendId) { this.friendId = friendId; }
        
        public String getFriendName() { return friendName; }
        public void setFriendName(String friendName) { this.friendName = friendName; }
        
        public String getFriendAvatar() { return friendAvatar; }
        public void setFriendAvatar(String friendAvatar) { this.friendAvatar = friendAvatar; }
        
        public double getBalance() { return balance; }
        public void setBalance(double balance) { this.balance = balance; }
        
        public String getBalanceDirection() { return balanceDirection; }
        public void setBalanceDirection(String balanceDirection) { this.balanceDirection = balanceDirection; }
        
        public int getSharedExpenses() { return sharedExpenses; }
        public void setSharedExpenses(int sharedExpenses) { this.sharedExpenses = sharedExpenses; }
        
        public double getTotalShared() { return totalShared; }
        public void setTotalShared(double totalShared) { this.totalShared = totalShared; }
        
        public LocalDateTime getLastActivity() { return lastActivity; }
        public void setLastActivity(LocalDateTime lastActivity) { this.lastActivity = lastActivity; }
        
        public List<ExpenseBalance> getUnsettledExpenses() { return unsettledExpenses; }
        public void setUnsettledExpenses(List<ExpenseBalance> unsettledExpenses) { this.unsettledExpenses = unsettledExpenses; }
    }
    
    public static class GroupBalance {
        private String groupId;
        private String groupName;
        private double yourBalance;         // Your net position in group
        private String balanceDirection;
        private int memberCount;
        private int expenseCount;
        private double totalGroupSpending;
        private double yourContribution;    // What you've paid total
        private double yourShare;           // What your fair share was
        private List<MemberBalance> memberBalances; // Balance with each member
        
        // Getters and Setters
        public String getGroupId() { return groupId; }
        public void setGroupId(String groupId) { this.groupId = groupId; }
        
        public String getGroupName() { return groupName; }
        public void setGroupName(String groupName) { this.groupName = groupName; }
        
        public double getYourBalance() { return yourBalance; }
        public void setYourBalance(double yourBalance) { this.yourBalance = yourBalance; }
        
        public String getBalanceDirection() { return balanceDirection; }
        public void setBalanceDirection(String balanceDirection) { this.balanceDirection = balanceDirection; }
        
        public int getMemberCount() { return memberCount; }
        public void setMemberCount(int memberCount) { this.memberCount = memberCount; }
        
        public int getExpenseCount() { return expenseCount; }
        public void setExpenseCount(int expenseCount) { this.expenseCount = expenseCount; }
        
        public double getTotalGroupSpending() { return totalGroupSpending; }
        public void setTotalGroupSpending(double totalGroupSpending) { this.totalGroupSpending = totalGroupSpending; }
        
        public double getYourContribution() { return yourContribution; }
        public void setYourContribution(double yourContribution) { this.yourContribution = yourContribution; }
        
        public double getYourShare() { return yourShare; }
        public void setYourShare(double yourShare) { this.yourShare = yourShare; }
        
        public List<MemberBalance> getMemberBalances() { return memberBalances; }
        public void setMemberBalances(List<MemberBalance> memberBalances) { this.memberBalances = memberBalances; }
    }
    
    public static class MemberBalance {
        private String memberId;
        private String memberName;
        private double balance;
        private String direction;
        
        // Getters and Setters
        public String getMemberId() { return memberId; }
        public void setMemberId(String memberId) { this.memberId = memberId; }
        
        public String getMemberName() { return memberName; }
        public void setMemberName(String memberName) { this.memberName = memberName; }
        
        public double getBalance() { return balance; }
        public void setBalance(double balance) { this.balance = balance; }
        
        public String getDirection() { return direction; }
        public void setDirection(String direction) { this.direction = direction; }
    }
    
    public static class ExpenseBalance {
        private String expenseId;
        private String description;
        private double amount;
        private String date;
        
        // Getters and Setters
        public String getExpenseId() { return expenseId; }
        public void setExpenseId(String expenseId) { this.expenseId = expenseId; }
        
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        
        public double getAmount() { return amount; }
        public void setAmount(double amount) { this.amount = amount; }
        
        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }
    }
    
    public static class BalanceHistoryPoint {
        private String date;
        private double totalOwed;
        private double totalOwing;
        private double netBalance;
        
        // Getters and Setters
        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }
        
        public double getTotalOwed() { return totalOwed; }
        public void setTotalOwed(double totalOwed) { this.totalOwed = totalOwed; }
        
        public double getTotalOwing() { return totalOwing; }
        public void setTotalOwing(double totalOwing) { this.totalOwing = totalOwing; }
        
        public double getNetBalance() { return netBalance; }
        public void setNetBalance(double netBalance) { this.netBalance = netBalance; }
    }
    
    // Getters and Setters
    public BalanceOverview getOverview() { return overview; }
    public void setOverview(BalanceOverview overview) { this.overview = overview; }
    
    public List<FriendBalance> getFriendBalances() { return friendBalances; }
    public void setFriendBalances(List<FriendBalance> friendBalances) { this.friendBalances = friendBalances; }
    
    public List<GroupBalance> getGroupBalances() { return groupBalances; }
    public void setGroupBalances(List<GroupBalance> groupBalances) { this.groupBalances = groupBalances; }
    
    public List<BalanceHistoryPoint> getBalanceHistory() { return balanceHistory; }
    public void setBalanceHistory(List<BalanceHistoryPoint> balanceHistory) { this.balanceHistory = balanceHistory; }
}

