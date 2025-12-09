package com.splitzy.splitzy.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class GroupMember {
    private String id;
    private String username;
    private String email;
}
