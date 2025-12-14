package com.splitzy.splitzy.dto;

import lombok.Data;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Data
public class CreateExpenseRequest {
    private String description;
    private String category;    // expense category (e.g., "food", "transport", "entertainment")
    private double totalAmount; // optional if you want the sum of payers to match
    private LocalDate date;
    private String notes;
    // Add these two lines to your CreateExpenseRequest.java (e.g., after tipRate)
    private String groupId;
    private String groupName;


    // multiple payers scenario
    private List<PayerDTO> payers;

    // The single array from front-end with both raw & computed fields
    private List<ParticipantDTO> participants;

    // how to split, e.g. "equally", "eachPaidOwn", etc.
    private String splitMethod; // optional, if you want multiple splitting logic

    private String creatorId; // The name of the user who created this expense

    // For itemized mode
    private List<ExpenseItemDTO> items;

    private double taxRate;
    private double tipRate;

    private String fullOwe;


    /*
    // For PERCENTAGE mode: userId -> percentage (e.g. 35.0 for 35%)
    private Map<String, Double> userPercentMap;

    // For EXACT_AMOUNTS mode: userId -> exact amount
    private Map<String, Double> exactAmountsMap;

    // For SHARES mode: userId -> shareCount
    private Map<String, Integer> sharesMap;

    private List<FinalParticipantDTO> finalParticipants; */

}
