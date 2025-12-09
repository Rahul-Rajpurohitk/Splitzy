package com.splitzy.splitzy.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class GroupMemberDTO {
    private String id;
    private String username;
    private String email;
}
