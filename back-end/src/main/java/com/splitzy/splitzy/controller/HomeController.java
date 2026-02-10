package com.splitzy.splitzy.controller;

import com.splitzy.splitzy.dto.FriendDTO;
import com.splitzy.splitzy.model.FriendRequest;
import com.splitzy.splitzy.service.FriendService;
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

@RestController
@RequestMapping("/home") // All endpoints start with /home
public class HomeController {

    private static final Logger logger = LoggerFactory.getLogger(HomeController.class);

    @Autowired
    private FriendService friendService;

    @Autowired
    private UserDao userDao;

    @GetMapping
    public ResponseEntity<String> homeData() {
        // If we reach here, user has a valid JWT (i.e., is authenticated).
        // Return a 200 OK with the body "Authorized".
        return ResponseEntity.ok("Authorized");
    }

    @GetMapping("/friends")
    public List<FriendDTO> getFriendIds(Authentication auth, @RequestParam String userId) {
        assertOwnership(auth, userId);
        return friendService.getFriendDetails(userId);
    }

    @PostMapping("/friends/request")
    public FriendRequest sendFriendRequest(Authentication auth, @RequestParam String senderId, @RequestParam String receiverId) {
        assertOwnership(auth, senderId);
        return friendService.sendFriendRequest(senderId, receiverId);
    }

    @PatchMapping("/friends/unfriend")
    public void unfriend(Authentication auth, @RequestParam String userId1, @RequestParam String userId2) {
        assertOwnership(auth, userId1);
        friendService.unfriend(userId1, userId2);
    }

    @PatchMapping("/friends/request/{requestId}/accept")
    public void acceptFriendRequest(Authentication auth, @PathVariable String requestId, @RequestParam String receiverId) {
        assertOwnership(auth, receiverId);
        friendService.acceptFriendRequest(requestId, receiverId);
    }

    @PatchMapping("/friends/request/{requestId}/reject")
    public void rejectFriendRequest(Authentication auth, @PathVariable String requestId, @RequestParam String receiverId) {
        assertOwnership(auth, receiverId);
        friendService.rejectFriendRequest(requestId, receiverId);
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
