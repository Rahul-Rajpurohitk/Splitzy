package com.splitzy.splitzy.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class GroupDTO {
    private String id;
    private String groupName;
    private String creatorId;
    private String creatorName;
    private List<GroupMemberDTO> friends;
    private String groupType;
}
