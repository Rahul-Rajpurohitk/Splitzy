package com.splitzy.splitzy.controller;

import com.splitzy.splitzy.dto.CreateExpenseRequest;
import com.splitzy.splitzy.dto.SettleExpenseRequest;
import com.splitzy.splitzy.exception.ResourceNotFoundException;
import com.splitzy.splitzy.model.Expense;
import com.splitzy.splitzy.service.ExpenseService;
import com.splitzy.splitzy.service.dao.UserDao;
import com.splitzy.splitzy.service.dao.UserDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/home/expenses")
public class ExpenseController {

    private static final Logger logger = LoggerFactory.getLogger(ExpenseController.class);

    @Autowired
    private ExpenseService expenseService;

    @Autowired
    private UserDao userDao;

    @GetMapping("/user-expenses")
    public ResponseEntity<List<Expense>> getUserExpenses(
            Authentication auth,
            @RequestParam String userId,
            @RequestParam(required = false, defaultValue = "ALL") String filter,
            @RequestParam(required = false) String owingFilter,
            @RequestParam(required = false) String settledFilter,
            @RequestParam(required = false) String friendId,
            @RequestParam(required = false) String groupId,
            @RequestParam(required = false) String typeFilter,
            @RequestParam(required = false) String partialFilter,
            @RequestParam(required = false) String categoryFilter,
            @RequestParam(required = false) String dateRangeFilter
    ) {
        if (userId == null || userId.trim().isEmpty()) {
            throw new IllegalArgumentException("userId is required");
        }
        assertOwnership(auth, userId);
        logger.debug("Getting expenses for user: {}, filter: {}, owingFilter: {}, settledFilter: {}, friendId: {}, groupId: {}, typeFilter: {}, partialFilter: {}, categoryFilter: {}, dateRangeFilter: {}",
                userId, filter, owingFilter, settledFilter, friendId, groupId, typeFilter, partialFilter, categoryFilter, dateRangeFilter);
        List<Expense> expenses = expenseService.getExpensesForUserFiltered(
                userId, filter, owingFilter, settledFilter, friendId, groupId, typeFilter, partialFilter, categoryFilter, dateRangeFilter);
        return ResponseEntity.ok(expenses != null ? expenses : Collections.emptyList());
    }

    @GetMapping("/friend")
    public ResponseEntity<List<Expense>> getExpensesForFriend(
            Authentication auth,
            @RequestParam String userId,
            @RequestParam String friendId
    ) {
        if (userId == null || userId.trim().isEmpty()) {
            throw new IllegalArgumentException("userId is required");
        }
        if (friendId == null || friendId.trim().isEmpty()) {
            throw new IllegalArgumentException("friendId is required");
        }
        assertOwnership(auth, userId);
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
    public ResponseEntity<Expense> createExpense(Authentication auth, @RequestBody CreateExpenseRequest request) {
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
        
        assertOwnership(auth, request.getCreatorId());
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
            Authentication auth,
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
        
        // Verify the authenticated user is involved in this expense (as payer, participant, or creator)
        assertInvolvedInExpense(auth, expenseId);
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

    /**
     * Resolves the authenticated user's ID from the JWT token.
     */
    private String getAuthenticatedUserId(Authentication auth) {
        if (auth == null || auth.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        String email = auth.getName();
        UserDto user = userDao.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        return user.getId();
    }

    /**
     * Validates that the supplied userId matches the authenticated user.
     * Prevents IDOR attacks where a user passes another user's ID.
     */
    private void assertOwnership(Authentication auth, String userId) {
        String authenticatedUserId = getAuthenticatedUserId(auth);
        if (!authenticatedUserId.equals(userId)) {
            logger.warn("IDOR attempt: authenticated user {} tried to access data for user {}", authenticatedUserId, userId);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
    }

    /**
     * Validates the authenticated user is involved in the expense (as payer, participant, or creator).
     * Used for settle operations where either party can initiate settlement.
     */
    private void assertInvolvedInExpense(Authentication auth, String expenseId) {
        String authenticatedUserId = getAuthenticatedUserId(auth);
        Expense expense = expenseService.getExpenseById(expenseId);
        if (expense == null) {
            throw new ResourceNotFoundException("Expense", expenseId);
        }
        // Check if user is the creator
        if (authenticatedUserId.equals(expense.getCreatorId())) {
            return;
        }
        // Check if user is a payer
        if (expense.getPayers() != null) {
            for (var payer : expense.getPayers()) {
                if (authenticatedUserId.equals(payer.getUserId())) {
                    return;
                }
            }
        }
        // Check if user is a participant
        if (expense.getParticipants() != null) {
            for (var participant : expense.getParticipants()) {
                if (authenticatedUserId.equals(participant.getUserId())) {
                    return;
                }
            }
        }
        logger.warn("IDOR attempt: user {} tried to settle expense {} they're not involved in", authenticatedUserId, expenseId);
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
    }
}
