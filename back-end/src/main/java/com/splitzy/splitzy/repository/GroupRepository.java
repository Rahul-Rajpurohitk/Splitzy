package com.splitzy.splitzy.repository;

import com.splitzy.splitzy.model.Group;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GroupRepository extends MongoRepository<Group, String> {
    // Additional custom query methods (if needed) can be added here.

    @Query("{ '$or': [ { 'creatorId': ?0 }, { 'friends.id': ?0 } ] }")
    List<Group> findByCreatorIdOrFriendsId(String userId);
}
