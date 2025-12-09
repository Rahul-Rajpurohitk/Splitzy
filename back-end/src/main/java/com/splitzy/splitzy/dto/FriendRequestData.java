package com.splitzy.splitzy.dto;

import lombok.Data;

@Data
public class FriendRequestData {
    private String type;       // e.g., "FRIEND_REQUEST_SENT"
    private String requestId;
    private String senderId;
    private String receiverId;
}
