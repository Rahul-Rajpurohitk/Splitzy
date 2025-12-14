package com.splitzy.splitzy.service.dao;

import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Data Access Object interface for User operations.
 * This abstraction allows switching between MongoDB and PostgreSQL implementations.
 */
public interface UserDao {
    
    Optional<UserDto> findById(String id);
    
    Optional<UserDto> findByEmail(String email);
    
    Optional<UserDto> findByVerificationToken(String verificationToken);
    
    List<UserDto> findByNameRegex(String regex);
    
    List<UserDto> findByEmailRegex(String regex);
    
    List<UserDto> findFriendsByRegex(Set<String> friendIds, String regex);
    
    List<UserDto> findAllById(Iterable<String> ids);
    
    UserDto save(UserDto user);
    
    void deleteById(String id);
    
    boolean existsByEmail(String email);

    default void updateAvatar(String userId, String avatarUrl) {
        findById(userId).ifPresent(user -> {
            user.setAvatarUrl(avatarUrl);
            save(user);
        });
    }
}

