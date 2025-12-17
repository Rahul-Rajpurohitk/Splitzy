package com.splitzy.splitzy.dto.analytics;

import java.util.ArrayList;
import java.util.List;

/**
 * Detailed category-based analytics.
 */
public class CategoryAnalytics {
    
    private List<CategoryDetail> categories = new ArrayList<>();
    private CategorySummary summary;
    
    public static class CategoryDetail {
        private String category;
        private String categoryIcon;        // Icon identifier for frontend
        private double totalAmount;
        private double percentage;          // % of total spending
        private int expenseCount;
        private double averageAmount;
        private double minAmount;
        private double maxAmount;
        
        // Trend data
        private double previousPeriodAmount;
        private double changePercentage;    // % change from previous
        private String changeDirection;     // UP, DOWN, STABLE
        
        // Time-series for this category
        private List<TrendData.TrendPoint> trend;
        
        // Top expenses in this category
        private List<DashboardSummary.ExpenseSnapshot> topExpenses;
        
        // Getters and Setters
        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }
        
        public String getCategoryIcon() { return categoryIcon; }
        public void setCategoryIcon(String categoryIcon) { this.categoryIcon = categoryIcon; }
        
        public double getTotalAmount() { return totalAmount; }
        public void setTotalAmount(double totalAmount) { this.totalAmount = totalAmount; }
        
        public double getPercentage() { return percentage; }
        public void setPercentage(double percentage) { this.percentage = percentage; }
        
        public int getExpenseCount() { return expenseCount; }
        public void setExpenseCount(int expenseCount) { this.expenseCount = expenseCount; }
        
        public double getAverageAmount() { return averageAmount; }
        public void setAverageAmount(double averageAmount) { this.averageAmount = averageAmount; }
        
        public double getMinAmount() { return minAmount; }
        public void setMinAmount(double minAmount) { this.minAmount = minAmount; }
        
        public double getMaxAmount() { return maxAmount; }
        public void setMaxAmount(double maxAmount) { this.maxAmount = maxAmount; }
        
        public double getPreviousPeriodAmount() { return previousPeriodAmount; }
        public void setPreviousPeriodAmount(double previousPeriodAmount) { this.previousPeriodAmount = previousPeriodAmount; }
        
        public double getChangePercentage() { return changePercentage; }
        public void setChangePercentage(double changePercentage) { this.changePercentage = changePercentage; }
        
        public String getChangeDirection() { return changeDirection; }
        public void setChangeDirection(String changeDirection) { this.changeDirection = changeDirection; }
        
        public List<TrendData.TrendPoint> getTrend() { return trend; }
        public void setTrend(List<TrendData.TrendPoint> trend) { this.trend = trend; }
        
        public List<DashboardSummary.ExpenseSnapshot> getTopExpenses() { return topExpenses; }
        public void setTopExpenses(List<DashboardSummary.ExpenseSnapshot> topExpenses) { this.topExpenses = topExpenses; }
    }
    
    public static class CategorySummary {
        private int totalCategories;
        private String topCategory;
        private double topCategoryAmount;
        private String fastestGrowingCategory;
        private double fastestGrowingRate;
        private String mostFrequentCategory;
        private int mostFrequentCount;
        
        // Getters and Setters
        public int getTotalCategories() { return totalCategories; }
        public void setTotalCategories(int totalCategories) { this.totalCategories = totalCategories; }
        
        public String getTopCategory() { return topCategory; }
        public void setTopCategory(String topCategory) { this.topCategory = topCategory; }
        
        public double getTopCategoryAmount() { return topCategoryAmount; }
        public void setTopCategoryAmount(double topCategoryAmount) { this.topCategoryAmount = topCategoryAmount; }
        
        public String getFastestGrowingCategory() { return fastestGrowingCategory; }
        public void setFastestGrowingCategory(String fastestGrowingCategory) { this.fastestGrowingCategory = fastestGrowingCategory; }
        
        public double getFastestGrowingRate() { return fastestGrowingRate; }
        public void setFastestGrowingRate(double fastestGrowingRate) { this.fastestGrowingRate = fastestGrowingRate; }
        
        public String getMostFrequentCategory() { return mostFrequentCategory; }
        public void setMostFrequentCategory(String mostFrequentCategory) { this.mostFrequentCategory = mostFrequentCategory; }
        
        public int getMostFrequentCount() { return mostFrequentCount; }
        public void setMostFrequentCount(int mostFrequentCount) { this.mostFrequentCount = mostFrequentCount; }
    }
    
    // Getters and Setters
    public List<CategoryDetail> getCategories() { return categories; }
    public void setCategories(List<CategoryDetail> categories) { this.categories = categories; }
    
    public CategorySummary getSummary() { return summary; }
    public void setSummary(CategorySummary summary) { this.summary = summary; }
}

