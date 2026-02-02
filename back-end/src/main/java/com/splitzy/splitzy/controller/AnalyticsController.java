package com.splitzy.splitzy.controller;

import com.splitzy.splitzy.dto.analytics.*;
import com.splitzy.splitzy.service.analytics.AnalyticsService;
import com.splitzy.splitzy.service.dao.UserDao;
import com.splitzy.splitzy.service.dao.UserDto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

/**
 * REST Controller for Analytics API endpoints.
 * Provides comprehensive analytics data for the dashboard.
 */
@RestController
@RequestMapping("/analytics")
@Profile("postgres")
public class AnalyticsController {

    @Autowired
    private AnalyticsService analyticsService;
    
    @Autowired
    private UserDao userDao;

    /**
     * Get dashboard summary with all key metrics.
     * This is the primary endpoint for the main dashboard view.
     */
    @GetMapping("/summary")
    public ResponseEntity<DashboardSummary> getDashboardSummary(
            Authentication auth,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String groupId,
            @RequestParam(required = false) String friendId,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String settledFilter) {

        String userId = getUserId(auth);

        AnalyticsFilter filter = AnalyticsFilter.builder()
            .withDateRange(startDate, endDate)
            .withGroup(groupId)
            .withFriend(friendId)
            .withCategory(category)
            .withSettled(settledFilter);

        DashboardSummary summary = analyticsService.getDashboardSummary(userId, filter);
        return ResponseEntity.ok(summary);
    }

    /**
     * Get spending trends over time.
     * Supports different granularities (daily, weekly, monthly).
     */
    @GetMapping("/trends")
    public ResponseEntity<TrendData> getSpendingTrends(
            Authentication auth,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "MONTHLY") String granularity,
            @RequestParam(required = false) String groupId,
            @RequestParam(required = false) String friendId,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String settledFilter,
            @RequestParam(defaultValue = "false") boolean includeComparison) {

        String userId = getUserId(auth);

        AnalyticsFilter filter = AnalyticsFilter.builder()
            .withDateRange(startDate, endDate)
            .withGranularity(parseGranularity(granularity))
            .withGroup(groupId)
            .withFriend(friendId)
            .withCategory(category)
            .withSettled(settledFilter);

        // Set comparison period if requested (previous equivalent period)
        if (includeComparison && startDate != null && endDate != null) {
            long days = java.time.temporal.ChronoUnit.DAYS.between(startDate, endDate);
            filter.withComparison(
                startDate.minusDays(days + 1),
                startDate.minusDays(1)
            );
        }

        TrendData trends = analyticsService.getSpendingTrends(userId, filter);
        return ResponseEntity.ok(trends);
    }

    /**
     * Get detailed category analytics.
     */
    @GetMapping("/categories")
    public ResponseEntity<CategoryAnalytics> getCategoryAnalytics(
            Authentication auth,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String groupId) {
        
        String userId = getUserId(auth);
        
        AnalyticsFilter filter = AnalyticsFilter.builder()
            .withDateRange(startDate, endDate)
            .withGroup(groupId);
        
        CategoryAnalytics analytics = analyticsService.getCategoryAnalytics(userId, filter);
        return ResponseEntity.ok(analytics);
    }

    /**
     * Get balance analytics - who owes whom.
     */
    @GetMapping("/balances")
    public ResponseEntity<BalanceAnalytics> getBalanceAnalytics(
            Authentication auth,
            @RequestParam(required = false) String groupId,
            @RequestParam(required = false) String friendId,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String settledFilter) {
        String userId = getUserId(auth);

        AnalyticsFilter filter = AnalyticsFilter.builder()
            .withGroup(groupId)
            .withFriend(friendId)
            .withCategory(category)
            .withSettled(settledFilter);

        BalanceAnalytics analytics = analyticsService.getBalanceAnalytics(userId, filter);
        return ResponseEntity.ok(analytics);
    }

    /**
     * Get analytics for a specific friend relationship.
     */
    @GetMapping("/friends/{friendId}")
    public ResponseEntity<FriendAnalytics> getFriendAnalytics(
            Authentication auth,
            @PathVariable String friendId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        String userId = getUserId(auth);
        
        AnalyticsFilter filter = AnalyticsFilter.builder()
            .withDateRange(startDate, endDate)
            .withFriend(friendId);
        
        FriendAnalytics analytics = analyticsService.getFriendAnalytics(userId, friendId, filter);
        return ResponseEntity.ok(analytics);
    }

    /**
     * Get analytics for a specific group.
     */
    @GetMapping("/groups/{groupId}")
    public ResponseEntity<GroupAnalytics> getGroupAnalytics(
            Authentication auth,
            @PathVariable String groupId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        String userId = getUserId(auth);
        
        AnalyticsFilter filter = AnalyticsFilter.builder()
            .withDateRange(startDate, endDate)
            .withGroup(groupId);
        
        GroupAnalytics analytics = analyticsService.getGroupAnalytics(userId, groupId, filter);
        return ResponseEntity.ok(analytics);
    }

    /**
     * Get quick stats for dashboard widgets.
     */
    @GetMapping("/quick-stats")
    public ResponseEntity<Map<String, Object>> getQuickStats(Authentication auth) {
        String userId = getUserId(auth);
        
        AnalyticsFilter filter = new AnalyticsFilter();
        DashboardSummary summary = analyticsService.getDashboardSummary(userId, filter);
        
        // Return just the essential quick stats
        return ResponseEntity.ok(Map.of(
            "balance", summary.getBalance(),
            "quickStats", summary.getQuickStats(),
            "topCategories", summary.getTopCategories()
        ));
    }

    /**
     * Get pending actions/settlements.
     */
    @GetMapping("/pending-actions")
    public ResponseEntity<?> getPendingActions(Authentication auth) {
        String userId = getUserId(auth);
        
        AnalyticsFilter filter = new AnalyticsFilter();
        DashboardSummary summary = analyticsService.getDashboardSummary(userId, filter);
        
        return ResponseEntity.ok(Map.of(
            "pendingActions", summary.getPendingActions(),
            "settlements", summary.getSettlements()
        ));
    }

    // ==========================================
    // Helper Methods
    // ==========================================

    private String getUserId(Authentication auth) {
        if (auth == null || auth.getName() == null) {
            throw new IllegalStateException("Authentication required");
        }
        // auth.getName() returns the email from JWT subject
        String email = auth.getName();
        UserDto user = userDao.findByEmail(email)
                .orElseThrow(() -> new com.splitzy.splitzy.exception.ResourceNotFoundException("User", email));
        return user.getId();
    }

    private AnalyticsFilter.TimeGranularity parseGranularity(String granularity) {
        try {
            return AnalyticsFilter.TimeGranularity.valueOf(granularity.toUpperCase());
        } catch (Exception e) {
            return AnalyticsFilter.TimeGranularity.MONTHLY;
        }
    }
}

