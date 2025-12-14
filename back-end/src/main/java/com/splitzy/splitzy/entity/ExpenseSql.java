package com.splitzy.splitzy.entity;

import com.splitzy.splitzy.model.SplitMethod;
import jakarta.persistence.*;
import org.hibernate.annotations.GenericGenerator;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * SQL-backed Expense entity mirroring the Mongo Expense document.
 */
@Entity
@Table(name = "expenses")
public class ExpenseSql {

    @Id
    @GeneratedValue(generator = "uuid2")
    @GenericGenerator(name = "uuid2", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(length = 36)
    private String id;

    private String description;
    private String category;
    private double totalAmount;
    private LocalDate date;

    @Column(columnDefinition = "TEXT")
    private String notes;

    private String groupId;
    private String groupName;

    @ElementCollection
    @CollectionTable(name = "expense_payers", joinColumns = @JoinColumn(name = "expense_id"))
    private List<PayerSql> payers = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "expense_participants", joinColumns = @JoinColumn(name = "expense_id"))
    private List<ParticipantSql> participants = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    private SplitMethod splitMethod;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "expense_id")
    private List<ExpenseItemSql> items = new ArrayList<>();

    private String creatorId;
    private String creatorName;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private double taxRate;
    private double tipRate;

    public ExpenseSql() {}

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public double getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(double totalAmount) {
        this.totalAmount = totalAmount;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String getGroupId() {
        return groupId;
    }

    public void setGroupId(String groupId) {
        this.groupId = groupId;
    }

    public String getGroupName() {
        return groupName;
    }

    public void setGroupName(String groupName) {
        this.groupName = groupName;
    }

    public List<PayerSql> getPayers() {
        return payers;
    }

    public void setPayers(List<PayerSql> payers) {
        this.payers = payers;
    }

    public List<ParticipantSql> getParticipants() {
        return participants;
    }

    public void setParticipants(List<ParticipantSql> participants) {
        this.participants = participants;
    }

    public SplitMethod getSplitMethod() {
        return splitMethod;
    }

    public void setSplitMethod(SplitMethod splitMethod) {
        this.splitMethod = splitMethod;
    }

    public List<ExpenseItemSql> getItems() {
        return items;
    }

    public void setItems(List<ExpenseItemSql> items) {
        this.items = items;
    }

    public String getCreatorId() {
        return creatorId;
    }

    public void setCreatorId(String creatorId) {
        this.creatorId = creatorId;
    }

    public String getCreatorName() {
        return creatorName;
    }

    public void setCreatorName(String creatorName) {
        this.creatorName = creatorName;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public double getTaxRate() {
        return taxRate;
    }

    public void setTaxRate(double taxRate) {
        this.taxRate = taxRate;
    }

    public double getTipRate() {
        return tipRate;
    }

    public void setTipRate(double tipRate) {
        this.tipRate = tipRate;
    }
}

