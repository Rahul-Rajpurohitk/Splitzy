package com.splitzy.splitzy.dto.analytics;

import java.time.LocalDate;

/**
 * Filter criteria for analytics queries.
 * Supports flexible date ranges, category filters, and scope selection.
 */
public class AnalyticsFilter {
    
    // Date range filters
    private LocalDate startDate;
    private LocalDate endDate;
    
    // Granularity: DAILY, WEEKLY, MONTHLY, YEARLY
    private TimeGranularity granularity = TimeGranularity.MONTHLY;
    
    // Scope filters
    private String groupId;       // Filter by specific group
    private String friendId;      // Filter by specific friend
    private String category;      // Filter by category
    private String settledFilter; // "settled", "unsettled", or null for all
    
    // Comparison period (for period-over-period analysis)
    private boolean includeComparison = false;
    private LocalDate comparisonStartDate;
    private LocalDate comparisonEndDate;
    
    // Pagination for detailed lists
    private int page = 0;
    private int size = 20;
    
    // Sort options
    private String sortBy = "date";
    private String sortDirection = "DESC";
    
    public enum TimeGranularity {
        DAILY,
        WEEKLY,
        MONTHLY,
        QUARTERLY,
        YEARLY
    }
    
    // Builder pattern for fluent API
    public static AnalyticsFilter builder() {
        return new AnalyticsFilter();
    }
    
    public AnalyticsFilter withDateRange(LocalDate start, LocalDate end) {
        this.startDate = start;
        this.endDate = end;
        return this;
    }
    
    public AnalyticsFilter withGranularity(TimeGranularity granularity) {
        this.granularity = granularity;
        return this;
    }
    
    public AnalyticsFilter withGroup(String groupId) {
        this.groupId = groupId;
        return this;
    }
    
    public AnalyticsFilter withFriend(String friendId) {
        this.friendId = friendId;
        return this;
    }
    
    public AnalyticsFilter withCategory(String category) {
        this.category = category;
        return this;
    }

    public AnalyticsFilter withSettled(String settledFilter) {
        this.settledFilter = settledFilter;
        return this;
    }

    public AnalyticsFilter withComparison(LocalDate compStart, LocalDate compEnd) {
        this.includeComparison = true;
        this.comparisonStartDate = compStart;
        this.comparisonEndDate = compEnd;
        return this;
    }
    
    public AnalyticsFilter withPagination(int page, int size) {
        this.page = page;
        this.size = size;
        return this;
    }
    
    // Getters and Setters
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    
    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
    
    public TimeGranularity getGranularity() { return granularity; }
    public void setGranularity(TimeGranularity granularity) { this.granularity = granularity; }
    
    public String getGroupId() { return groupId; }
    public void setGroupId(String groupId) { this.groupId = groupId; }
    
    public String getFriendId() { return friendId; }
    public void setFriendId(String friendId) { this.friendId = friendId; }
    
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getSettledFilter() { return settledFilter; }
    public void setSettledFilter(String settledFilter) { this.settledFilter = settledFilter; }

    public boolean isIncludeComparison() { return includeComparison; }
    public void setIncludeComparison(boolean includeComparison) { this.includeComparison = includeComparison; }
    
    public LocalDate getComparisonStartDate() { return comparisonStartDate; }
    public void setComparisonStartDate(LocalDate comparisonStartDate) { this.comparisonStartDate = comparisonStartDate; }
    
    public LocalDate getComparisonEndDate() { return comparisonEndDate; }
    public void setComparisonEndDate(LocalDate comparisonEndDate) { this.comparisonEndDate = comparisonEndDate; }
    
    public int getPage() { return page; }
    public void setPage(int page) { this.page = page; }
    
    public int getSize() { return size; }
    public void setSize(int size) { this.size = size; }
    
    public String getSortBy() { return sortBy; }
    public void setSortBy(String sortBy) { this.sortBy = sortBy; }
    
    public String getSortDirection() { return sortDirection; }
    public void setSortDirection(String sortDirection) { this.sortDirection = sortDirection; }
}

