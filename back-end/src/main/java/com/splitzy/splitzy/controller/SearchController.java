package com.splitzy.splitzy.controller;

import com.splitzy.splitzy.model.User;
import com.splitzy.splitzy.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/search")
public class SearchController {

    @Autowired
    private final UserRepository userRepository;

    public SearchController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }


    @GetMapping("/user")
    public List<User> searchUsers(@RequestParam("q") String query,
                                  @RequestParam("userId") String currentUserId) {
        // Only proceed if query has >= 3 chars, to reduce load
        if (query.length() < 3) {
            return List.of(); // or throw an exception, or return 400
        }

        // Build a case-insensitive regex: (?i) means ignore case
        String regex = "(?i).*" + query + ".*";

        // Query the DB by name or email
        List<User> byName = userRepository.findByNameRegex(regex);
        List<User> byEmail = userRepository.findByEmailRegex(regex);

        // Combine results, removing duplicates
        Set<User> resultSet = new HashSet<>(byName);
        resultSet.addAll(byEmail);

        // **Always exclude the user themself** from results
        resultSet.removeIf(u -> u.getId().equals(currentUserId));

        return new ArrayList<>(resultSet);
    }

    /**
     * 2) Search only among the current user's friends, by name/email.
     * GET /search/friends?q=someName&userId=currentUserId
     */
    @GetMapping("/friends")
    public List<User> searchFriends(@RequestParam("q") String query,
                                    @RequestParam("userId") String currentUserId) {
        if (query.length() < 3) {
            return List.of();
        }

        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("User not found: " + currentUserId));
        Set<String> friendIds = currentUser.getFriendIds();
        if (friendIds.isEmpty()) {
            return List.of();
        }

        // Build the same case-insensitive pattern
        String regex = ".*" + query + ".*"; // We'll set $options:'i' in the query itself

        // Now a single query that matches:
        //   `_id in friendIds`
        //   AND (`name` or `email` matches the regex)
        return userRepository.findFriendsByRegex(friendIds, regex);
    }


/*    @GetMapping("/groups/{groupId}")
    public List<User> searchGroupMembers(@PathVariable String groupId,
                                         @RequestParam("q") String query,
                                         @RequestParam("userId") String currentUserId) {
        // 1) Check user is in group or has permission
        // 2) Get all user IDs in that group
        // 3) Filter by name/email
        // 4) Exclude the current user if you want
        return ...
    }*/



}
