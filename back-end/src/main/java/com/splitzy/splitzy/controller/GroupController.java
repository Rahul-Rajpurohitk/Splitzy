package com.splitzy.splitzy.controller;

import com.splitzy.splitzy.dto.GroupDTO;
import com.splitzy.splitzy.service.GroupService;
import com.splitzy.splitzy.service.dao.UserDao;
import com.splitzy.splitzy.service.dao.UserDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/groups")
public class GroupController {

    private static final Logger logger = LoggerFactory.getLogger(GroupController.class);

    private final GroupService groupService;
    private final UserDao userDao;

    public GroupController(GroupService groupService, UserDao userDao) {
        this.groupService = groupService;
        this.userDao = userDao;
    }

    @PostMapping
    public ResponseEntity<GroupDTO> createGroup(@RequestBody GroupDTO groupDTO) {
        GroupDTO createdGroup = groupService.createGroup(groupDTO);
        return ResponseEntity.ok(createdGroup);
    }

    @GetMapping("/{userId}")
    public ResponseEntity<List<GroupDTO>> getGroupsForUser(Authentication auth, @PathVariable String userId) {
        assertOwnership(auth, userId);
        List<GroupDTO> groups = groupService.getGroupsForUser(userId);
        return ResponseEntity.ok(groups);
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
