package com.splitzy.splitzy.entity;

import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.GenericGenerator;

import java.util.HashSet;
import java.util.Set;

/**
 * SQL-backed User entity mirroring the Mongo User fields.
 * Uses String UUID ids to keep service/controller signatures unchanged.
 */
@Entity
@Table(name = "users")
public class UserSql {

    @Id
    @GeneratedValue(generator = "uuid2")
    @GenericGenerator(name = "uuid2", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(length = 36)
    private String id;

    private String name;
    @Column(unique = true, nullable = false)
    private String email;
    private String password;
    private String verificationToken;
    private boolean verified;
    private String avatarUrl;

    @ElementCollection(fetch = jakarta.persistence.FetchType.EAGER)
    private Set<String> friendIds = new HashSet<>();

    @ElementCollection(fetch = jakarta.persistence.FetchType.EAGER)
    private Set<String> groupIds = new HashSet<>();

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getVerificationToken() {
        return verificationToken;
    }

    public void setVerificationToken(String verificationToken) {
        this.verificationToken = verificationToken;
    }

    public boolean isVerified() {
        return verified;
    }

    public void setVerified(boolean verified) {
        this.verified = verified;
    }

    public Set<String> getFriendIds() {
        return friendIds;
    }

    public void setFriendIds(Set<String> friendIds) {
        this.friendIds = friendIds;
    }

    public Set<String> getGroupIds() {
        return groupIds;
    }

    public void setGroupIds(Set<String> groupIds) {
        this.groupIds = groupIds;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }
}

