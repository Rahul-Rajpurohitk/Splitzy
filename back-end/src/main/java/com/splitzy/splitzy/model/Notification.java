package com.splitzy.splitzy.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;


@Document(collection = "notification")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Notification {

    @Id
    private String id;

    private String userId;      // receiver Id
    private String message;     // More details
    private String type;        // e.g. "FRIEND_REQUEST"
    private boolean read;       // Mark if the user read it
    private LocalDateTime createdAt;

    // Possibly link back to a FriendRequest ID or other reference
    private String referenceId; // references friend request ID or expense ID, etc.
    private String senderName;
    private String senderId;
}
