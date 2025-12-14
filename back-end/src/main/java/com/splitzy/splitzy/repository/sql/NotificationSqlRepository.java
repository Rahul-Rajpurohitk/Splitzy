package com.splitzy.splitzy.repository.sql;

import com.splitzy.splitzy.entity.NotificationSql;
import org.springframework.context.annotation.Profile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

@Profile("postgres")
public interface NotificationSqlRepository extends JpaRepository<NotificationSql, String> {

    /**
     * Fetch all unread notifications for a user
     */
    List<NotificationSql> findByUserIdAndReadFalse(String userId);

    /**
     * Fetch all notifications for a user (read or unread)
     */
    List<NotificationSql> findByUserId(String userId);

    /**
     * Find notifications by referenceId (e.g., friendRequestId, expenseId)
     */
    List<NotificationSql> findByReferenceId(String referenceId);
}

