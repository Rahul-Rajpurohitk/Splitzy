package com.splitzy.splitzy.service.dao;

import java.util.List;
import java.util.Optional;

/**
 * Data Access Object interface for Group operations.
 */
public interface GroupDao {
    
    Optional<GroupDto> findById(String id);
    
    List<GroupDto> findByCreatorIdOrMemberId(String userId);
    
    List<GroupDto> findAll();
    
    GroupDto save(GroupDto group);
    
    void deleteById(String id);
}

