package com.splitzy.splitzy.entity;

import jakarta.persistence.Embeddable;

@Embeddable
public class ParticipantSql {
    private String userId;
    private String partName;
    private double paid;
    private double share;
    private double net;
    
    // Payment tracking fields
    private double settledAmount = 0; // Amount already settled/paid by this participant
    private boolean isFullySettled = false; // Whether this participant's share is fully settled

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getPartName() {
        return partName;
    }

    public void setPartName(String partName) {
        this.partName = partName;
    }

    public double getPaid() {
        return paid;
    }

    public void setPaid(double paid) {
        this.paid = paid;
    }

    public double getShare() {
        return share;
    }

    public void setShare(double share) {
        this.share = share;
    }

    public double getNet() {
        return net;
    }

    public void setNet(double net) {
        this.net = net;
    }

    public double getSettledAmount() {
        return settledAmount;
    }

    public void setSettledAmount(double settledAmount) {
        this.settledAmount = settledAmount;
    }

    public boolean isFullySettled() {
        return isFullySettled;
    }

    public void setFullySettled(boolean fullySettled) {
        isFullySettled = fullySettled;
    }
}

