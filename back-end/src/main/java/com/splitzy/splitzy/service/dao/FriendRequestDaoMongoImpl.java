package com.splitzy.splitzy.service.dao;

import com.splitzy.splitzy.model.FriendRequest;
import com.splitzy.splitzy.repository.FriendRequestRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * MongoDB implementation of FriendRequestDao.
 */
@Repository
@Profile("!postgres")
public class FriendRequestDaoMongoImpl implements FriendRequestDao {

    private final FriendRequestRepository friendRequestRepository;

    public FriendRequestDaoMongoImpl(FriendRequestRepository friendRequestRepository) {
        this.friendRequestRepository = friendRequestRepository;
    }

    @Override
    public Optional<FriendRequestDto> findById(String id) {
        return friendRequestRepository.findById(id).map(this::toDto);
    }

    @Override
    public List<FriendRequestDto> findBySenderId(String senderId) {
        return friendRequestRepository.findBySenderId(senderId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<FriendRequestDto> findByReceiverId(String receiverId) {
        return friendRequestRepository.findByReceiverId(receiverId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public FriendRequestDto findBySenderIdAndReceiverId(String senderId, String receiverId) {
        FriendRequest request = friendRequestRepository.findBySenderIdAndReceiverId(senderId, receiverId);
        return request != null ? toDto(request) : null;
    }

    @Override
    public FriendRequestDto save(FriendRequestDto friendRequestDto) {
        FriendRequest friendRequest = toEntity(friendRequestDto);
        FriendRequest saved = friendRequestRepository.save(friendRequest);
        return toDto(saved);
    }

    @Override
    public void deleteById(String id) {
        friendRequestRepository.deleteById(id);
    }

    // Mapping methods
    private FriendRequestDto toDto(FriendRequest friendRequest) {
        FriendRequestDto dto = new FriendRequestDto();
        dto.setId(friendRequest.getId());
        dto.setSenderId(friendRequest.getSenderId());
        dto.setReceiverId(friendRequest.getReceiverId());
        dto.setStatus(friendRequest.getStatus());
        dto.setCreatedAt(friendRequest.getCreatedAt());
        dto.setUpdatedAt(friendRequest.getUpdatedAt());
        return dto;
    }

    private FriendRequest toEntity(FriendRequestDto dto) {
        FriendRequest friendRequest = new FriendRequest();
        friendRequest.setId(dto.getId());
        friendRequest.setSenderId(dto.getSenderId());
        friendRequest.setReceiverId(dto.getReceiverId());
        friendRequest.setStatus(dto.getStatus());
        friendRequest.setCreatedAt(dto.getCreatedAt());
        friendRequest.setUpdatedAt(dto.getUpdatedAt());
        return friendRequest;
    }
}

