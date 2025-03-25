package com.splitzy.splitzy.config;


import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.GenericToStringSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
public class RedisCacheConfig {
    private static final Logger logger = LoggerFactory.getLogger(RedisCacheConfig.class);

    @Value("${spring.redis.host}")
    private String redisHost;

    @Value("${spring.redis.port}")
    private int redisPort;

    @Bean
    public RedisConnectionFactory redisConnectionFactory() {
        logger.info("Creating RedisConnectionFactory...");
        LettuceConnectionFactory connectionFactory = new LettuceConnectionFactory(redisHost, redisPort);
        logger.info("Redis host: {}, Redis port: {}", connectionFactory.getHostName(), connectionFactory.getPort());
        return connectionFactory;
    }

    @Bean
    public RedisTemplate<String, Object> redisCacheTemplate() {
        logger.info("Creating RedisTemplate...");
        RedisTemplate<String, Object> redisCacheTemplate = new RedisTemplate<>();
        redisCacheTemplate.setConnectionFactory(redisConnectionFactory());
        redisCacheTemplate.setKeySerializer(new StringRedisSerializer());
        redisCacheTemplate.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        return redisCacheTemplate;
    }
}

