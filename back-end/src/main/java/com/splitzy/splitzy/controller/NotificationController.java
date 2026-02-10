package com.splitzy.splitzy.controller;

import com.splitzy.splitzy.model.Notification;
import com.splitzy.splitzy.service.NotificationService;
import com.splitzy.splitzy.service.dao.UserDao;
import com.splitzy.splitzy.service.dao.UserDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/notifications")
public class NotificationController {

    private static final Logger logger = LoggerFactory.getLogger(NotificationController.class);

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private UserDao userDao;

    // GET /notifications?userId=123 => returns unread notifications
    @GetMapping
    public List<Notification> getUnread(Authentication auth, @RequestParam String userId) {
        assertOwnership(auth, userId);
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

    private String getAuthenticatedUserId(Authentication auth) {
        if (auth == null || auth.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        String email = auth.getName();
        UserDto user = userDao.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        return user.getId();
    }

    private void assertOwnership(Authentication auth, String userId) {
        String authenticatedUserId = getAuthenticatedUserId(auth);
        if (!authenticatedUserId.equals(userId)) {
            logger.warn("IDOR attempt: authenticated user {} tried to access data for user {}", authenticatedUserId, userId);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
    }
}
