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
}

