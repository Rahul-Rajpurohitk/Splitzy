package com.splitzy.splitzy.dto;

import lombok.Data;

// ParticipantDTO.java
@Data
public class ParticipantDTO {
    private String userId;
    private String name;
    // Raw fields
    private Double percent;
    private Double exact;
    private Integer shares;
    // Computed fields
    private double paid;
    private double owes;
    private double net;
}
