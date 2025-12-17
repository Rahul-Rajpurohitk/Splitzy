package com.splitzy.splitzy.controller;

import com.splitzy.splitzy.dto.CreateExpenseRequest;
import com.splitzy.splitzy.dto.SettleExpenseRequest;
import com.splitzy.splitzy.model.Expense;
import com.splitzy.splitzy.service.ExpenseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/home/expenses") // All expense endpoints start with /home/expenses
public class ExpenseController {

    @Autowired
    private ExpenseService expenseService;

    @GetMapping("/user-expenses")
    public List<Expense> getUserExpenses(
            @RequestParam String userId,
            @RequestParam(required=false, defaultValue="ALL") String filter
    ) {
        return expenseService.getExpensesForUser(userId, filter);
    }

    @GetMapping("/friend")
    public List<Expense> getExpensesForFriend(
            @RequestParam String userId,
            @RequestParam String friendId
    ) {
        return expenseService.getExpensesForUser(userId, friendId);
    }

    @GetMapping("/group")
    public List<Expense> getExpensesForGroup(
            @RequestParam String groupId
    ) {
        return expenseService.getExpensesForUser(groupId);
    }




    // POST /home/expenses
    @PostMapping
    public ResponseEntity<Expense> createExpense(@RequestBody CreateExpenseRequest request) {
        Expense expense = expenseService.createExpense(request);
        return ResponseEntity.status(201).body(expense);
    }

    // GET /home/expenses/{expenseId}
    @GetMapping("/{expenseId}")
    public ResponseEntity<Expense> getExpenseById(@PathVariable String expenseId) {
        Expense expense = expenseService.getExpenseById(expenseId);
        return ResponseEntity.ok(expense);
    }

    // DELETE /home/expenses/{expenseId}
    @DeleteMapping("/{expenseId}")
    public ResponseEntity<Map<String, String>> deleteExpense(@PathVariable String expenseId) {
        expenseService.deleteExpense(expenseId);
        return ResponseEntity.ok(Map.of("message", "Expense deleted successfully", "expenseId", expenseId));
    }

    // POST /home/expenses/{expenseId}/settle - Settle/mark as paid for a participant
    @PostMapping("/{expenseId}/settle")
    public ResponseEntity<Expense> settleExpense(
            @PathVariable String expenseId,
            @RequestBody SettleExpenseRequest request) {
        Expense expense = expenseService.settleExpense(expenseId, request);
        return ResponseEntity.ok(expense);
    }

    // POST /home/expenses/{expenseId}/settle-full - Mark entire expense as settled
    @PostMapping("/{expenseId}/settle-full")
    public ResponseEntity<Expense> settleExpenseFull(@PathVariable String expenseId) {
        Expense expense = expenseService.settleExpenseFull(expenseId);
        return ResponseEntity.ok(expense);
    }
}
