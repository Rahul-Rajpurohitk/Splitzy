package com.splitzy.splitzy.dto;

import lombok.Data;

@Data
public class ExpenseEventData {
    private String type;         // e.g. "EXPENSE_CREATED"
    private String expenseId;    // ID of the newly created expense
    private String creatorName;
    private String creatorId;    // who created it
    // optionally: participants, or other fields
}
