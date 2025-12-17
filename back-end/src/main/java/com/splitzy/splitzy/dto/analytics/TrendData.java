package com.splitzy.splitzy.dto.analytics;

import java.util.ArrayList;
import java.util.List;

/**
 * Time-series trend data for charts and graphs.
 * Supports multiple metrics over time periods.
 */
public class TrendData {
    
    private String periodType; // DAILY, WEEKLY, MONTHLY
    private List<TrendPoint> dataPoints = new ArrayList<>();
    private TrendSummary summary;
    
    // Comparison data (optional)
    private List<TrendPoint> comparisonDataPoints;
    private String comparisonLabel;
    
    public static class TrendPoint {
        private String label;           // e.g., "Dec 1", "Week 1", "January"
        private String periodKey;       // e.g., "2024-12-01", "2024-W01", "2024-01"
        private double spending;        // Total spent
        private double income;          // Total received/owed to you
        private double netFlow;         // Net movement
        private int expenseCount;       // Number of expenses
        private double averageExpense;  // Average per expense
        
        // Additional breakdowns
        private List<CategoryAmount> categoryBreakdown;
        
        // Getters and Setters
        public String getLabel() { return label; }
        public void setLabel(String label) { this.label = label; }
        
        public String getPeriodKey() { return periodKey; }
        public void setPeriodKey(String periodKey) { this.periodKey = periodKey; }
        
        public double getSpending() { return spending; }
        public void setSpending(double spending) { this.spending = spending; }
        
        public double getIncome() { return income; }
        public void setIncome(double income) { this.income = income; }
        
        public double getNetFlow() { return netFlow; }
        public void setNetFlow(double netFlow) { this.netFlow = netFlow; }
        
        public int getExpenseCount() { return expenseCount; }
        public void setExpenseCount(int expenseCount) { this.expenseCount = expenseCount; }
        
        public double getAverageExpense() { return averageExpense; }
        public void setAverageExpense(double averageExpense) { this.averageExpense = averageExpense; }
        
        public List<CategoryAmount> getCategoryBreakdown() { return categoryBreakdown; }
        public void setCategoryBreakdown(List<CategoryAmount> categoryBreakdown) { this.categoryBreakdown = categoryBreakdown; }
    }
    
    public static class CategoryAmount {
        private String category;
        private double amount;
        
        public CategoryAmount() {}
        
        public CategoryAmount(String category, double amount) {
            this.category = category;
            this.amount = amount;
        }
        
        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }
        
        public double getAmount() { return amount; }
        public void setAmount(double amount) { this.amount = amount; }
    }
    
    public static class TrendSummary {
        private double totalSpending;
        private double totalIncome;
        private double netTotal;
        private double averagePerPeriod;
        private double highestPeriodAmount;
        private String highestPeriodLabel;
        private double lowestPeriodAmount;
        private String lowestPeriodLabel;
        private double trendPercentage; // Positive = increasing trend
        private String trendDirection;  // UP, DOWN, STABLE
        
        // Getters and Setters
        public double getTotalSpending() { return totalSpending; }
        public void setTotalSpending(double totalSpending) { this.totalSpending = totalSpending; }
        
        public double getTotalIncome() { return totalIncome; }
        public void setTotalIncome(double totalIncome) { this.totalIncome = totalIncome; }
        
        public double getNetTotal() { return netTotal; }
        public void setNetTotal(double netTotal) { this.netTotal = netTotal; }
        
        public double getAveragePerPeriod() { return averagePerPeriod; }
        public void setAveragePerPeriod(double averagePerPeriod) { this.averagePerPeriod = averagePerPeriod; }
        
        public double getHighestPeriodAmount() { return highestPeriodAmount; }
        public void setHighestPeriodAmount(double highestPeriodAmount) { this.highestPeriodAmount = highestPeriodAmount; }
        
        public String getHighestPeriodLabel() { return highestPeriodLabel; }
        public void setHighestPeriodLabel(String highestPeriodLabel) { this.highestPeriodLabel = highestPeriodLabel; }
        
        public double getLowestPeriodAmount() { return lowestPeriodAmount; }
        public void setLowestPeriodAmount(double lowestPeriodAmount) { this.lowestPeriodAmount = lowestPeriodAmount; }
        
        public String getLowestPeriodLabel() { return lowestPeriodLabel; }
        public void setLowestPeriodLabel(String lowestPeriodLabel) { this.lowestPeriodLabel = lowestPeriodLabel; }
        
        public double getTrendPercentage() { return trendPercentage; }
        public void setTrendPercentage(double trendPercentage) { this.trendPercentage = trendPercentage; }
        
        public String getTrendDirection() { return trendDirection; }
        public void setTrendDirection(String trendDirection) { this.trendDirection = trendDirection; }
    }
    
    // Getters and Setters
    public String getPeriodType() { return periodType; }
    public void setPeriodType(String periodType) { this.periodType = periodType; }
    
    public List<TrendPoint> getDataPoints() { return dataPoints; }
    public void setDataPoints(List<TrendPoint> dataPoints) { this.dataPoints = dataPoints; }
    
    public TrendSummary getSummary() { return summary; }
    public void setSummary(TrendSummary summary) { this.summary = summary; }
    
    public List<TrendPoint> getComparisonDataPoints() { return comparisonDataPoints; }
    public void setComparisonDataPoints(List<TrendPoint> comparisonDataPoints) { this.comparisonDataPoints = comparisonDataPoints; }
    
    public String getComparisonLabel() { return comparisonLabel; }
    public void setComparisonLabel(String comparisonLabel) { this.comparisonLabel = comparisonLabel; }
}

