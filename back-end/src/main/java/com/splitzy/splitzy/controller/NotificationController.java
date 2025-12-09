package com.splitzy.splitzy.controller;

import com.splitzy.splitzy.model.Notification;
import com.splitzy.splitzy.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    // GET /notifications?userId=123 => returns unread notifications
    @GetMapping
    public List<Notification> getUnread(@RequestParam String userId) {
        return notificationService.getUnreadNotifications(userId);
    }

    // PATCH /notifications/{notifId}/read => mark as read
    @PatchMapping("/{friendRequestId}/read")
    public void markAsRead(@PathVariable String friendRequestId) {
        notificationService.markAsReadByFriendRequestId(friendRequestId);
    }

    @PatchMapping("/{notificationId}/read")
    public void markNotificationRead(@PathVariable String notificationId) {
        notificationService.markNotificationRead(notificationId);
    }

}
