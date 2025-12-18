package com.splitzy.splitzy.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.regex.Pattern;

/**
 * Production-ready Redis-backed adaptive rate limiter.
 * 
 * Features:
 * - Per-path policies with regex matching
 * - Per-user and per-IP rate limiting
 * - Graceful degradation when Redis is unavailable
 * - Request metrics collection for monitoring
 * - Retry-After header support
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(RateLimitFilter.class);
    
    // Skip rate limiting for health checks and static resources
    private static final Set<String> SKIP_PATHS = Set.of(
        "/actuator/health", "/actuator/info", "/favicon.ico", "/static/"
    );

    private final List<Policy> policies = new ArrayList<>();
    private final StringRedisTemplate redis;
    
    // Metrics for monitoring
    private final AtomicLong totalRequests = new AtomicLong(0);
    private final AtomicLong rateLimitedRequests = new AtomicLong(0);
    private final ConcurrentHashMap<String, AtomicLong> pathMetrics = new ConcurrentHashMap<>();

    public RateLimitFilter(StringRedisTemplate redis) {
        this.redis = redis;
        initializePolicies();
    }
    
    private void initializePolicies() {
        // Auth endpoints: strict limits to prevent brute force attacks
        policies.add(new Policy(Pattern.compile("^/auth/login"), 10, Duration.ofMinutes(1), "login"));
        policies.add(new Policy(Pattern.compile("^/auth/signup"), 5, Duration.ofMinutes(5), "signup"));
        policies.add(new Policy(Pattern.compile("^/auth/verify-email"), 10, Duration.ofMinutes(5), "verify"));
        policies.add(new Policy(Pattern.compile("^/auth/forgot-password"), 5, Duration.ofMinutes(10), "forgot-pwd"));
        policies.add(new Policy(Pattern.compile("^/auth/refresh"), 20, Duration.ofMinutes(1), "refresh"));
        
        // Search endpoints: moderate limits
        policies.add(new Policy(Pattern.compile("^/search/.*"), 40, Duration.ofMinutes(1), "search"));
        
        // Core expense operations - balanced for UX
        policies.add(new Policy(Pattern.compile("^/home/expenses/user-expenses"), 60, Duration.ofMinutes(1), "expense-list"));
        policies.add(new Policy(Pattern.compile("^/expenses/create"), 30, Duration.ofMinutes(1), "expense-create"));
        policies.add(new Policy(Pattern.compile("^/expenses/settle"), 30, Duration.ofMinutes(1), "expense-settle"));
        policies.add(new Policy(Pattern.compile("^/expenses.*"), 50, Duration.ofMinutes(1), "expenses"));
        
        // Friends/groups - moderate, cacheable on frontend
        policies.add(new Policy(Pattern.compile("^/home/friends/request"), 20, Duration.ofMinutes(1), "friend-request"));
        policies.add(new Policy(Pattern.compile("^/home/friends.*"), 40, Duration.ofMinutes(1), "friends"));
        policies.add(new Policy(Pattern.compile("^/groups/create"), 10, Duration.ofMinutes(1), "group-create"));
        policies.add(new Policy(Pattern.compile("^/groups.*"), 40, Duration.ofMinutes(1), "groups"));
        
        // Chat endpoints: higher limits for real-time messaging
        policies.add(new Policy(Pattern.compile("^/chat/messages.*"), 100, Duration.ofMinutes(1), "chat-messages"));
        policies.add(new Policy(Pattern.compile("^/chat/threads.*"), 40, Duration.ofMinutes(1), "chat-threads"));
        policies.add(new Policy(Pattern.compile("^/chat/read.*"), 100, Duration.ofMinutes(1), "chat-read"));
        
        // Notifications: higher for polling
        policies.add(new Policy(Pattern.compile("^/notifications/unread-count"), 120, Duration.ofMinutes(1), "notif-count"));
        policies.add(new Policy(Pattern.compile("^/notifications.*"), 60, Duration.ofMinutes(1), "notifications"));
        
        // Profile: low frequency
        policies.add(new Policy(Pattern.compile("^/profile/update"), 10, Duration.ofMinutes(1), "profile-update"));
        policies.add(new Policy(Pattern.compile("^/profile.*"), 30, Duration.ofMinutes(1), "profile"));
        
        // Analytics: computationally expensive, encourage frontend caching
        policies.add(new Policy(Pattern.compile("^/analytics/summary.*"), 30, Duration.ofMinutes(1), "analytics-summary"));
        policies.add(new Policy(Pattern.compile("^/analytics/trends.*"), 30, Duration.ofMinutes(1), "analytics-trends"));
        policies.add(new Policy(Pattern.compile("^/analytics/balances.*"), 30, Duration.ofMinutes(1), "analytics-balances"));
        policies.add(new Policy(Pattern.compile("^/analytics.*"), 50, Duration.ofMinutes(1), "analytics"));
        
        // Default fallback (must be last)
        policies.add(new Policy(Pattern.compile(".*"), 100, Duration.ofMinutes(1), "default"));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String uri = request.getRequestURI();
        
        // Skip rate limiting for certain paths
        if (shouldSkip(uri)) {
            filterChain.doFilter(request, response);
            return;
        }
        
        totalRequests.incrementAndGet();

        String clientIp = extractClientIp(request);
        String userKey = extractUserKey(request);

        Policy policy = selectPolicy(uri);
        String bucketKey = "rl:" + policy.name + "|" + userKey + "|" + clientIp;
        
        // Track metrics
        pathMetrics.computeIfAbsent(policy.name, k -> new AtomicLong(0)).incrementAndGet();

        RateLimitResult result = checkRateLimit(bucketKey, policy);
        
        // Add rate limit headers for transparency
        response.setHeader("X-RateLimit-Limit", String.valueOf(policy.capacity));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(Math.max(0, policy.capacity - result.count)));
        response.setHeader("X-RateLimit-Reset", String.valueOf(result.resetTime));
        
        if (!result.allowed) {
            rateLimitedRequests.incrementAndGet();
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", String.valueOf(result.retryAfter));
            response.setContentType("application/json");
            response.getWriter().write(String.format(
                "{\"error\":\"Rate limit exceeded\",\"retryAfter\":%d,\"message\":\"Please wait %d seconds before retrying.\"}",
                result.retryAfter, result.retryAfter
            ));
            logger.warn("Rate limit exceeded: policy={} user={} ip={} count={}", 
                policy.name, userKey, clientIp, result.count);
            return;
        }

        filterChain.doFilter(request, response);
    }
    
    private boolean shouldSkip(String uri) {
        return SKIP_PATHS.stream().anyMatch(uri::startsWith);
    }

    private RateLimitResult checkRateLimit(String key, Policy policy) {
        try {
            Long count = redis.opsForValue().increment(key);
            if (count == null) {
                // Redis unavailable, fail open
                return new RateLimitResult(true, 0, 0, 0);
            }
            
            // Set TTL on first hit
            if (count == 1) {
                redis.expire(key, policy.window);
            }
            
            // Get TTL for reset time calculation
            Long ttl = redis.getExpire(key);
            if (ttl == null || ttl < 0) {
                redis.expire(key, policy.window);
                ttl = policy.window.getSeconds();
            }
            
            long resetTime = System.currentTimeMillis() / 1000 + ttl;
            int retryAfter = (int) Math.min(ttl, 60); // Cap at 60 seconds
            
            boolean allowed = count <= policy.capacity;
            return new RateLimitResult(allowed, count.intValue(), resetTime, retryAfter);
            
        } catch (Exception e) {
            // Redis error - fail open (allow request) but log
            logger.error("Redis rate limit error for key={}: {}", key, e.getMessage());
            return new RateLimitResult(true, 0, 0, 0);
        }
    }
    
    private record RateLimitResult(boolean allowed, int count, long resetTime, int retryAfter) {}

    private Policy selectPolicy(String uri) {
        return policies.stream()
                .filter(p -> p.pattern.matcher(uri).find())
                .findFirst()
                .orElseGet(() -> policies.get(policies.size() - 1));
    }

    private String extractClientIp(HttpServletRequest request) {
        String xfwd = request.getHeader("X-Forwarded-For");
        if (xfwd != null && !xfwd.isBlank()) {
            return xfwd.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String extractUserKey(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (auth != null && !auth.isBlank()) {
            // coarse: use the token hash to shard
            return "user:" + Integer.toHexString(auth.hashCode());
        }
        return "anon";
    }

    private record Policy(Pattern pattern, int capacity, Duration window, String name) {}
    
    /**
     * Get rate limit metrics for monitoring
     */
    public RateLimitMetrics getMetrics() {
        return new RateLimitMetrics(
            totalRequests.get(),
            rateLimitedRequests.get(),
            new ConcurrentHashMap<>(pathMetrics)
        );
    }
    
    public record RateLimitMetrics(
        long totalRequests,
        long rateLimitedRequests,
        ConcurrentHashMap<String, AtomicLong> pathMetrics
    ) {}
}

