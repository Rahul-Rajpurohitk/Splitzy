package com.splitzy.splitzy.service;

import com.splitzy.splitzy.controller.AuthController;
import com.splitzy.splitzy.model.RedisUser;
import org.apache.commons.logging.Log;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.concurrent.TimeUnit;

@Service
public class RedisCacheService {

    private static final Logger logger = LoggerFactory.getLogger(RedisCacheService.class);

    @Autowired
    private RedisTemplate<String, Object> redisCacheTemplate;

    /**
     * Save an object in Redis with a key and expiration time.
     */
    public void save(String key, Object value, long expirationInSeconds) {
        try {
            logger.info("Saving object in Redis. Key: {}, Value: {}", key, value);
            redisCacheTemplate.opsForValue().set(key, value, expirationInSeconds, TimeUnit.SECONDS);
            logger.info("Object saved successfully in Redis. Key: {}", key);
        } catch (Exception e) {
            logger.error("Failed to save object in Redis. Key: {}, Value: {}, Error: {}", key, value, e.getMessage());
            throw e;
        }
    }

    /**
     * Retrieve an object from Redis by key.
     */
    public Object get(String key) {
        try {
            Object value = redisCacheTemplate.opsForValue().get(key);
            logger.info("Retrieved object from Redis. Key: {}, Value: {}", key, value);
            return value;
        } catch (Exception e) {
            logger.error("Failed to retrieve object from Redis. Key: {}, Error: {}", key, e.getMessage());
            throw e;
        }
    }

    /**
     * Delete an object from Redis by key.
     */
    public void delete(String key) {
        try {
            logger.info("Deleting object from Redis. Key: {}", key);
            redisCacheTemplate.delete(key);
            logger.info("Object deleted successfully from Redis. Key: {}", key);
        } catch (Exception e) {
            logger.error("Failed to delete object from Redis. Key: {}, Error: {}", key, e.getMessage());
            throw e;
        }
    }

    /**
     * Get all keys stored in Redis.
     */
    public Set<String> getAllKeys() {
        try {
            Set<String> keys = redisCacheTemplate.keys("*");
            logger.info("Retrieved all keys from Redis. Keys: {}", keys);
            return keys;
        } catch (Exception e) {
            logger.error("Failed to retrieve keys from Redis. Error: {}", e.getMessage());
            throw e;
        }
    }

    /**
     * Retrieve a RedisUser object from Redis by key.
     */
    public RedisUser getRedisUser(String key) {
        try {
            RedisUser redisUser = (RedisUser) redisCacheTemplate.opsForValue().get(key);
            logger.info("Retrieved RedisUser object from Redis. Key: {}, RedisUser: {}", key, redisUser);
            return redisUser;
        } catch (Exception e) {
            logger.error("Failed to retrieve RedisUser object from Redis. Key: {}, Error: {}", key, e.getMessage());
            throw e;
        }
    }

    // ===========================================
    // ANALYTICS CACHING METHODS
    // ===========================================

    private static final String ANALYTICS_PREFIX = "analytics:";
    private static final long ANALYTICS_DEFAULT_TTL = 300; // 5 minutes

    /**
     * Cache analytics result.
     */
    public void cacheAnalytics(String userId, String analyticsType, Object data) {
        cacheAnalytics(userId, analyticsType, null, data, ANALYTICS_DEFAULT_TTL);
    }

    /**
     * Cache analytics result with custom TTL.
     */
    public void cacheAnalytics(String userId, String analyticsType, String filterKey, Object data, long ttlSeconds) {
        String key = buildAnalyticsKey(userId, analyticsType, filterKey);
        try {
            redisCacheTemplate.opsForValue().set(key, data, ttlSeconds, TimeUnit.SECONDS);
            logger.debug("Cached analytics data. Key: {}", key);
        } catch (Exception e) {
            logger.warn("Failed to cache analytics. Key: {}, Error: {}", key, e.getMessage());
            // Don't throw - caching failure shouldn't break the request
        }
    }

    /**
     * Get cached analytics result.
     */
    public Object getCachedAnalytics(String userId, String analyticsType, String filterKey) {
        String key = buildAnalyticsKey(userId, analyticsType, filterKey);
        try {
            Object cached = redisCacheTemplate.opsForValue().get(key);
            if (cached != null) {
                logger.debug("Cache hit for analytics. Key: {}", key);
            }
            return cached;
        } catch (Exception e) {
            logger.warn("Failed to get cached analytics. Key: {}, Error: {}", key, e.getMessage());
            return null; // Return null on error, let caller compute fresh data
        }
    }

    /**
     * Invalidate analytics cache for a user.
     */
    public void invalidateAnalyticsCache(String userId) {
        String pattern = ANALYTICS_PREFIX + userId + ":*";
        try {
            Set<String> keys = redisCacheTemplate.keys(pattern);
            if (keys != null && !keys.isEmpty()) {
                redisCacheTemplate.delete(keys);
                logger.info("Invalidated {} analytics cache entries for user {}", keys.size(), userId);
            }
        } catch (Exception e) {
            logger.warn("Failed to invalidate analytics cache for user {}: {}", userId, e.getMessage());
        }
    }

    /**
     * Invalidate specific analytics type cache for a user.
     */
    public void invalidateAnalyticsCache(String userId, String analyticsType) {
        String pattern = ANALYTICS_PREFIX + userId + ":" + analyticsType + ":*";
        try {
            Set<String> keys = redisCacheTemplate.keys(pattern);
            if (keys != null && !keys.isEmpty()) {
                redisCacheTemplate.delete(keys);
                logger.info("Invalidated {} analytics cache entries for user {} type {}", keys.size(), userId, analyticsType);
            }
        } catch (Exception e) {
            logger.warn("Failed to invalidate analytics cache for user {} type {}: {}", userId, analyticsType, e.getMessage());
        }
    }

    /**
     * Build a cache key for analytics.
     */
    private String buildAnalyticsKey(String userId, String analyticsType, String filterKey) {
        if (filterKey != null && !filterKey.isEmpty()) {
            return ANALYTICS_PREFIX + userId + ":" + analyticsType + ":" + filterKey;
        }
        return ANALYTICS_PREFIX + userId + ":" + analyticsType;
    }

    /**
     * Check if analytics cache exists.
     */
    public boolean hasAnalyticsCache(String userId, String analyticsType, String filterKey) {
        String key = buildAnalyticsKey(userId, analyticsType, filterKey);
        try {
            return Boolean.TRUE.equals(redisCacheTemplate.hasKey(key));
        } catch (Exception e) {
            return false;
        }
    }
}

