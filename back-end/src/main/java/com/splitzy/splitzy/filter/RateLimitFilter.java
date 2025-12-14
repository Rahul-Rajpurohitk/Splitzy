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
import java.util.regex.Pattern;

/**
 * Redis-backed adaptive rate limiter.
 * Per-path policies (regex match) with independent limits/windows.
 * Keyed by client IP, and if Authorization is present, by user+IP.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(RateLimitFilter.class);

    private final List<Policy> policies = new ArrayList<>();
    private final StringRedisTemplate redis;

    public RateLimitFilter(StringRedisTemplate redis) {
        this.redis = redis;
        // Auth endpoints: tighter limits to prevent brute force
        policies.add(new Policy(Pattern.compile("^/auth/login"), 10, Duration.ofMinutes(1)));
        policies.add(new Policy(Pattern.compile("^/auth/signup"), 5, Duration.ofMinutes(5)));
        policies.add(new Policy(Pattern.compile("^/auth/verify-email"), 10, Duration.ofMinutes(5)));
        policies.add(new Policy(Pattern.compile("^/auth/forgot-password"), 5, Duration.ofMinutes(10)));
        // Search endpoints: moderate
        policies.add(new Policy(Pattern.compile("^/search/.*"), 30, Duration.ofMinutes(1)));
        // Expense actions
        policies.add(new Policy(Pattern.compile("^/expenses.*"), 30, Duration.ofMinutes(1)));
        // Friends/groups actions
        policies.add(new Policy(Pattern.compile("^/home/friends.*"), 30, Duration.ofMinutes(1)));
        policies.add(new Policy(Pattern.compile("^/groups.*"), 30, Duration.ofMinutes(1)));
        // Chat endpoints: allow more for real-time messaging
        policies.add(new Policy(Pattern.compile("^/chat/messages.*"), 60, Duration.ofMinutes(1)));
        policies.add(new Policy(Pattern.compile("^/chat/threads.*"), 30, Duration.ofMinutes(1)));
        policies.add(new Policy(Pattern.compile("^/chat/read.*"), 60, Duration.ofMinutes(1)));
        // Notifications
        policies.add(new Policy(Pattern.compile("^/notifications.*"), 40, Duration.ofMinutes(1)));
        // Profile
        policies.add(new Policy(Pattern.compile("^/profile.*"), 20, Duration.ofMinutes(1)));
        // Analytics endpoints: moderate limits (computationally expensive)
        policies.add(new Policy(Pattern.compile("^/analytics/summary.*"), 20, Duration.ofMinutes(1)));
        policies.add(new Policy(Pattern.compile("^/analytics/trends.*"), 30, Duration.ofMinutes(1)));
        policies.add(new Policy(Pattern.compile("^/analytics/categories.*"), 30, Duration.ofMinutes(1)));
        policies.add(new Policy(Pattern.compile("^/analytics/balances.*"), 20, Duration.ofMinutes(1)));
        policies.add(new Policy(Pattern.compile("^/analytics/friends.*"), 30, Duration.ofMinutes(1)));
        policies.add(new Policy(Pattern.compile("^/analytics/groups.*"), 30, Duration.ofMinutes(1)));
        policies.add(new Policy(Pattern.compile("^/analytics.*"), 40, Duration.ofMinutes(1)));
        // Default fallback (must be last)
        policies.add(new Policy(Pattern.compile(".*"), 60, Duration.ofMinutes(1)));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String clientIp = extractClientIp(request);
        String userKey = extractUserKey(request);

        Policy policy = selectPolicy(request.getRequestURI());
        String bucketKey = policy.pattern.pattern() + "|" + userKey + "|" + clientIp;

        if (!allowRequest(bucketKey, policy)) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.getWriter().write("Rate limit exceeded. Please try again later.");
            logger.warn("Rate limit exceeded for key={} path={}", bucketKey, request.getRequestURI());
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean allowRequest(String key, Policy policy) {
        try {
            Long count = redis.opsForValue().increment(key);
            if (count == null) {
                // Redis unavailable, allow request
                return true;
            }
            // Set TTL on first hit
            if (count == 1) {
                redis.expire(key, policy.window);
            }
            // Defensive: ensure TTL exists (race condition protection)
            Long ttl = redis.getExpire(key);
            if (ttl != null && ttl < 0) {
                redis.expire(key, policy.window);
            }
            return count <= policy.capacity;
        } catch (Exception e) {
            // Redis error - fail open (allow request)
            logger.error("Redis rate limit error for key={}: {}", key, e.getMessage());
            return true;
        }
    }

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

    private record Policy(Pattern pattern, int capacity, Duration window) {}
}

