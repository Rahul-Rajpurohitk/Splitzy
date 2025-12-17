package com.splitzy.splitzy.service.dao;

import org.springframework.data.domain.Sort;
import java.util.List;
import java.util.Optional;

/**
 * Data Access Object interface for Expense operations.
 */
public interface ExpenseDao {
    
    Optional<ExpenseDto> findById(String id);
    
    List<ExpenseDto> findAllByUserInvolvement(String userId, Sort sort);
    
    List<ExpenseDto> findAllByCreatorId(String creatorId, Sort sort);
    
    List<ExpenseDto> findAllByPayer(String userId, Sort sort);
    
    List<ExpenseDto> findAllByParticipant(String userId, Sort sort);
    
    List<ExpenseDto> findAllByGroupId(String groupId, Sort sort);
    
    List<ExpenseDto> findAllByBothUserInvolvement(String userId, String friendId, Sort sort);
    
    ExpenseDto save(ExpenseDto expense);
    
    void deleteById(String id);
}

