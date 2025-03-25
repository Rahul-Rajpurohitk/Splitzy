package com.splitzy.splitzy.repository;

import com.splitzy.splitzy.model.Notification;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends MongoRepository<Notification, String> {

    // Fetch all unread notifications for a user
    List<Notification> findByUserIdAndReadFalse(String userId);

    // Or, fetch all notifications for a user (read or unread)
    List<Notification> findByUserId(String userId);

    // find notifications by friendRequestId
    List<Notification> findByReferenceId(String referenceId);
}
