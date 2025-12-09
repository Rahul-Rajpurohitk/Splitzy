package com.splitzy.splitzy.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "groups")
public class Group {
    @Id
    private String id;

    private String groupName;
    private String creatorId;
    private String creatorName;
    private List<GroupMember> friends;
    private String groupType;
    private LocalDateTime createdAt;
}
