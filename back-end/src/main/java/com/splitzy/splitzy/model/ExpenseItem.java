package com.splitzy.splitzy.model;

import lombok.Data;

import java.util.Map;

@Data
public class ExpenseItem {
    private String name;   // e.g. "Coke", "Pizza", "Drug", etc.
    private double amount; // the cost of this item
    // same concept: userId -> fraction
    private Map<String, Double> userShares;
}
