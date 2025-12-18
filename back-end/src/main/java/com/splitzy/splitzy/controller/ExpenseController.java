package com.splitzy.splitzy.controller;

import com.splitzy.splitzy.dto.CreateExpenseRequest;
import com.splitzy.splitzy.dto.SettleExpenseRequest;
import com.splitzy.splitzy.exception.ResourceNotFoundException;
import com.splitzy.splitzy.model.Expense;
import com.splitzy.splitzy.service.ExpenseService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/home/expenses")
public class ExpenseController {

    private static final Logger logger = LoggerFactory.getLogger(ExpenseController.class);

    @Autowired
    private ExpenseService expenseService;

    @GetMapping("/user-expenses")
    public ResponseEntity<List<Expense>> getUserExpenses(
            @RequestParam String userId,
            @RequestParam(required = false, defaultValue = "ALL") String filter
    ) {
        if (userId == null || userId.trim().isEmpty()) {
            throw new IllegalArgumentException("userId is required");
        }
        logger.debug("Getting expenses for user: {}, filter: {}", userId, filter);
        List<Expense> expenses = expenseService.getExpensesForUser(userId, filter);
        return ResponseEntity.ok(expenses != null ? expenses : Collections.emptyList());
    }

    @GetMapping("/friend")
    public ResponseEntity<List<Expense>> getExpensesForFriend(
            @RequestParam String userId,
            @RequestParam String friendId
    ) {
        if (userId == null || userId.trim().isEmpty()) {
            throw new IllegalArgumentException("userId is required");
        }
        if (friendId == null || friendId.trim().isEmpty()) {
            throw new IllegalArgumentException("friendId is required");
        }
        logger.debug("Getting expenses for user: {} with friend: {}", userId, friendId);
        List<Expense> expenses = expenseService.getExpensesForUser(userId, friendId);
        return ResponseEntity.ok(expenses != null ? expenses : Collections.emptyList());
    }

    @GetMapping("/group")
    public ResponseEntity<List<Expense>> getExpensesForGroup(@RequestParam String groupId) {
        if (groupId == null || groupId.trim().isEmpty()) {
            throw new IllegalArgumentException("groupId is required");
        }
        logger.debug("Getting expenses for group: {}", groupId);
        List<Expense> expenses = expenseService.getExpensesForUser(groupId);
        return ResponseEntity.ok(expenses != null ? expenses : Collections.emptyList());
    }

    @PostMapping
    public ResponseEntity<Expense> createExpense(@RequestBody CreateExpenseRequest request) {
        // Validate request
        if (request == null) {
            throw new IllegalArgumentException("Request body is required");
        }
        if (request.getCreatorId() == null || request.getCreatorId().trim().isEmpty()) {
            throw new IllegalArgumentException("creatorId is required");
        }
        if (request.getDescription() == null || request.getDescription().trim().isEmpty()) {
            throw new IllegalArgumentException("description is required");
        }
        if (request.getPayers() == null || request.getPayers().isEmpty()) {
            throw new IllegalArgumentException("At least one payer is required");
        }
        if (request.getTotalAmount() <= 0 && !"ITEMIZED".equalsIgnoreCase(request.getSplitMethod())) {
            throw new IllegalArgumentException("totalAmount must be positive");
        }
        
        logger.info("Creating expense: {} by user: {}", request.getDescription(), request.getCreatorId());
        Expense expense = expenseService.createExpense(request);
        return ResponseEntity.status(201).body(expense);
    }

    @GetMapping("/{expenseId}")
    public ResponseEntity<Expense> getExpenseById(@PathVariable String expenseId) {
        if (expenseId == null || expenseId.trim().isEmpty()) {
            throw new IllegalArgumentException("expenseId is required");
        }
        logger.debug("Getting expense: {}", expenseId);
        Expense expense = expenseService.getExpenseById(expenseId);
        if (expense == null) {
            throw new ResourceNotFoundException("Expense", expenseId);
        }
        return ResponseEntity.ok(expense);
    }

    @DeleteMapping("/{expenseId}")
    public ResponseEntity<Map<String, String>> deleteExpense(@PathVariable String expenseId) {
        if (expenseId == null || expenseId.trim().isEmpty()) {
            throw new IllegalArgumentException("expenseId is required");
        }
        logger.info("Deleting expense: {}", expenseId);
        expenseService.deleteExpense(expenseId);
        return ResponseEntity.ok(Map.of("message", "Expense deleted successfully", "expenseId", expenseId));
    }

    @PostMapping("/{expenseId}/settle")
    public ResponseEntity<Expense> settleExpense(
            @PathVariable String expenseId,
            @RequestBody SettleExpenseRequest request) {
        if (expenseId == null || expenseId.trim().isEmpty()) {
            throw new IllegalArgumentException("expenseId is required");
        }
        if (request == null) {
            throw new IllegalArgumentException("Request body is required");
        }
        if (request.getParticipantUserId() == null || request.getParticipantUserId().trim().isEmpty()) {
            throw new IllegalArgumentException("participantUserId is required in settle request");
        }
        
        logger.info("Settling expense: {} for user: {}", expenseId, request.getParticipantUserId());
        Expense expense = expenseService.settleExpense(expenseId, request);
        if (expense == null) {
            throw new ResourceNotFoundException("Expense", expenseId);
        }
        return ResponseEntity.ok(expense);
    }

    @PostMapping("/{expenseId}/settle-full")
    public ResponseEntity<Expense> settleExpenseFull(@PathVariable String expenseId) {
        if (expenseId == null || expenseId.trim().isEmpty()) {
            throw new IllegalArgumentException("expenseId is required");
        }
        logger.info("Fully settling expense: {}", expenseId);
        Expense expense = expenseService.settleExpenseFull(expenseId);
        if (expense == null) {
            throw new ResourceNotFoundException("Expense", expenseId);
        }
        return ResponseEntity.ok(expense);
    }
}
