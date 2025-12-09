package com.splitzy.splitzy.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Document(collection = "expenses")
public class Expense {

    @Id
    private String id;

    private String description;
    private double totalAmount;           // sum of all payers' amounts
    private LocalDate date;
    private String notes;
    private String groupId;
    private String groupName;
    // Each payer: which user paid, and how much
    private List<Payer> payers;
    // Each participant: which user is part of the expense, and how much they owe
    private List<Participant> participants;
    private SplitMethod splitMethod;
    // New field for itemized expenses
    private List<ExpenseItem> items;
    private String creatorId;
    private String creatorName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private double taxRate;
    private double tipRate;
}
