package com.splitzy.splitzy.controller;

import com.splitzy.splitzy.model.User;
import com.splitzy.splitzy.service.dao.UserDao;
import com.splitzy.splitzy.service.dao.UserDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/search")
public class SearchController {

    private static final Logger logger = LoggerFactory.getLogger(SearchController.class);

    @Autowired
    private UserDao userDao;

    @GetMapping("/user")
    public List<User> searchUsers(Authentication auth,
                                  @RequestParam("q") String query,
                                  @RequestParam("userId") String currentUserId) {
        assertOwnership(auth, currentUserId);

        // Only proceed if query has >= 3 chars, to reduce load
        if (query.length() < 3) {
            return List.of();
        }

        // Build a case-insensitive regex with escaped user input to prevent ReDoS
        String regex = "(?i).*" + Pattern.quote(query) + ".*";

        // Query the DB by name or email via DAO
        List<UserDto> byName = userDao.findByNameRegex(regex);
        List<UserDto> byEmail = userDao.findByEmailRegex(regex);

        // Combine results, removing duplicates by id
        Map<String, UserDto> resultMap = new LinkedHashMap<>();
        for (UserDto u : byName) {
            resultMap.put(u.getId(), u);
        }
        for (UserDto u : byEmail) {
            resultMap.put(u.getId(), u);
        }

        // **Always exclude the user themself** from results
        resultMap.remove(currentUserId);

        // Convert DTOs to safe User models (no password/token leakage)
        return resultMap.values().stream()
                .map(this::toSafeUser)
                .collect(Collectors.toList());
    }

    @GetMapping("/friends")
    public List<User> searchFriends(Authentication auth,
                                    @RequestParam("q") String query,
                                    @RequestParam("userId") String currentUserId) {
        assertOwnership(auth, currentUserId);

        if (query.length() < 3) {
            return List.of();
        }

        UserDto currentUser = userDao.findById(currentUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        Set<String> friendIds = currentUser.getFriendIds();

        if (friendIds == null || friendIds.isEmpty()) {
            return List.of();
        }

        // Build case-insensitive pattern with escaped user input to prevent ReDoS
        String regex = "(?i).*" + Pattern.quote(query) + ".*";

        List<UserDto> results = userDao.findFriendsByRegex(friendIds, regex);

        return results.stream()
                .map(this::toSafeUser)
                .collect(Collectors.toList());
    }

    /**
     * Converts a UserDto to a User model without leaking sensitive fields.
     */
    private User toSafeUser(UserDto dto) {
        User user = new User();
        user.setId(dto.getId());
        user.setName(dto.getName());
        user.setEmail(dto.getEmail());
        // Do NOT copy password or verificationToken to prevent data leakage
        user.setVerified(dto.isVerified());
        user.setFriendIds(dto.getFriendIds() != null ? dto.getFriendIds() : new HashSet<>());
        user.setGroupIds(dto.getGroupIds() != null ? dto.getGroupIds() : new HashSet<>());
        return user;
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
