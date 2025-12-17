package com.splitzy.splitzy.dto;

import lombok.Data;

/**
 * Request body for settling an expense (full or partial).
 */
@Data
public class SettleExpenseRequest {
    private String participantUserId;  // Which participant is settling
    private double settleAmount;       // Amount to settle (0 for full settlement)
    private boolean settleFullAmount;  // If true, settle the entire remaining amount
}

