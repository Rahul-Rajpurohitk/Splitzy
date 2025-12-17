package com.splitzy.splitzy.service.dao;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.splitzy.splitzy.model.SplitMethod;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Data Transfer Object for Expense.
 */
public class ExpenseDto {
    private String id;
    private String description;
    private String category;
    private double totalAmount;
    private LocalDate date;
    private String notes;
    private String groupId;
    private String groupName;
    private List<PayerDto> payers = new ArrayList<>();
    private List<ParticipantDto> participants = new ArrayList<>();
    private SplitMethod splitMethod;
    private List<ExpenseItemDto> items = new ArrayList<>();
    private String creatorId;
    private String creatorName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private double taxRate;
    private double tipRate;
    private boolean isPersonal = false;
    private boolean isSettled = false;

    public ExpenseDto() {}

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(double totalAmount) { this.totalAmount = totalAmount; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getGroupId() { return groupId; }
    public void setGroupId(String groupId) { this.groupId = groupId; }

    public String getGroupName() { return groupName; }
    public void setGroupName(String groupName) { this.groupName = groupName; }

    public List<PayerDto> getPayers() { return payers; }
    public void setPayers(List<PayerDto> payers) { this.payers = payers; }

    public List<ParticipantDto> getParticipants() { return participants; }
    public void setParticipants(List<ParticipantDto> participants) { this.participants = participants; }

    public SplitMethod getSplitMethod() { return splitMethod; }
    public void setSplitMethod(SplitMethod splitMethod) { this.splitMethod = splitMethod; }

    public List<ExpenseItemDto> getItems() { return items; }
    public void setItems(List<ExpenseItemDto> items) { this.items = items; }

    public String getCreatorId() { return creatorId; }
    public void setCreatorId(String creatorId) { this.creatorId = creatorId; }

    public String getCreatorName() { return creatorName; }
    public void setCreatorName(String creatorName) { this.creatorName = creatorName; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public double getTaxRate() { return taxRate; }
    public void setTaxRate(double taxRate) { this.taxRate = taxRate; }

    public double getTipRate() { return tipRate; }
    public void setTipRate(double tipRate) { this.tipRate = tipRate; }

    @JsonProperty("isPersonal")
    public boolean isPersonal() { return isPersonal; }
    public void setPersonal(boolean personal) { isPersonal = personal; }

    @JsonProperty("isSettled")
    public boolean isSettled() { return isSettled; }
    public void setSettled(boolean settled) { isSettled = settled; }

    /**
     * Nested DTO for Payer.
     */
    public static class PayerDto {
        private String userId;
        private String payerName;
        private double paidAmount;

        public PayerDto() {}

        public PayerDto(String userId, String payerName, double paidAmount) {
            this.userId = userId;
            this.payerName = payerName;
            this.paidAmount = paidAmount;
        }

        public String getUserId() { return userId; }
        public void setUserId(String userId) { this.userId = userId; }

        public String getPayerName() { return payerName; }
        public void setPayerName(String payerName) { this.payerName = payerName; }

        public double getPaidAmount() { return paidAmount; }
        public void setPaidAmount(double paidAmount) { this.paidAmount = paidAmount; }
    }

    /**
     * Nested DTO for Participant.
     */
    public static class ParticipantDto {
        private String userId;
        private String partName;
        private Double percent;
        private Double exact;
        private Integer shares;
        private double share;
        private double paid;
        private double net;
        private double settledAmount = 0;
        private boolean isFullySettled = false;

        public ParticipantDto() {}

        public String getUserId() { return userId; }
        public void setUserId(String userId) { this.userId = userId; }

        public String getPartName() { return partName; }
        public void setPartName(String partName) { this.partName = partName; }

        public Double getPercent() { return percent; }
        public void setPercent(Double percent) { this.percent = percent; }

        public Double getExact() { return exact; }
        public void setExact(Double exact) { this.exact = exact; }

        public Integer getShares() { return shares; }
        public void setShares(Integer shares) { this.shares = shares; }

        public double getShare() { return share; }
        public void setShare(double share) { this.share = share; }

        public double getPaid() { return paid; }
        public void setPaid(double paid) { this.paid = paid; }

        public double getNet() { return net; }
        public void setNet(double net) { this.net = net; }

        public double getSettledAmount() { return settledAmount; }
        public void setSettledAmount(double settledAmount) { this.settledAmount = settledAmount; }

        @JsonProperty("isFullySettled")
        public boolean isFullySettled() { return isFullySettled; }
        public void setFullySettled(boolean fullySettled) { isFullySettled = fullySettled; }
    }

    /**
     * Nested DTO for ExpenseItem (itemized expenses).
     */
    public static class ExpenseItemDto {
        private String id;
        private String name;
        private double amount;
        private Map<String, Double> userShares;

        public ExpenseItemDto() {}

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public double getAmount() { return amount; }
        public void setAmount(double amount) { this.amount = amount; }

        public Map<String, Double> getUserShares() { return userShares; }
        public void setUserShares(Map<String, Double> userShares) { this.userShares = userShares; }
    }
}

