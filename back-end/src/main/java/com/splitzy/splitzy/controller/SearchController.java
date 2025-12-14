package com.splitzy.splitzy.controller;

import com.splitzy.splitzy.model.User;
import com.splitzy.splitzy.service.dao.UserDao;
import com.splitzy.splitzy.service.dao.UserDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/search")
public class SearchController {

    private static final Logger logger = LoggerFactory.getLogger(SearchController.class);

    @Autowired
    private UserDao userDao;

    @GetMapping("/user")
    public List<User> searchUsers(@RequestParam("q") String query,
                                  @RequestParam("userId") String currentUserId) {
        // Only proceed if query has >= 3 chars, to reduce load
        if (query.length() < 3) {
            return List.of(); // or throw an exception, or return 400
        }

        // Build a case-insensitive regex: (?i) means ignore case
        String regex = "(?i).*" + query + ".*";

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

        // Convert DTOs to User models
        return resultMap.values().stream()
                .map(this::toUser)
                .collect(Collectors.toList());
    }

    /**
     * 2) Search only among the current user's friends, by name/email.
     * GET /search/friends?q=someName&userId=currentUserId
     */
    @GetMapping("/friends")
    public List<User> searchFriends(@RequestParam("q") String query,
                                    @RequestParam("userId") String currentUserId) {
        logger.info("[SearchController] searchFriends called with query='{}', userId='{}'", query, currentUserId);
        
        if (query.length() < 3) {
            logger.info("[SearchController] Query too short, returning empty list");
            return List.of();
        }

        UserDto currentUser = userDao.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("User not found: " + currentUserId));
        Set<String> friendIds = currentUser.getFriendIds();
        logger.info("[SearchController] User {} has {} friends: {}", currentUserId, friendIds.size(), friendIds);
        
        if (friendIds == null || friendIds.isEmpty()) {
            logger.info("[SearchController] No friends found, returning empty list");
            return List.of();
        }

        // Build the same case-insensitive pattern
        String regex = ".*" + query + ".*";
        logger.info("[SearchController] Searching with regex: {}", regex);

        List<UserDto> results = userDao.findFriendsByRegex(friendIds, regex);
        logger.info("[SearchController] Found {} matching friends", results.size());

        return results.stream()
                .map(this::toUser)
                .collect(Collectors.toList());
    }

    // --- Conversion helper ---
    private User toUser(UserDto dto) {
        User user = new User();
        user.setId(dto.getId());
        user.setName(dto.getName());
        user.setEmail(dto.getEmail());
        user.setPassword(dto.getPassword());
        user.setVerificationToken(dto.getVerificationToken());
        user.setVerified(dto.isVerified());
        user.setFriendIds(dto.getFriendIds() != null ? dto.getFriendIds() : new HashSet<>());
        user.setGroupIds(dto.getGroupIds() != null ? dto.getGroupIds() : new HashSet<>());
        return user;
    }
}
