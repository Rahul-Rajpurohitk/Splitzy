package com.splitzy.splitzy.service.dao;

import java.util.List;
import java.util.Optional;

/**
 * Data Access Object interface for FriendRequest operations.
 */
public interface FriendRequestDao {
    
    Optional<FriendRequestDto> findById(String id);
    
    List<FriendRequestDto> findBySenderId(String senderId);
    
    List<FriendRequestDto> findByReceiverId(String receiverId);
    
    FriendRequestDto findBySenderIdAndReceiverId(String senderId, String receiverId);
    
    FriendRequestDto save(FriendRequestDto friendRequest);
    
    void deleteById(String id);
}

