package com.splitzy.splitzy.service.analytics;

import com.splitzy.splitzy.dto.analytics.AnalyticsFilter;

/**
 * Base interface for pluggable analytics modules.
 * Each module handles a specific type of analysis and can be enabled/disabled.
 */
public interface AnalyticsModule<T> {
    
    /**
     * Get the unique identifier for this module.
     */
    String getModuleId();
    
    /**
     * Get the display name for this module.
     */
    String getModuleName();
    
    /**
     * Check if this module is enabled.
     */
    boolean isEnabled();
    
    /**
     * Execute the analysis for a given user with filters.
     */
    T analyze(String userId, AnalyticsFilter filter);
    
    /**
     * Get the cache key for this analysis.
     */
    default String getCacheKey(String userId, AnalyticsFilter filter) {
        return String.format("%s:%s:%s:%s",
            getModuleId(),
            userId,
            filter.getStartDate() != null ? filter.getStartDate().toString() : "null",
            filter.getEndDate() != null ? filter.getEndDate().toString() : "null"
        );
    }
    
    /**
     * Get the cache TTL in seconds.
     */
    default int getCacheTtlSeconds() {
        return 300; // 5 minutes default
    }
}

