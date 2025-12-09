package com.splitzy.splitzy.dto;

import lombok.Data;

@Data
public class GroupEventData {
    private String type;         // e.g., "GROUP_INVITE"
    private String groupId;
    private String groupName;
    private String creatorId;
    private String creatorName;
}
