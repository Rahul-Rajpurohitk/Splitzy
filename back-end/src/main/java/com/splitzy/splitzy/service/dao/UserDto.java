package com.splitzy.splitzy.service.dao;

import java.util.HashSet;
import java.util.Set;

/**
 * Data Transfer Object for User.
 * Acts as a common representation between MongoDB and PostgreSQL entities.
 */
public class UserDto {
    private String id;
    private String name;
    private String email;
    private String password;
    private String verificationToken;
    private boolean verified;
    private String avatarUrl;
    private Set<String> friendIds = new HashSet<>();
    private Set<String> groupIds = new HashSet<>();

    public UserDto() {}

    public UserDto(String id, String name, String email, String password, 
                   String verificationToken, boolean verified, String avatarUrl,
                   Set<String> friendIds, Set<String> groupIds) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.password = password;
        this.verificationToken = verificationToken;
        this.verified = verified;
        this.avatarUrl = avatarUrl;
        this.friendIds = friendIds != null ? friendIds : new HashSet<>();
        this.groupIds = groupIds != null ? groupIds : new HashSet<>();
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getVerificationToken() { return verificationToken; }
    public void setVerificationToken(String verificationToken) { this.verificationToken = verificationToken; }

    public boolean isVerified() { return verified; }
    public void setVerified(boolean verified) { this.verified = verified; }

    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

    public Set<String> getFriendIds() { return friendIds; }
    public void setFriendIds(Set<String> friendIds) { this.friendIds = friendIds; }

    public Set<String> getGroupIds() { return groupIds; }
    public void setGroupIds(Set<String> groupIds) { this.groupIds = groupIds; }
}

