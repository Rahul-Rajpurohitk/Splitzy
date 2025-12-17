package com.splitzy.splitzy.service;

import com.splitzy.splitzy.model.Notification;
import com.splitzy.splitzy.service.dao.NotificationDao;
import com.splitzy.splitzy.service.dao.NotificationDto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class NotificationService {

    @Autowired
    private NotificationDao notificationDao;

    // Create a new notification for a user
    public Notification createNotification(String userId, String message,
                                           String referenceId, String senderName, String senderId, String type) {
        NotificationDto notifDto = new NotificationDto();
        notifDto.setUserId(userId);
        notifDto.setMessage(message);
        notifDto.setReferenceId(referenceId);
        notifDto.setSenderName(senderName);
        notifDto.setSenderId(senderId);
        notifDto.setRead(false);
        notifDto.setCreatedAt(LocalDateTime.now());
        notifDto.setType(type); // set the type (e.g., "EXPENSE", "FriendRequest")

        NotificationDto savedDto = notificationDao.save(notifDto);
        return toNotification(savedDto);
    }

    // Retrieve all unread notifications
    public List<Notification> getUnreadNotifications(String userId) {
        return notificationDao.findByUserIdAndReadFalse(userId).stream()
                .map(this::toNotification)
                .collect(Collectors.toList());
    }

    // Mark all notifications for this friendRequest as read
    public void markAsReadByFriendRequestId(String referenceId) {
        // Find all notifications that reference this friend request
        List<NotificationDto> notifications = notificationDao.findByReferenceId(referenceId);
        for (NotificationDto notif : notifications) {
            if (!notif.isRead()) {
                notif.setRead(true);
                notificationDao.save(notif);
            }
        }
    }

    // (Optional) Remove all notifications for this friendRequest from DB
    public void deleteByFriendRequestId(String referenceId) {
        List<NotificationDto> notifications = notificationDao.findByReferenceId(referenceId);
        notificationDao.deleteAll(notifications);
    }

    public void markNotificationRead(String notificationId) {
        Optional<NotificationDto> optNotif = notificationDao.findById(notificationId);
        if (optNotif.isPresent()) {
            NotificationDto notif = optNotif.get();
            if (!notif.isRead()) {
                notif.setRead(true);
                notificationDao.save(notif);
            }
        }
    }

    // --- Conversion helpers ---

    private Notification toNotification(NotificationDto dto) {
        Notification n = new Notification();
        n.setId(dto.getId());
        n.setUserId(dto.getUserId());
        n.setMessage(dto.getMessage());
        n.setType(dto.getType());
        n.setRead(dto.isRead());
        n.setCreatedAt(dto.getCreatedAt());
        n.setReferenceId(dto.getReferenceId());
        n.setSenderName(dto.getSenderName());
        n.setSenderId(dto.getSenderId());
        return n;
    }
}
