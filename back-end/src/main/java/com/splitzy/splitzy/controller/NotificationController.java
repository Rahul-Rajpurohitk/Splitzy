package com.splitzy.splitzy.controller;

import com.splitzy.splitzy.model.Notification;
import com.splitzy.splitzy.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

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

    // PATCH /notifications/{notificationId}/read => mark single notification as read
    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<?> markNotificationRead(@PathVariable String notificationId) {
        notificationService.markNotificationRead(notificationId);
        return ResponseEntity.ok(Map.of("success", true));
    }

    // POST /notifications/mark-read-bulk => mark multiple notifications as read
    @PostMapping("/mark-read-bulk")
    public ResponseEntity<?> markBulkRead(@RequestBody List<String> notificationIds) {
        for (String id : notificationIds) {
            notificationService.markNotificationRead(id);
        }
        return ResponseEntity.ok(Map.of("success", true, "count", notificationIds.size()));
    }

    // PATCH /notifications/reference/{referenceId}/read => mark by reference (e.g., friend request ID)
    @PatchMapping("/reference/{referenceId}/read")
    public ResponseEntity<?> markAsReadByReference(@PathVariable String referenceId) {
        notificationService.markAsReadByFriendRequestId(referenceId);
        return ResponseEntity.ok(Map.of("success", true));
    }
}
