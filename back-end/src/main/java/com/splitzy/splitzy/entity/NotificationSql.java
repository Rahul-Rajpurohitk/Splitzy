package com.splitzy.splitzy.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.GenericGenerator;

import java.time.LocalDateTime;

/**
 * SQL-backed Notification entity mirroring the Mongo Notification document.
 */
@Entity
@Table(name = "notifications")
public class NotificationSql {

    @Id
    @GeneratedValue(generator = "uuid2")
    @GenericGenerator(name = "uuid2", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(length = 36)
    private String id;

    private String userId;      // receiver Id

    @Column(columnDefinition = "TEXT")
    private String message;

    private String type;        // e.g. "FRIEND_REQUEST", "EXPENSE", "GROUP_INVITE"

    @Column(name = "is_read")
    private boolean read;

    private LocalDateTime createdAt;

    private String referenceId; // references friend request ID or expense ID, etc.
    private String senderName;
    private String senderId;

    public NotificationSql() {}

    public NotificationSql(String userId, String message, String type, boolean read,
                           LocalDateTime createdAt, String referenceId, String senderName, String senderId) {
        this.userId = userId;
        this.message = message;
        this.type = type;
        this.read = read;
        this.createdAt = createdAt;
        this.referenceId = referenceId;
        this.senderName = senderName;
        this.senderId = senderId;
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public boolean isRead() {
        return read;
    }

    public void setRead(boolean read) {
        this.read = read;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getReferenceId() {
        return referenceId;
    }

    public void setReferenceId(String referenceId) {
        this.referenceId = referenceId;
    }

    public String getSenderName() {
        return senderName;
    }

    public void setSenderName(String senderName) {
        this.senderName = senderName;
    }

    public String getSenderId() {
        return senderId;
    }

    public void setSenderId(String senderId) {
        this.senderId = senderId;
    }
}

