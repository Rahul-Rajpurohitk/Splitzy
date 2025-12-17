package com.splitzy.splitzy.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.GenericGenerator;

import java.time.LocalDateTime;

@Entity
@Table(name = "chat_messages")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageSql {

    public enum MessageType {
        TEXT,
        EXPENSE_SHARE
    }

    @Id
    @GeneratedValue(generator = "uuid2")
    @GenericGenerator(name = "uuid2", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(length = 36)
    private String id;

    @Column(length = 36, nullable = false)
    private String threadId;

    @Column(length = 36, nullable = false)
    private String senderId;

    private String senderName;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private MessageType messageType = MessageType.TEXT;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    // For expense shares - stores expense ID
    @Column(length = 36)
    private String expenseId;

    // Store expense snapshot for display (JSON)
    @Column(columnDefinition = "TEXT")
    private String expenseSnapshot;

    // For threaded replies - references parent message
    @Column(length = 36)
    private String replyToId;

    // Cached info about the message being replied to
    private String replyToSenderName;
    
    @Column(columnDefinition = "TEXT")
    private String replyToContent;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;
}

