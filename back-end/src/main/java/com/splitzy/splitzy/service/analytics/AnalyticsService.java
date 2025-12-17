package com.splitzy.splitzy.service.analytics;

import com.splitzy.splitzy.dto.analytics.*;
import com.splitzy.splitzy.entity.ExpenseSql;
import com.splitzy.splitzy.entity.ParticipantSql;
import com.splitzy.splitzy.entity.PayerSql;
import com.splitzy.splitzy.repository.sql.ExpenseSqlRepository;
import com.splitzy.splitzy.service.FriendService;
import com.splitzy.splitzy.service.GroupService;
import com.splitzy.splitzy.service.RedisCacheService;
import com.splitzy.splitzy.service.dao.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.time.temporal.WeekFields;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Main Analytics Service - orchestrates all analytics modules.
 * Uses a modular approach for extensibility and maintainability.
 */
@Service
@Profile("postgres")
public class AnalyticsService {

    @Autowired
    private ExpenseSqlRepository expenseRepo;
    
    @Autowired
    private ExpenseDao expenseDao;
    
    @Autowired
    private UserDao userDao;
    
    @Autowired
    private GroupDao groupDao;
    
    @Autowired
    private FriendRequestDao friendRequestDao;
    
    @Autowired
    private FriendService friendService;
    
    @Autowired
    private GroupService groupService;
    
    @Autowired(required = false)
    private RedisCacheService cacheService;

    // ===========================================
    // DASHBOARD SUMMARY
    // ===========================================
    
    /**
     * Get comprehensive dashboard summary for a user.
     */
    public DashboardSummary getDashboardSummary(String userId, AnalyticsFilter filter) {
        // Apply default date range if not specified (current month)
        if (filter.getStartDate() == null) {
            filter.setStartDate(LocalDate.now().withDayOfMonth(1));
        }
        if (filter.getEndDate() == null) {
            filter.setEndDate(LocalDate.now());
        }
        
        DashboardSummary summary = new DashboardSummary();
        summary.setGeneratedAt(LocalDateTime.now());
        summary.setPeriodLabel(formatPeriodLabel(filter.getStartDate(), filter.getEndDate()));
        
        // Get all expenses for the user
        List<ExpenseSql> allExpenses = expenseRepo.findAllByUserInvolvement(
            userId, Sort.by(Sort.Direction.DESC, "date")
        );
        
        // Filter by date range
        List<ExpenseSql> periodExpenses = filterByDateRange(allExpenses, filter.getStartDate(), filter.getEndDate());
        
        // Calculate each section
        summary.setBalance(calculateBalanceSummary(userId, allExpenses));
        summary.setSpending(calculateSpendingSummary(userId, periodExpenses, filter));
        summary.setSettlements(calculateSettlementSummary(userId, allExpenses));
        summary.setActivity(calculateActivityMetrics(userId, periodExpenses, allExpenses));
        summary.setQuickStats(calculateQuickStats(userId, allExpenses));
        summary.setTopCategories(calculateTopCategories(userId, periodExpenses, 5));
        summary.setRecentExpenses(getRecentExpenseSnapshots(userId, periodExpenses, 5));
        summary.setPendingActions(calculatePendingActions(userId, allExpenses));
        
        return summary;
    }
    
    // ===========================================
    // TREND ANALYTICS
    // ===========================================
    
    /**
     * Get spending trends over time.
     */
    public TrendData getSpendingTrends(String userId, AnalyticsFilter filter) {
        // Default to last 6 months if not specified
        if (filter.getStartDate() == null) {
            filter.setStartDate(LocalDate.now().minusMonths(6).withDayOfMonth(1));
        }
        if (filter.getEndDate() == null) {
            filter.setEndDate(LocalDate.now());
        }
        
        List<ExpenseSql> allExpenses = expenseRepo.findAllByUserInvolvement(
            userId, Sort.by(Sort.Direction.ASC, "date")
        );
        
        List<ExpenseSql> periodExpenses = filterByDateRange(allExpenses, filter.getStartDate(), filter.getEndDate());
        
        // Apply category filter if specified
        if (filter.getCategory() != null && !filter.getCategory().isEmpty()) {
            periodExpenses = periodExpenses.stream()
                .filter(e -> filter.getCategory().equalsIgnoreCase(e.getCategory()))
                .collect(Collectors.toList());
        }
        
        // Apply group filter if specified
        if (filter.getGroupId() != null && !filter.getGroupId().isEmpty()) {
            periodExpenses = periodExpenses.stream()
                .filter(e -> filter.getGroupId().equals(e.getGroupId()))
                .collect(Collectors.toList());
        }
        
        TrendData trendData = new TrendData();
        trendData.setPeriodType(filter.getGranularity().name());
        
        // Group expenses by period
        Map<String, List<ExpenseSql>> groupedExpenses = groupByPeriod(periodExpenses, filter.getGranularity());
        
        List<TrendData.TrendPoint> dataPoints = new ArrayList<>();
        double totalSpending = 0;
        double totalIncome = 0;
        
        for (Map.Entry<String, List<ExpenseSql>> entry : groupedExpenses.entrySet()) {
            TrendData.TrendPoint point = calculateTrendPoint(userId, entry.getKey(), entry.getValue(), filter.getGranularity());
            dataPoints.add(point);
            totalSpending += point.getSpending();
            totalIncome += point.getIncome();
        }
        
        // Sort by period key
        dataPoints.sort(Comparator.comparing(TrendData.TrendPoint::getPeriodKey));
        trendData.setDataPoints(dataPoints);
        
        // Calculate summary
        TrendData.TrendSummary summary = new TrendData.TrendSummary();
        summary.setTotalSpending(totalSpending);
        summary.setTotalIncome(totalIncome);
        summary.setNetTotal(totalIncome - totalSpending);
        summary.setAveragePerPeriod(dataPoints.isEmpty() ? 0 : totalSpending / dataPoints.size());
        
        if (!dataPoints.isEmpty()) {
            TrendData.TrendPoint highest = dataPoints.stream()
                .max(Comparator.comparingDouble(TrendData.TrendPoint::getSpending))
                .orElse(null);
            TrendData.TrendPoint lowest = dataPoints.stream()
                .min(Comparator.comparingDouble(TrendData.TrendPoint::getSpending))
                .orElse(null);
            
            if (highest != null) {
                summary.setHighestPeriodAmount(highest.getSpending());
                summary.setHighestPeriodLabel(highest.getLabel());
            }
            if (lowest != null) {
                summary.setLowestPeriodAmount(lowest.getSpending());
                summary.setLowestPeriodLabel(lowest.getLabel());
            }
            
            // Calculate trend direction
            if (dataPoints.size() >= 2) {
                double firstHalfAvg = dataPoints.subList(0, dataPoints.size() / 2).stream()
                    .mapToDouble(TrendData.TrendPoint::getSpending).average().orElse(0);
                double secondHalfAvg = dataPoints.subList(dataPoints.size() / 2, dataPoints.size()).stream()
                    .mapToDouble(TrendData.TrendPoint::getSpending).average().orElse(0);
                
                if (firstHalfAvg > 0) {
                    double change = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
                    summary.setTrendPercentage(change);
                    summary.setTrendDirection(change > 5 ? "UP" : change < -5 ? "DOWN" : "STABLE");
                }
            }
        }
        
        trendData.setSummary(summary);
        
        // Add comparison data if requested
        if (filter.isIncludeComparison() && filter.getComparisonStartDate() != null) {
            List<ExpenseSql> compExpenses = filterByDateRange(allExpenses, 
                filter.getComparisonStartDate(), filter.getComparisonEndDate());
            Map<String, List<ExpenseSql>> compGrouped = groupByPeriod(compExpenses, filter.getGranularity());
            
            List<TrendData.TrendPoint> compPoints = new ArrayList<>();
            for (Map.Entry<String, List<ExpenseSql>> entry : compGrouped.entrySet()) {
                compPoints.add(calculateTrendPoint(userId, entry.getKey(), entry.getValue(), filter.getGranularity()));
            }
            compPoints.sort(Comparator.comparing(TrendData.TrendPoint::getPeriodKey));
            
            trendData.setComparisonDataPoints(compPoints);
            trendData.setComparisonLabel(formatPeriodLabel(filter.getComparisonStartDate(), filter.getComparisonEndDate()));
        }
        
        return trendData;
    }
    
    // ===========================================
    // CATEGORY ANALYTICS
    // ===========================================
    
    /**
     * Get detailed category analytics.
     */
    public CategoryAnalytics getCategoryAnalytics(String userId, AnalyticsFilter filter) {
        if (filter.getStartDate() == null) {
            filter.setStartDate(LocalDate.now().withDayOfMonth(1));
        }
        if (filter.getEndDate() == null) {
            filter.setEndDate(LocalDate.now());
        }
        
        List<ExpenseSql> allExpenses = expenseRepo.findAllByUserInvolvement(
            userId, Sort.by(Sort.Direction.DESC, "date")
        );
        
        List<ExpenseSql> periodExpenses = filterByDateRange(allExpenses, filter.getStartDate(), filter.getEndDate());
        
        // Get comparison period expenses (previous equivalent period)
        long daysDiff = ChronoUnit.DAYS.between(filter.getStartDate(), filter.getEndDate());
        LocalDate compStart = filter.getStartDate().minusDays(daysDiff + 1);
        LocalDate compEnd = filter.getStartDate().minusDays(1);
        List<ExpenseSql> compExpenses = filterByDateRange(allExpenses, compStart, compEnd);
        
        CategoryAnalytics analytics = new CategoryAnalytics();
        
        // Group by category
        Map<String, List<ExpenseSql>> byCategory = periodExpenses.stream()
            .filter(e -> e.getCategory() != null && !e.getCategory().isEmpty())
            .collect(Collectors.groupingBy(ExpenseSql::getCategory));
        
        Map<String, Double> compByCategory = compExpenses.stream()
            .filter(e -> e.getCategory() != null && !e.getCategory().isEmpty())
            .collect(Collectors.groupingBy(
                ExpenseSql::getCategory,
                Collectors.summingDouble(e -> getUserShare(userId, e))
            ));
        
        double totalSpending = periodExpenses.stream()
            .mapToDouble(e -> getUserShare(userId, e))
            .sum();
        
        List<CategoryAnalytics.CategoryDetail> categories = new ArrayList<>();
        
        for (Map.Entry<String, List<ExpenseSql>> entry : byCategory.entrySet()) {
            CategoryAnalytics.CategoryDetail detail = new CategoryAnalytics.CategoryDetail();
            detail.setCategory(entry.getKey());
            detail.setCategoryIcon(getCategoryIcon(entry.getKey()));
            
            double amount = entry.getValue().stream()
                .mapToDouble(e -> getUserShare(userId, e))
                .sum();
            detail.setTotalAmount(amount);
            detail.setPercentage(totalSpending > 0 ? (amount / totalSpending) * 100 : 0);
            detail.setExpenseCount(entry.getValue().size());
            detail.setAverageAmount(entry.getValue().isEmpty() ? 0 : amount / entry.getValue().size());
            
            DoubleSummaryStatistics stats = entry.getValue().stream()
                .mapToDouble(e -> getUserShare(userId, e))
                .summaryStatistics();
            detail.setMinAmount(stats.getMin());
            detail.setMaxAmount(stats.getMax());
            
            // Comparison with previous period
            double prevAmount = compByCategory.getOrDefault(entry.getKey(), 0.0);
            detail.setPreviousPeriodAmount(prevAmount);
            if (prevAmount > 0) {
                double change = ((amount - prevAmount) / prevAmount) * 100;
                detail.setChangePercentage(change);
                detail.setChangeDirection(change > 5 ? "UP" : change < -5 ? "DOWN" : "STABLE");
            } else {
                detail.setChangePercentage(amount > 0 ? 100 : 0);
                detail.setChangeDirection(amount > 0 ? "UP" : "STABLE");
            }
            
            // Top 3 expenses in category
            List<DashboardSummary.ExpenseSnapshot> topExpenses = entry.getValue().stream()
                .sorted(Comparator.comparingDouble(ExpenseSql::getTotalAmount).reversed())
                .limit(3)
                .map(e -> toExpenseSnapshot(userId, e))
                .collect(Collectors.toList());
            detail.setTopExpenses(topExpenses);
            
            categories.add(detail);
        }
        
        // Sort by amount
        categories.sort(Comparator.comparingDouble(CategoryAnalytics.CategoryDetail::getTotalAmount).reversed());
        analytics.setCategories(categories);
        
        // Summary
        CategoryAnalytics.CategorySummary summary = new CategoryAnalytics.CategorySummary();
        summary.setTotalCategories(categories.size());
        
        if (!categories.isEmpty()) {
            CategoryAnalytics.CategoryDetail top = categories.get(0);
            summary.setTopCategory(top.getCategory());
            summary.setTopCategoryAmount(top.getTotalAmount());
            
            // Most frequent
            categories.stream()
                .max(Comparator.comparingInt(CategoryAnalytics.CategoryDetail::getExpenseCount))
                .ifPresent(c -> {
                    summary.setMostFrequentCategory(c.getCategory());
                    summary.setMostFrequentCount(c.getExpenseCount());
                });
            
            // Fastest growing
            categories.stream()
                .max(Comparator.comparingDouble(CategoryAnalytics.CategoryDetail::getChangePercentage))
                .ifPresent(c -> {
                    summary.setFastestGrowingCategory(c.getCategory());
                    summary.setFastestGrowingRate(c.getChangePercentage());
                });
        }
        
        analytics.setSummary(summary);
        
        return analytics;
    }
    
    // ===========================================
    // BALANCE ANALYTICS
    // ===========================================
    
    /**
     * Get detailed balance analytics.
     */
    public BalanceAnalytics getBalanceAnalytics(String userId, AnalyticsFilter filter) {
        List<ExpenseSql> allExpenses = expenseRepo.findAllByUserInvolvement(
            userId, Sort.by(Sort.Direction.DESC, "date")
        );
        
        BalanceAnalytics analytics = new BalanceAnalytics();
        
        // Calculate per-friend balances
        Map<String, Double> friendBalances = new HashMap<>();
        Map<String, Integer> friendExpenseCounts = new HashMap<>();
        Map<String, Double> friendTotalShared = new HashMap<>();
        Map<String, LocalDateTime> friendLastActivity = new HashMap<>();
        
        for (ExpenseSql expense : allExpenses) {
            // Get all other participants
            Set<String> otherUsers = new HashSet<>();
            for (ParticipantSql p : expense.getParticipants()) {
                if (!p.getUserId().equals(userId)) {
                    otherUsers.add(p.getUserId());
                }
            }
            for (PayerSql p : expense.getPayers()) {
                if (!p.getUserId().equals(userId)) {
                    otherUsers.add(p.getUserId());
                }
            }
            
            // Calculate user's net in this expense
            double userNet = getUserNet(userId, expense);
            
            // Distribute balance to other participants
            if (!otherUsers.isEmpty() && userNet != 0) {
                double perPerson = userNet / otherUsers.size();
                for (String otherId : otherUsers) {
                    friendBalances.merge(otherId, perPerson, Double::sum);
                    friendExpenseCounts.merge(otherId, 1, Integer::sum);
                    friendTotalShared.merge(otherId, expense.getTotalAmount(), Double::sum);
                    
                    LocalDateTime expenseTime = expense.getCreatedAt();
                    friendLastActivity.merge(otherId, expenseTime, 
                        (old, newVal) -> newVal.isAfter(old) ? newVal : old);
                }
            }
        }
        
        // Build friend balance list
        List<BalanceAnalytics.FriendBalance> friendBalanceList = new ArrayList<>();
        double totalOwed = 0;
        double totalOwing = 0;
        
        for (Map.Entry<String, Double> entry : friendBalances.entrySet()) {
            String friendId = entry.getKey();
            double balance = entry.getValue();
            
            if (Math.abs(balance) < 0.01) continue; // Skip zero balances
            
            BalanceAnalytics.FriendBalance fb = new BalanceAnalytics.FriendBalance();
            fb.setFriendId(friendId);
            
            // Get friend info
            userDao.findById(friendId).ifPresent(user -> {
                fb.setFriendName(user.getName());
                fb.setFriendAvatar(user.getAvatarUrl());
            });
            
            fb.setBalance(balance);
            fb.setBalanceDirection(balance > 0 ? "OWED_TO_YOU" : "YOU_OWE");
            fb.setSharedExpenses(friendExpenseCounts.getOrDefault(friendId, 0));
            fb.setTotalShared(friendTotalShared.getOrDefault(friendId, 0.0));
            fb.setLastActivity(friendLastActivity.get(friendId));
            
            friendBalanceList.add(fb);
            
            if (balance > 0) {
                totalOwed += balance;
            } else {
                totalOwing += Math.abs(balance);
            }
        }
        
        // Sort by absolute balance
        friendBalanceList.sort(Comparator.comparingDouble(fb -> -Math.abs(fb.getBalance())));
        analytics.setFriendBalances(friendBalanceList);
        
        // Overview
        BalanceAnalytics.BalanceOverview overview = new BalanceAnalytics.BalanceOverview();
        overview.setTotalOwedToYou(totalOwed);
        overview.setTotalYouOwe(totalOwing);
        overview.setNetBalance(totalOwed - totalOwing);
        overview.setUnsettledCount(friendBalanceList.size());
        
        if (!friendBalanceList.isEmpty()) {
            BalanceAnalytics.FriendBalance largest = friendBalanceList.get(0);
            overview.setLargestBalance(Math.abs(largest.getBalance()));
            overview.setLargestBalanceWith(largest.getFriendName());
        }
        
        analytics.setOverview(overview);
        
        // Group balances
        List<BalanceAnalytics.GroupBalance> groupBalanceList = calculateGroupBalances(userId, allExpenses);
        analytics.setGroupBalances(groupBalanceList);
        
        return analytics;
    }
    
    // ===========================================
    // FRIEND ANALYTICS
    // ===========================================
    
    /**
     * Get analytics for a specific friend relationship.
     */
    public FriendAnalytics getFriendAnalytics(String userId, String friendId, AnalyticsFilter filter) {
        if (filter.getStartDate() == null) {
            filter.setStartDate(LocalDate.now().minusMonths(6));
        }
        if (filter.getEndDate() == null) {
            filter.setEndDate(LocalDate.now());
        }
        
        // Get shared expenses
        List<ExpenseSql> sharedExpenses = expenseRepo.findAllByBothUserInvolvement(
            userId, friendId, Sort.by(Sort.Direction.DESC, "date")
        );
        
        List<ExpenseSql> periodExpenses = filterByDateRange(sharedExpenses, filter.getStartDate(), filter.getEndDate());
        
        FriendAnalytics analytics = new FriendAnalytics();
        
        // Friend profile
        FriendAnalytics.FriendProfile profile = new FriendAnalytics.FriendProfile();
        profile.setFriendId(friendId);
        userDao.findById(friendId).ifPresent(user -> {
            profile.setName(user.getName());
            profile.setEmail(user.getEmail());
            profile.setAvatarUrl(user.getAvatarUrl());
        });
        analytics.setFriend(profile);
        
        // Relationship summary
        FriendAnalytics.RelationshipSummary relationship = new FriendAnalytics.RelationshipSummary();
        
        double currentBalance = 0;
        double totalShared = 0;
        Map<String, Integer> categoryCounts = new HashMap<>();
        
        for (ExpenseSql expense : sharedExpenses) {
            currentBalance += getUserNet(userId, expense);
            totalShared += expense.getTotalAmount();
            if (expense.getCategory() != null) {
                categoryCounts.merge(expense.getCategory(), 1, Integer::sum);
            }
        }
        
        relationship.setCurrentBalance(currentBalance);
        relationship.setBalanceDirection(currentBalance > 0 ? "OWED_TO_YOU" : currentBalance < 0 ? "YOU_OWE" : "SETTLED");
        relationship.setTotalSharedExpenses(sharedExpenses.size());
        relationship.setTotalSharedAmount(totalShared);
        relationship.setAverageExpenseAmount(sharedExpenses.isEmpty() ? 0 : totalShared / sharedExpenses.size());
        
        // Most common category
        categoryCounts.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .ifPresent(e -> relationship.setMostCommonCategory(e.getKey()));
        
        if (!sharedExpenses.isEmpty()) {
            relationship.setLastExpense(sharedExpenses.get(0).getCreatedAt());
        }
        
        analytics.setRelationship(relationship);
        
        // Spending trend
        filter.setGranularity(AnalyticsFilter.TimeGranularity.MONTHLY);
        Map<String, List<ExpenseSql>> grouped = groupByPeriod(periodExpenses, filter.getGranularity());
        List<TrendData.TrendPoint> trend = new ArrayList<>();
        for (Map.Entry<String, List<ExpenseSql>> entry : grouped.entrySet()) {
            trend.add(calculateTrendPoint(userId, entry.getKey(), entry.getValue(), filter.getGranularity()));
        }
        trend.sort(Comparator.comparing(TrendData.TrendPoint::getPeriodKey));
        analytics.setSpendingTrend(trend);
        
        // Category breakdown
        analytics.setCategoryBreakdown(calculateTopCategories(userId, periodExpenses, 10));
        
        // Recent expenses
        analytics.setRecentExpenses(getRecentExpenseSnapshots(userId, periodExpenses, 10));
        
        return analytics;
    }
    
    // ===========================================
    // GROUP ANALYTICS
    // ===========================================
    
    /**
     * Get analytics for a specific group.
     */
    public GroupAnalytics getGroupAnalytics(String userId, String groupId, AnalyticsFilter filter) {
        if (filter.getStartDate() == null) {
            filter.setStartDate(LocalDate.now().minusMonths(6));
        }
        if (filter.getEndDate() == null) {
            filter.setEndDate(LocalDate.now());
        }
        
        List<ExpenseSql> groupExpenses = expenseRepo.findAllByGroupId(
            groupId, Sort.by(Sort.Direction.DESC, "date")
        );
        
        List<ExpenseSql> periodExpenses = filterByDateRange(groupExpenses, filter.getStartDate(), filter.getEndDate());
        
        GroupAnalytics analytics = new GroupAnalytics();
        
        // Group profile
        GroupAnalytics.GroupProfile profile = new GroupAnalytics.GroupProfile();
        profile.setGroupId(groupId);
        groupDao.findById(groupId).ifPresent(group -> {
            profile.setName(group.getGroupName());
            profile.setMemberCount(group.getFriends() != null ? group.getFriends().size() + 1 : 1);
            profile.setCreatedAt(group.getCreatedAt());
            profile.setCreatorName(group.getCreatorName());
        });
        analytics.setGroup(profile);
        
        // Financials
        GroupAnalytics.GroupFinancials financials = new GroupAnalytics.GroupFinancials();
        
        double totalSpending = groupExpenses.stream().mapToDouble(ExpenseSql::getTotalAmount).sum();
        double yourContribution = 0;
        double yourShare = 0;
        Map<String, Integer> categoryCounts = new HashMap<>();
        Map<String, Double> categoryAmounts = new HashMap<>();
        
        for (ExpenseSql expense : groupExpenses) {
            // Your contribution (what you paid)
            for (PayerSql payer : expense.getPayers()) {
                if (payer.getUserId().equals(userId)) {
                    yourContribution += payer.getPaidAmount();
                }
            }
            // Your share
            for (ParticipantSql p : expense.getParticipants()) {
                if (p.getUserId().equals(userId)) {
                    yourShare += p.getShare();
                }
            }
            
            if (expense.getCategory() != null) {
                categoryCounts.merge(expense.getCategory(), 1, Integer::sum);
                categoryAmounts.merge(expense.getCategory(), expense.getTotalAmount(), Double::sum);
            }
        }
        
        financials.setTotalSpending(totalSpending);
        financials.setExpenseCount(groupExpenses.size());
        financials.setAverageExpense(groupExpenses.isEmpty() ? 0 : totalSpending / groupExpenses.size());
        financials.setYourContribution(yourContribution);
        financials.setYourShare(yourShare);
        financials.setYourBalance(yourContribution - yourShare);
        financials.setBalanceDirection(yourContribution > yourShare ? "OWED_TO_YOU" : 
            yourContribution < yourShare ? "YOU_OWE" : "SETTLED");
        
        if (!groupExpenses.isEmpty()) {
            financials.setLastActivity(groupExpenses.get(0).getCreatedAt());
        }
        
        // Top category
        categoryAmounts.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .ifPresent(e -> {
                financials.setTopCategory(e.getKey());
                financials.setTopCategoryAmount(e.getValue());
            });
        
        if (profile.getMemberCount() > 0) {
            financials.setAveragePerMember(totalSpending / profile.getMemberCount());
        }
        
        analytics.setFinancials(financials);
        
        // Member contributions
        Map<String, GroupAnalytics.MemberContribution> memberMap = new HashMap<>();
        
        for (ExpenseSql expense : groupExpenses) {
            // Track payers
            for (PayerSql payer : expense.getPayers()) {
                memberMap.computeIfAbsent(payer.getUserId(), id -> {
                    GroupAnalytics.MemberContribution mc = new GroupAnalytics.MemberContribution();
                    mc.setMemberId(id);
                    userDao.findById(id).ifPresent(u -> {
                        mc.setMemberName(u.getName());
                        mc.setMemberAvatar(u.getAvatarUrl());
                    });
                    return mc;
                });
                GroupAnalytics.MemberContribution mc = memberMap.get(payer.getUserId());
                mc.setTotalPaid(mc.getTotalPaid() + payer.getPaidAmount());
            }
            
            // Track participants
            for (ParticipantSql p : expense.getParticipants()) {
                memberMap.computeIfAbsent(p.getUserId(), id -> {
                    GroupAnalytics.MemberContribution mc = new GroupAnalytics.MemberContribution();
                    mc.setMemberId(id);
                    userDao.findById(id).ifPresent(u -> {
                        mc.setMemberName(u.getName());
                        mc.setMemberAvatar(u.getAvatarUrl());
                    });
                    return mc;
                });
                GroupAnalytics.MemberContribution mc = memberMap.get(p.getUserId());
                mc.setTotalShare(mc.getTotalShare() + p.getShare());
            }
            
            // Track creator
            if (expense.getCreatorId() != null) {
                memberMap.computeIfAbsent(expense.getCreatorId(), id -> {
                    GroupAnalytics.MemberContribution mc = new GroupAnalytics.MemberContribution();
                    mc.setMemberId(id);
                    userDao.findById(id).ifPresent(u -> {
                        mc.setMemberName(u.getName());
                        mc.setMemberAvatar(u.getAvatarUrl());
                    });
                    return mc;
                });
                memberMap.get(expense.getCreatorId()).setExpensesCreated(
                    memberMap.get(expense.getCreatorId()).getExpensesCreated() + 1
                );
            }
        }
        
        // Finalize member contributions
        List<GroupAnalytics.MemberContribution> contributions = new ArrayList<>(memberMap.values());
        for (GroupAnalytics.MemberContribution mc : contributions) {
            mc.setBalance(mc.getTotalPaid() - mc.getTotalShare());
            mc.setBalanceDirection(mc.getBalance() > 0 ? "OWED_TO_THEM" : mc.getBalance() < 0 ? "THEY_OWE" : "SETTLED");
            mc.setContributionPercentage(totalSpending > 0 ? (mc.getTotalPaid() / totalSpending) * 100 : 0);
        }
        contributions.sort(Comparator.comparingDouble(GroupAnalytics.MemberContribution::getTotalPaid).reversed());
        analytics.setMemberContributions(contributions);
        
        // Spending trend
        filter.setGranularity(AnalyticsFilter.TimeGranularity.MONTHLY);
        Map<String, List<ExpenseSql>> grouped = groupByPeriod(periodExpenses, filter.getGranularity());
        List<TrendData.TrendPoint> trend = new ArrayList<>();
        for (Map.Entry<String, List<ExpenseSql>> entry : grouped.entrySet()) {
            trend.add(calculateTrendPoint(userId, entry.getKey(), entry.getValue(), filter.getGranularity()));
        }
        trend.sort(Comparator.comparing(TrendData.TrendPoint::getPeriodKey));
        analytics.setSpendingTrend(trend);
        
        // Category breakdown
        analytics.setCategoryBreakdown(calculateTopCategories(userId, periodExpenses, 10));
        
        // Recent expenses
        analytics.setRecentExpenses(getRecentExpenseSnapshots(userId, periodExpenses, 10));
        
        return analytics;
    }

    // ===========================================
    // HELPER METHODS
    // ===========================================
    
    private List<ExpenseSql> filterByDateRange(List<ExpenseSql> expenses, LocalDate start, LocalDate end) {
        return expenses.stream()
            .filter(e -> e.getDate() != null)
            .filter(e -> !e.getDate().isBefore(start) && !e.getDate().isAfter(end))
            .collect(Collectors.toList());
    }
    
    private Map<String, List<ExpenseSql>> groupByPeriod(List<ExpenseSql> expenses, AnalyticsFilter.TimeGranularity granularity) {
        DateTimeFormatter formatter;
        
        switch (granularity) {
            case DAILY:
                formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
                break;
            case WEEKLY:
                return expenses.stream()
                    .filter(e -> e.getDate() != null)
                    .collect(Collectors.groupingBy(e -> {
                        LocalDate date = e.getDate();
                        WeekFields weekFields = WeekFields.of(DayOfWeek.MONDAY, 1);
                        int week = date.get(weekFields.weekOfWeekBasedYear());
                        int year = date.get(weekFields.weekBasedYear());
                        return String.format("%d-W%02d", year, week);
                    }));
            case MONTHLY:
                formatter = DateTimeFormatter.ofPattern("yyyy-MM");
                break;
            case QUARTERLY:
                return expenses.stream()
                    .filter(e -> e.getDate() != null)
                    .collect(Collectors.groupingBy(e -> {
                        LocalDate date = e.getDate();
                        int quarter = (date.getMonthValue() - 1) / 3 + 1;
                        return String.format("%d-Q%d", date.getYear(), quarter);
                    }));
            case YEARLY:
                formatter = DateTimeFormatter.ofPattern("yyyy");
                break;
            default:
                formatter = DateTimeFormatter.ofPattern("yyyy-MM");
        }
        
        final DateTimeFormatter finalFormatter = formatter;
        return expenses.stream()
            .filter(e -> e.getDate() != null)
            .collect(Collectors.groupingBy(e -> e.getDate().format(finalFormatter)));
    }
    
    private TrendData.TrendPoint calculateTrendPoint(String userId, String periodKey, List<ExpenseSql> expenses, 
            AnalyticsFilter.TimeGranularity granularity) {
        TrendData.TrendPoint point = new TrendData.TrendPoint();
        point.setPeriodKey(periodKey);
        point.setLabel(formatPeriodKey(periodKey, granularity));
        
        double spending = 0;
        double income = 0;
        
        for (ExpenseSql expense : expenses) {
            double share = getUserShare(userId, expense);
            double paid = getUserPaid(userId, expense);
            double net = paid - share;
            
            spending += share;
            if (net > 0) {
                income += net;
            }
        }
        
        point.setSpending(spending);
        point.setIncome(income);
        point.setNetFlow(income - spending);
        point.setExpenseCount(expenses.size());
        point.setAverageExpense(expenses.isEmpty() ? 0 : spending / expenses.size());
        
        // Category breakdown for this period
        Map<String, Double> categoryMap = expenses.stream()
            .filter(e -> e.getCategory() != null)
            .collect(Collectors.groupingBy(
                ExpenseSql::getCategory,
                Collectors.summingDouble(e -> getUserShare(userId, e))
            ));
        
        List<TrendData.CategoryAmount> categoryBreakdown = categoryMap.entrySet().stream()
            .map(e -> new TrendData.CategoryAmount(e.getKey(), e.getValue()))
            .collect(Collectors.toList());
        point.setCategoryBreakdown(categoryBreakdown);
        
        return point;
    }
    
    private String formatPeriodKey(String periodKey, AnalyticsFilter.TimeGranularity granularity) {
        try {
            switch (granularity) {
                case DAILY:
                    LocalDate date = LocalDate.parse(periodKey);
                    return date.format(DateTimeFormatter.ofPattern("MMM d"));
                case WEEKLY:
                    return "Week " + periodKey.split("-W")[1];
                case MONTHLY:
                    String[] parts = periodKey.split("-");
                    return java.time.Month.of(Integer.parseInt(parts[1])).name().substring(0, 3) + " " + parts[0];
                case QUARTERLY:
                    return periodKey.replace("-", " ");
                case YEARLY:
                    return periodKey;
                default:
                    return periodKey;
            }
        } catch (Exception e) {
            return periodKey;
        }
    }
    
    private String formatPeriodLabel(LocalDate start, LocalDate end) {
        if (start.getMonth() == end.getMonth() && start.getYear() == end.getYear()) {
            return start.format(DateTimeFormatter.ofPattern("MMMM yyyy"));
        }
        return start.format(DateTimeFormatter.ofPattern("MMM d")) + " - " + 
               end.format(DateTimeFormatter.ofPattern("MMM d, yyyy"));
    }
    
    private double getUserShare(String userId, ExpenseSql expense) {
        return expense.getParticipants().stream()
            .filter(p -> p.getUserId().equals(userId))
            .mapToDouble(ParticipantSql::getShare)
            .sum();
    }
    
    private double getUserPaid(String userId, ExpenseSql expense) {
        return expense.getPayers().stream()
            .filter(p -> p.getUserId().equals(userId))
            .mapToDouble(PayerSql::getPaidAmount)
            .sum();
    }
    
    private double getUserNet(String userId, ExpenseSql expense) {
        return getUserPaid(userId, expense) - getUserShare(userId, expense);
    }
    
    private DashboardSummary.BalanceSummary calculateBalanceSummary(String userId, List<ExpenseSql> expenses) {
        DashboardSummary.BalanceSummary summary = new DashboardSummary.BalanceSummary();
        
        Map<String, Double> personBalances = new HashMap<>();
        
        for (ExpenseSql expense : expenses) {
            double userNet = getUserNet(userId, expense);
            if (userNet == 0) continue;
            
            Set<String> others = new HashSet<>();
            expense.getParticipants().stream()
                .filter(p -> !p.getUserId().equals(userId))
                .forEach(p -> others.add(p.getUserId()));
            expense.getPayers().stream()
                .filter(p -> !p.getUserId().equals(userId))
                .forEach(p -> others.add(p.getUserId()));
            
            if (!others.isEmpty()) {
                double perPerson = userNet / others.size();
                others.forEach(id -> personBalances.merge(id, perPerson, Double::sum));
            }
        }
        
        double totalOwed = 0;
        double totalOwing = 0;
        int friendsOwingYou = 0;
        int friendsYouOwe = 0;
        double largestCredit = 0;
        String largestCreditFrom = null;
        double largestDebt = 0;
        String largestDebtTo = null;
        
        for (Map.Entry<String, Double> entry : personBalances.entrySet()) {
            double balance = entry.getValue();
            if (balance > 0) {
                totalOwed += balance;
                friendsOwingYou++;
                if (balance > largestCredit) {
                    largestCredit = balance;
                    largestCreditFrom = entry.getKey();
                }
            } else if (balance < 0) {
                totalOwing += Math.abs(balance);
                friendsYouOwe++;
                if (Math.abs(balance) > largestDebt) {
                    largestDebt = Math.abs(balance);
                    largestDebtTo = entry.getKey();
                }
            }
        }
        
        summary.setTotalOwed(totalOwed);
        summary.setTotalOwing(totalOwing);
        summary.setNetBalance(totalOwed - totalOwing);
        summary.setFriendsOwingYou(friendsOwingYou);
        summary.setFriendsYouOwe(friendsYouOwe);
        summary.setLargestCredit(largestCredit);
        summary.setLargestDebt(largestDebt);
        
        if (largestCreditFrom != null) {
            userDao.findById(largestCreditFrom).ifPresent(u -> summary.setLargestCreditFrom(u.getName()));
        }
        if (largestDebtTo != null) {
            userDao.findById(largestDebtTo).ifPresent(u -> summary.setLargestDebtTo(u.getName()));
        }
        
        return summary;
    }
    
    private DashboardSummary.SpendingSummary calculateSpendingSummary(String userId, List<ExpenseSql> expenses, AnalyticsFilter filter) {
        DashboardSummary.SpendingSummary summary = new DashboardSummary.SpendingSummary();
        
        double totalSpent = expenses.stream()
            .mapToDouble(e -> getUserShare(userId, e))
            .sum();
        
        summary.setTotalSpent(totalSpent);
        summary.setExpenseCount(expenses.size());
        summary.setAveragePerExpense(expenses.isEmpty() ? 0 : totalSpent / expenses.size());
        
        long days = ChronoUnit.DAYS.between(filter.getStartDate(), filter.getEndDate()) + 1;
        summary.setAveragePerDay(days > 0 ? totalSpent / days : 0);
        summary.setAveragePerWeek(days >= 7 ? (totalSpent / days) * 7 : totalSpent);
        
        return summary;
    }
    
    private DashboardSummary.SettlementSummary calculateSettlementSummary(String userId, List<ExpenseSql> expenses) {
        DashboardSummary.SettlementSummary summary = new DashboardSummary.SettlementSummary();
        
        Map<String, Double> balances = new HashMap<>();
        for (ExpenseSql expense : expenses) {
            double userNet = getUserNet(userId, expense);
            if (userNet == 0) continue;
            
            Set<String> others = new HashSet<>();
            expense.getParticipants().forEach(p -> {
                if (!p.getUserId().equals(userId)) others.add(p.getUserId());
            });
            expense.getPayers().forEach(p -> {
                if (!p.getUserId().equals(userId)) others.add(p.getUserId());
            });
            
            if (!others.isEmpty()) {
                double perPerson = userNet / others.size();
                others.forEach(id -> balances.merge(id, perPerson, Double::sum));
            }
        }
        
        int pending = 0;
        double pendingAmount = 0;
        
        for (Double balance : balances.values()) {
            if (Math.abs(balance) >= 0.01) {
                pending++;
                pendingAmount += Math.abs(balance);
            }
        }
        
        summary.setPendingSettlements(pending);
        summary.setPendingAmount(pendingAmount);
        
        return summary;
    }
    
    private DashboardSummary.ActivityMetrics calculateActivityMetrics(String userId, List<ExpenseSql> periodExpenses, List<ExpenseSql> allExpenses) {
        DashboardSummary.ActivityMetrics metrics = new DashboardSummary.ActivityMetrics();
        
        metrics.setExpensesCreated((int) periodExpenses.stream()
            .filter(e -> userId.equals(e.getCreatorId()))
            .count());
        
        metrics.setExpensesParticipated(periodExpenses.size());
        
        Set<String> activeGroups = periodExpenses.stream()
            .filter(e -> e.getGroupId() != null)
            .map(ExpenseSql::getGroupId)
            .collect(Collectors.toSet());
        metrics.setGroupsActive(activeGroups.size());
        
        Set<String> friends = new HashSet<>();
        for (ExpenseSql expense : periodExpenses) {
            expense.getParticipants().forEach(p -> {
                if (!p.getUserId().equals(userId)) friends.add(p.getUserId());
            });
            expense.getPayers().forEach(p -> {
                if (!p.getUserId().equals(userId)) friends.add(p.getUserId());
            });
        }
        metrics.setFriendsInteracted(friends.size());
        
        if (!allExpenses.isEmpty()) {
            metrics.setLastActivity(allExpenses.get(0).getCreatedAt());
        }
        
        return metrics;
    }
    
    private DashboardSummary.QuickStats calculateQuickStats(String userId, List<ExpenseSql> allExpenses) {
        DashboardSummary.QuickStats stats = new DashboardSummary.QuickStats();
        
        // Count friends (from user's friendIds set)
        userDao.findById(userId).ifPresent(user -> {
            stats.setTotalFriends(user.getFriendIds() != null ? user.getFriendIds().size() : 0);
        });
        
        // Count groups (user is creator or member)
        List<GroupDto> groups = groupDao.findByCreatorIdOrMemberId(userId);
        stats.setTotalGroups(groups.size());
        
        stats.setTotalExpenses(allExpenses.size());
        
        double lifetime = allExpenses.stream()
            .mapToDouble(e -> getUserShare(userId, e))
            .sum();
        stats.setLifetimeSpending(lifetime);
        
        return stats;
    }
    
    private List<DashboardSummary.CategoryBreakdown> calculateTopCategories(String userId, List<ExpenseSql> expenses, int limit) {
        Map<String, Double> categoryAmounts = new HashMap<>();
        Map<String, Integer> categoryCounts = new HashMap<>();
        
        for (ExpenseSql expense : expenses) {
            String category = expense.getCategory() != null ? expense.getCategory() : "Other";
            double share = getUserShare(userId, expense);
            categoryAmounts.merge(category, share, Double::sum);
            categoryCounts.merge(category, 1, Integer::sum);
        }
        
        double total = categoryAmounts.values().stream().mapToDouble(Double::doubleValue).sum();
        
        return categoryAmounts.entrySet().stream()
            .map(e -> {
                DashboardSummary.CategoryBreakdown cb = new DashboardSummary.CategoryBreakdown();
                cb.setCategory(e.getKey());
                cb.setAmount(e.getValue());
                cb.setPercentage(total > 0 ? (e.getValue() / total) * 100 : 0);
                cb.setCount(categoryCounts.getOrDefault(e.getKey(), 0));
                return cb;
            })
            .sorted(Comparator.comparingDouble(DashboardSummary.CategoryBreakdown::getAmount).reversed())
            .limit(limit)
            .collect(Collectors.toList());
    }
    
    private List<DashboardSummary.ExpenseSnapshot> getRecentExpenseSnapshots(String userId, List<ExpenseSql> expenses, int limit) {
        return expenses.stream()
            .sorted(Comparator.comparing(ExpenseSql::getDate).reversed())
            .limit(limit)
            .map(e -> toExpenseSnapshot(userId, e))
            .collect(Collectors.toList());
    }
    
    private DashboardSummary.ExpenseSnapshot toExpenseSnapshot(String userId, ExpenseSql expense) {
        DashboardSummary.ExpenseSnapshot snapshot = new DashboardSummary.ExpenseSnapshot();
        snapshot.setId(expense.getId());
        snapshot.setDescription(expense.getDescription());
        snapshot.setCategory(expense.getCategory());
        snapshot.setAmount(expense.getTotalAmount());
        snapshot.setDate(expense.getDate() != null ? expense.getDate().toString() : null);
        snapshot.setGroupName(expense.getGroupName());
        snapshot.setYourShare(getUserShare(userId, expense));
        snapshot.setYourNet(getUserNet(userId, expense));
        return snapshot;
    }
    
    private List<DashboardSummary.PendingAction> calculatePendingActions(String userId, List<ExpenseSql> expenses) {
        List<DashboardSummary.PendingAction> actions = new ArrayList<>();
        
        // Calculate per-person balances
        Map<String, Double> personBalances = new HashMap<>();
        for (ExpenseSql expense : expenses) {
            double userNet = getUserNet(userId, expense);
            if (userNet == 0) continue;
            
            Set<String> others = new HashSet<>();
            expense.getParticipants().forEach(p -> {
                if (!p.getUserId().equals(userId)) others.add(p.getUserId());
            });
            expense.getPayers().forEach(p -> {
                if (!p.getUserId().equals(userId)) others.add(p.getUserId());
            });
            
            if (!others.isEmpty()) {
                double perPerson = userNet / others.size();
                others.forEach(id -> personBalances.merge(id, perPerson, Double::sum));
            }
        }
        
        // Create pending actions for debts
        for (Map.Entry<String, Double> entry : personBalances.entrySet()) {
            if (entry.getValue() < -0.01) { // You owe money
                DashboardSummary.PendingAction action = new DashboardSummary.PendingAction();
                action.setType("SETTLE_UP");
                action.setAmount(Math.abs(entry.getValue()));
                action.setReferenceId(entry.getKey());
                
                userDao.findById(entry.getKey()).ifPresent(u -> {
                    action.setCounterparty(u.getName());
                    action.setDescription("You owe " + u.getName() + " $" + String.format("%.2f", Math.abs(entry.getValue())));
                });
                
                actions.add(action);
            }
        }
        
        // Sort by amount descending
        actions.sort(Comparator.comparingDouble(DashboardSummary.PendingAction::getAmount).reversed());
        
        return actions.stream().limit(5).collect(Collectors.toList());
    }
    
    private List<BalanceAnalytics.GroupBalance> calculateGroupBalances(String userId, List<ExpenseSql> allExpenses) {
        Map<String, BalanceAnalytics.GroupBalance> groupMap = new HashMap<>();
        
        for (ExpenseSql expense : allExpenses) {
            if (expense.getGroupId() == null) continue;
            
            String groupId = expense.getGroupId();
            groupMap.computeIfAbsent(groupId, id -> {
                BalanceAnalytics.GroupBalance gb = new BalanceAnalytics.GroupBalance();
                gb.setGroupId(id);
                gb.setGroupName(expense.getGroupName());
                return gb;
            });
            
            BalanceAnalytics.GroupBalance gb = groupMap.get(groupId);
            gb.setExpenseCount(gb.getExpenseCount() + 1);
            gb.setTotalGroupSpending(gb.getTotalGroupSpending() + expense.getTotalAmount());
            gb.setYourContribution(gb.getYourContribution() + getUserPaid(userId, expense));
            gb.setYourShare(gb.getYourShare() + getUserShare(userId, expense));
        }
        
        // Finalize group balances
        List<BalanceAnalytics.GroupBalance> result = new ArrayList<>(groupMap.values());
        for (BalanceAnalytics.GroupBalance gb : result) {
            gb.setYourBalance(gb.getYourContribution() - gb.getYourShare());
            gb.setBalanceDirection(gb.getYourBalance() > 0 ? "OWED_TO_YOU" : 
                gb.getYourBalance() < 0 ? "YOU_OWE" : "SETTLED");
        }
        
        result.sort(Comparator.comparingDouble(gb -> -Math.abs(gb.getYourBalance())));
        
        return result;
    }
    
    private String getCategoryIcon(String category) {
        if (category == null) return "receipt";
        
        Map<String, String> iconMap = new HashMap<>();
        iconMap.put("food", "utensils");
        iconMap.put("dining", "utensils");
        iconMap.put("restaurant", "utensils");
        iconMap.put("groceries", "shopping-cart");
        iconMap.put("transport", "car");
        iconMap.put("transportation", "car");
        iconMap.put("travel", "plane");
        iconMap.put("entertainment", "film");
        iconMap.put("movies", "film");
        iconMap.put("shopping", "shopping-bag");
        iconMap.put("utilities", "bolt");
        iconMap.put("bills", "file-invoice");
        iconMap.put("rent", "home");
        iconMap.put("housing", "home");
        iconMap.put("healthcare", "heart");
        iconMap.put("medical", "heart");
        iconMap.put("education", "book");
        iconMap.put("fitness", "dumbbell");
        iconMap.put("gym", "dumbbell");
        iconMap.put("subscriptions", "credit-card");
        iconMap.put("gifts", "gift");
        
        String lowerCategory = category.toLowerCase();
        for (Map.Entry<String, String> entry : iconMap.entrySet()) {
            if (lowerCategory.contains(entry.getKey())) {
                return entry.getValue();
            }
        }
        
        return "receipt";
    }
}

