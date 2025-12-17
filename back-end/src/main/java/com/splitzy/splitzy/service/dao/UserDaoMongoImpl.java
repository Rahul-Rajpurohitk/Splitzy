package com.splitzy.splitzy.service.dao;

import com.splitzy.splitzy.model.User;
import com.splitzy.splitzy.repository.UserRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

/**
 * MongoDB implementation of UserDao.
 */
@Repository
@Profile("!postgres")
public class UserDaoMongoImpl implements UserDao {

    private final UserRepository userRepository;

    public UserDaoMongoImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public Optional<UserDto> findById(String id) {
        return userRepository.findById(id).map(this::toDto);
    }

    @Override
    public Optional<UserDto> findByEmail(String email) {
        return userRepository.findByEmail(email).map(this::toDto);
    }

    @Override
    public Optional<UserDto> findByVerificationToken(String verificationToken) {
        return userRepository.findByVerificationToken(verificationToken).map(this::toDto);
    }

    @Override
    public List<UserDto> findByNameRegex(String regex) {
        return userRepository.findByNameRegex(regex).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<UserDto> findByEmailRegex(String regex) {
        return userRepository.findByEmailRegex(regex).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<UserDto> findFriendsByRegex(Set<String> friendIds, String regex) {
        return userRepository.findFriendsByRegex(friendIds, regex).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<UserDto> findAllById(Iterable<String> ids) {
        return StreamSupport.stream(userRepository.findAllById(ids).spliterator(), false)
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public UserDto save(UserDto userDto) {
        User user = toEntity(userDto);
        User saved = userRepository.save(user);
        return toDto(saved);
    }

    @Override
    public void deleteById(String id) {
        userRepository.deleteById(id);
    }

    @Override
    public boolean existsByEmail(String email) {
        return userRepository.findByEmail(email).isPresent();
    }

    // Mapping methods
    private UserDto toDto(User user) {
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

    private User toEntity(UserDto dto) {
        User user = new User();
        user.setId(dto.getId());
        user.setName(dto.getName());
        user.setEmail(dto.getEmail());
        user.setPassword(dto.getPassword());
        user.setVerificationToken(dto.getVerificationToken());
        user.setVerified(dto.isVerified());
        user.setFriendIds(dto.getFriendIds());
        user.setGroupIds(dto.getGroupIds());
        return user;
    }
}

