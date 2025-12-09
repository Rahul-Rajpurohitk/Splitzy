package com.splitzy.splitzy.service;

import com.splitzy.splitzy.dto.GroupDTO;

import java.util.List;

public interface GroupService {
    GroupDTO createGroup(GroupDTO groupDTO);
    List<GroupDTO> getGroupsForUser(String userId);  // Optionally to fetch groups by user (as creator or member)
}
