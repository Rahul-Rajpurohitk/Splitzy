package com.splitzy.splitzy.dto;

import lombok.Data;

import java.util.Map;

@Data
public class ExpenseItemDTO {
    private String name;
    private double amount;
    // a map: userId -> fraction or percentage of this item
    private Map<String, Double> userShares;
}
