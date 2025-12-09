package com.splitzy.splitzy.dto;

import lombok.Data;

@Data
public class PayerDTO {
    private String userId;
    private String payerName;
    private double paidAmount;
}
