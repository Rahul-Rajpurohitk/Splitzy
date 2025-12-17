package com.splitzy.splitzy.model;

import lombok.Data;

@Data
public class Participant {
    private String userId;   // which user is part of the expense
    private String partName;

    // Raw fields
    private Double percent;
    private Double exact;
    private Integer shares;

    private double share;    // how much this user owes
    private double paid;
    private double net;
    
    // Settlement tracking
    private double settledAmount = 0;  // Amount already settled/paid
    private boolean fullySettled = false;  // Whether fully settled
}
