package com.splitzy.splitzy.entity;

import jakarta.persistence.Embeddable;

/**
 * SQL-backed Payer embeddable mirroring the Mongo Payer fields.
 */
@Embeddable
public class PayerSql {
    private String userId;
    private String payerName;
    private double paidAmount;

    public PayerSql() {}

    public PayerSql(String userId, String payerName, double paidAmount) {
        this.userId = userId;
        this.payerName = payerName;
        this.paidAmount = paidAmount;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getPayerName() {
        return payerName;
    }

    public void setPayerName(String payerName) {
        this.payerName = payerName;
    }

    public double getPaidAmount() {
        return paidAmount;
    }

    public void setPaidAmount(double paidAmount) {
        this.paidAmount = paidAmount;
    }
}

