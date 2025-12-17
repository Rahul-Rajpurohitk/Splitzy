package com.splitzy.splitzy.service.dao;

import com.splitzy.splitzy.entity.UserSql;
import com.splitzy.splitzy.repository.sql.UserSqlRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

/**
 * PostgreSQL implementation of UserDao.
 */
@Repository
@Profile("postgres")
public class UserDaoPostgresImpl implements UserDao {

    private final UserSqlRepository userSqlRepository;

    public UserDaoPostgresImpl(UserSqlRepository userSqlRepository) {
        this.userSqlRepository = userSqlRepository;
    }

    @Override
    public Optional<UserDto> findById(String id) {
        return userSqlRepository.findById(id).map(this::toDto);
    }

    @Override
    public Optional<UserDto> findByEmail(String email) {
        return userSqlRepository.findByEmail(email).map(this::toDto);
    }

    @Override
    public Optional<UserDto> findByVerificationToken(String verificationToken) {
        // PostgreSQL doesn't have a direct query for this - use stream filter
        return userSqlRepository.findAll().stream()
                .filter(u -> verificationToken != null && verificationToken.equals(u.getVerificationToken()))
                .findFirst()
                .map(this::toDto);
    }

    @Override
    public List<UserDto> findByNameRegex(String regex) {
        // For PostgreSQL, extract the search term from regex like "(?i).*rah.*"
        String pattern = extractSearchTerm(regex);
        return userSqlRepository.findAll().stream()
                .filter(u -> u.getName() != null && u.getName().toLowerCase().contains(pattern))
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<UserDto> findByEmailRegex(String regex) {
        String pattern = extractSearchTerm(regex);
        return userSqlRepository.findAll().stream()
                .filter(u -> u.getEmail() != null && u.getEmail().toLowerCase().contains(pattern))
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<UserDto> findFriendsByRegex(Set<String> friendIds, String regex) {
        String pattern = extractSearchTerm(regex);
        return userSqlRepository.findAllById(friendIds).stream()
                .filter(u -> (u.getName() != null && u.getName().toLowerCase().contains(pattern)) ||
                             (u.getEmail() != null && u.getEmail().toLowerCase().contains(pattern)))
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Extract the actual search term from a regex pattern like "(?i).*searchterm.*"
     */
    private String extractSearchTerm(String regex) {
        // Remove common regex patterns to get the core search term
        return regex
                .replace("(?i)", "")  // Remove case-insensitive flag
                .replace(".*", "")    // Remove wildcards
                .toLowerCase()
                .trim();
    }

    @Override
    public List<UserDto> findAllById(Iterable<String> ids) {
        return StreamSupport.stream(userSqlRepository.findAllById(ids).spliterator(), false)
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public UserDto save(UserDto userDto) {
        UserSql user = toEntity(userDto);
        UserSql saved = userSqlRepository.save(user);
        return toDto(saved);
    }

    @Override
    public void deleteById(String id) {
        userSqlRepository.deleteById(id);
    }

    @Override
    public boolean existsByEmail(String email) {
        return userSqlRepository.existsByEmail(email);
    }

    // Mapping methods
    private UserDto toDto(UserSql user) {
        return new UserDto(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPassword(),
                user.getVerificationToken(),
                user.isVerified(),
                user.getAvatarUrl(),
                user.getFriendIds(),
                user.getGroupIds()
        );
    }

    private UserSql toEntity(UserDto dto) {
        UserSql user = new UserSql();
        user.setId(dto.getId());
        user.setName(dto.getName());
        user.setEmail(dto.getEmail());
        user.setPassword(dto.getPassword());
        user.setVerificationToken(dto.getVerificationToken());
        user.setVerified(dto.isVerified());
        user.setAvatarUrl(dto.getAvatarUrl());
        user.setFriendIds(dto.getFriendIds());
        user.setGroupIds(dto.getGroupIds());
        return user;
    }
}

