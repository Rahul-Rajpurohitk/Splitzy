package com.splitzy.splitzy.service.dao;

import java.util.List;
import java.util.Optional;

/**
 * Data Access Object interface for Notification operations.
 */
public interface NotificationDao {
    
    Optional<NotificationDto> findById(String id);
    
    List<NotificationDto> findByUserIdAndReadFalse(String userId);
    
    List<NotificationDto> findByUserId(String userId);
    
    List<NotificationDto> findByReferenceId(String referenceId);
    
    NotificationDto save(NotificationDto notification);
    
    void deleteById(String id);
    
    void deleteAll(List<NotificationDto> notifications);
}

