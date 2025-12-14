package com.splitzy.splitzy.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.GenericGenerator;

import java.util.HashMap;
import java.util.Map;

/**
 * SQL-backed ExpenseItem entity for itemized expenses.
 * Stored as a separate entity with a relationship to ExpenseSql.
 */
@Entity
@Table(name = "expense_items")
public class ExpenseItemSql {

    @Id
    @GeneratedValue(generator = "uuid2")
    @GenericGenerator(name = "uuid2", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(length = 36)
    private String id;

    private String name;
    private double amount;

    // Map of userId -> share fraction/amount
    @ElementCollection
    @CollectionTable(name = "expense_item_user_shares", joinColumns = @JoinColumn(name = "expense_item_id"))
    @MapKeyColumn(name = "user_id")
    @Column(name = "share_value")
    private Map<String, Double> userShares = new HashMap<>();

    public ExpenseItemSql() {}

    public ExpenseItemSql(String name, double amount, Map<String, Double> userShares) {
        this.name = name;
        this.amount = amount;
        this.userShares = userShares != null ? userShares : new HashMap<>();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public double getAmount() {
        return amount;
    }

    public void setAmount(double amount) {
        this.amount = amount;
    }

    public Map<String, Double> getUserShares() {
        return userShares;
    }

    public void setUserShares(Map<String, Double> userShares) {
        this.userShares = userShares;
    }
}

