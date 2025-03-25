package com.splitzy.splitzy.repository;

import com.splitzy.splitzy.model.FriendRequest;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FriendRequestRepository extends MongoRepository<FriendRequest, String> {

    List<FriendRequest> findBySenderId(String senderId);
    List<FriendRequest> findByReceiverId(String receiverId);

    //unique request for a pair of users:
    FriendRequest findBySenderIdAndReceiverId(String senderId, String receiverId);
}
