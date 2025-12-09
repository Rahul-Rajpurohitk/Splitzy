package com.splitzy.splitzy.controller;

import com.splitzy.splitzy.dto.GroupDTO;
import com.splitzy.splitzy.service.GroupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/groups")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;

    @PostMapping
    public ResponseEntity<GroupDTO> createGroup(@RequestBody GroupDTO groupDTO) {
        GroupDTO createdGroup = groupService.createGroup(groupDTO);
        return ResponseEntity.ok(createdGroup);
    }

    @GetMapping("/{userId}")
    public ResponseEntity<List<GroupDTO>> getGroupsForUser(@PathVariable String userId) {
        List<GroupDTO> groups = groupService.getGroupsForUser(userId);
        return ResponseEntity.ok(groups);
    }
}
