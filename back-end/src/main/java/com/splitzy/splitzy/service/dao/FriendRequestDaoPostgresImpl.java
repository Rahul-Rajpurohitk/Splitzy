package com.splitzy.splitzy.service.dao;

import com.splitzy.splitzy.entity.FriendRequestSql;
import com.splitzy.splitzy.repository.sql.FriendRequestSqlRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * PostgreSQL implementation of FriendRequestDao.
 */
@Repository
@Profile("postgres")
public class FriendRequestDaoPostgresImpl implements FriendRequestDao {

    private final FriendRequestSqlRepository friendRequestSqlRepository;

    public FriendRequestDaoPostgresImpl(FriendRequestSqlRepository friendRequestSqlRepository) {
        this.friendRequestSqlRepository = friendRequestSqlRepository;
    }

    @Override
    public Optional<FriendRequestDto> findById(String id) {
        return friendRequestSqlRepository.findById(id).map(this::toDto);
    }

    @Override
    public List<FriendRequestDto> findBySenderId(String senderId) {
        return friendRequestSqlRepository.findBySenderId(senderId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<FriendRequestDto> findByReceiverId(String receiverId) {
        return friendRequestSqlRepository.findByReceiverId(receiverId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public FriendRequestDto findBySenderIdAndReceiverId(String senderId, String receiverId) {
        FriendRequestSql request = friendRequestSqlRepository.findBySenderIdAndReceiverId(senderId, receiverId);
        return request != null ? toDto(request) : null;
    }

    @Override
    public FriendRequestDto save(FriendRequestDto friendRequestDto) {
        FriendRequestSql friendRequest = toEntity(friendRequestDto);
        FriendRequestSql saved = friendRequestSqlRepository.save(friendRequest);
        return toDto(saved);
    }

    @Override
    public void deleteById(String id) {
        friendRequestSqlRepository.deleteById(id);
    }

    // Mapping methods
    private FriendRequestDto toDto(FriendRequestSql friendRequest) {
        FriendRequestDto dto = new FriendRequestDto();
        dto.setId(friendRequest.getId());
        dto.setSenderId(friendRequest.getSenderId());
        dto.setReceiverId(friendRequest.getReceiverId());
        dto.setStatus(friendRequest.getStatus());
        dto.setCreatedAt(friendRequest.getCreatedAt());
        dto.setUpdatedAt(friendRequest.getUpdatedAt());
        return dto;
    }

    private FriendRequestSql toEntity(FriendRequestDto dto) {
        FriendRequestSql friendRequest = new FriendRequestSql();
        friendRequest.setId(dto.getId());
        friendRequest.setSenderId(dto.getSenderId());
        friendRequest.setReceiverId(dto.getReceiverId());
        friendRequest.setStatus(dto.getStatus());
        friendRequest.setCreatedAt(dto.getCreatedAt());
        friendRequest.setUpdatedAt(dto.getUpdatedAt());
        return friendRequest;
    }
}

