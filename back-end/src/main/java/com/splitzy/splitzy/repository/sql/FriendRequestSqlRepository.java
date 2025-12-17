package com.splitzy.splitzy.repository.sql;

import com.splitzy.splitzy.entity.FriendRequestSql;
import org.springframework.context.annotation.Profile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

@Profile("postgres")
public interface FriendRequestSqlRepository extends JpaRepository<FriendRequestSql, String> {

    List<FriendRequestSql> findBySenderId(String senderId);

    List<FriendRequestSql> findByReceiverId(String receiverId);

    /**
     * Find unique request for a pair of users
     */
    FriendRequestSql findBySenderIdAndReceiverId(String senderId, String receiverId);
}

