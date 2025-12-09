package com.splitzy.splitzy.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "friendRequests")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FriendRequest {

    @Id
    private String id;

    private String senderId;      // ID of the user who sent the request
    private String receiverId;  // ID of the user who receives the request

    private FriendRequestStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

