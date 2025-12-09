package com.splitzy.splitzy.model;

import lombok.Data;

@Data
public class Payer {
    private String userId;     // which user paid
    private String payerName;
    private double paidAmount; // how much this user paid
}
