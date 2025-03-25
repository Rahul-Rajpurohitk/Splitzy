package com.splitzy.splitzy.controller;

import com.splitzy.splitzy.dto.CreateExpenseRequest;
import com.splitzy.splitzy.model.Expense;
import com.splitzy.splitzy.service.ExpenseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

    // Possibly more endpoints: update expense, delete expense, etc.
}
