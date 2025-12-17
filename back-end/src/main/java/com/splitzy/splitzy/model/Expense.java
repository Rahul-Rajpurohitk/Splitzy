package com.splitzy.splitzy.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;
import lombok.AccessLevel;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Document(collection = "expenses")
public class Expense {

    @Id
    private String id;

    private String description;
    private String category;              // expense category (e.g., "food", "transport", "entertainment")
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
    
    // Personal expense flag - prevent Lombok from generating getter/setter
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    private boolean isPersonal = false;
    
    // Settlement status - prevent Lombok from generating getter/setter  
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    private boolean isSettled = false;
    
    // Manual getters/setters with correct JSON property naming
    @JsonProperty("isPersonal")
    public boolean isPersonal() {
        return isPersonal;
    }
    
    public void setPersonal(boolean personal) {
        this.isPersonal = personal;
    }
    
    @JsonProperty("isSettled")
    public boolean isSettled() {
        return isSettled;
    }
    
    public void setSettled(boolean settled) {
        this.isSettled = settled;
    }
}
