package com.splitzy.splitzy.service;

import com.splitzy.splitzy.model.RedisUser;
import com.splitzy.splitzy.model.User;
import com.splitzy.splitzy.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private static final Logger logger = LoggerFactory.getLogger(CustomUserDetailsService.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private RedisCacheService redisCacheService;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> {
                    logger.error("User not found for email: {}", username);
                    return new UsernameNotFoundException("User not found");
                });

        logger.info("User loaded successfully for email: {}", username);
        logger.info("Password from database for user {}: {}", username, user.getPassword());
        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPassword(),
                Collections.emptyList() // Add authorities if needed
        );
    }

    public boolean userExists(String email) {
        logger.info("Checking if user exists with email: {}", email);
        // Check permanent database
        boolean existsInDatabase = userRepository.findByEmail(email).isPresent();
        if (existsInDatabase) {
            logger.info("User with email: {} already exists in the database", email);
            return true;
        }

        // Check Redis cache for temporary users
        for (String key : redisCacheService.getAllKeys()) {
            RedisUser redisUser = (RedisUser) redisCacheService.get(key);
            if (redisUser != null && redisUser.getEmail().equals(email)) {
                logger.info("User with email: {} exists in Redis cache", email);
                return true;
            }
        }

        logger.info("No user found with email: {}", email);
        return false;
    }

    public User findByVerificationToken(String token) {
        return userRepository.findByVerificationToken(token)
                .orElse(null); // Return null if no user is found
    }


    public User save(User user) {
        logger.info("Saving user with email: {}", user.getEmail());
        try {
            // Hash the password only if it is not already hashed
            if (!user.getPassword().startsWith("$2a$")) { // BCrypt hashes start with "$2a$"
                user.setPassword(passwordEncoder.encode(user.getPassword()));
            }
            User savedUser = userRepository.save(user);
            logger.info("User saved successfully with email: {}", savedUser.getEmail());
            return savedUser;
        } catch (Exception e) {
            logger.error("Error saving user with email: {}", user.getEmail(), e);
            throw e;
        }
    }
}
