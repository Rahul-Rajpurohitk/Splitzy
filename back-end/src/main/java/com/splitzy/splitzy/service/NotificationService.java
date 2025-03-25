package com.splitzy.splitzy.service;

import com.splitzy.splitzy.model.Notification;
import com.splitzy.splitzy.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    // Create a new notification for a user
    public Notification createNotification(String userId, String message,
                                           String referenceId, String senderName, String senderId, String type) {
        Notification notif = new Notification();
        notif.setUserId(userId);
        notif.setMessage(message);
        notif.setReferenceId(referenceId);
        notif.setSenderName(senderName);
        notif.setSenderId(senderId);
        notif.setRead(false);
        notif.setCreatedAt(LocalDateTime.now());
        notif.setType(type); // set the type (e.g., "EXPENSE", "FriendRequest")

        return notificationRepository.save(notif);
    }

    // Retrieve all unread notifications
    public List<Notification> getUnreadNotifications(String userId) {
        return notificationRepository.findByUserIdAndReadFalse(userId);
    }

    // Mark all notifications for this friendRequest as read
    public void markAsReadByFriendRequestId(String referenceId) {
        // Find all notifications that reference this friend request
        List<Notification> notifications = notificationRepository.findByReferenceId(referenceId);
        for (Notification notif : notifications) {
            if (!notif.isRead()) {
                notif.setRead(true);
                notificationRepository.save(notif);
            }
        }
    }

    // (Optional) Remove all notifications for this friendRequest from DB
    public void deleteByFriendRequestId(String referenceId) {
        List<Notification> notifications = notificationRepository.findByReferenceId(referenceId);
        for (Notification notif : notifications) {
            notificationRepository.delete(notif);
        }
    }
}

