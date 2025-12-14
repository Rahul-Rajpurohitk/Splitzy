package com.splitzy.splitzy.service.dao;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Data Transfer Object for Group.
 */
public class GroupDto {
    private String id;
    private String groupName;
    private String creatorId;
    private String creatorName;
    private List<GroupMemberDto> friends = new ArrayList<>();
    private String groupType;
    private LocalDateTime createdAt;

    public GroupDto() {}

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getGroupName() { return groupName; }
    public void setGroupName(String groupName) { this.groupName = groupName; }

    public String getCreatorId() { return creatorId; }
    public void setCreatorId(String creatorId) { this.creatorId = creatorId; }

    public String getCreatorName() { return creatorName; }
    public void setCreatorName(String creatorName) { this.creatorName = creatorName; }

    public List<GroupMemberDto> getFriends() { return friends; }
    public void setFriends(List<GroupMemberDto> friends) { this.friends = friends; }

    public String getGroupType() { return groupType; }
    public void setGroupType(String groupType) { this.groupType = groupType; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    /**
     * Nested DTO for group members.
     */
    public static class GroupMemberDto {
        private String id;
        private String username;
        private String email;

        public GroupMemberDto() {}

        public GroupMemberDto(String id, String username, String email) {
            this.id = id;
            this.username = username;
            this.email = email;
        }

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
    }
}

