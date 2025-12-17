package com.splitzy.splitzy.repository.sql;

import com.splitzy.splitzy.entity.ChatReadStateSql;
import org.springframework.context.annotation.Profile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
@Profile("postgres")
public interface ChatReadStateSqlRepository extends JpaRepository<ChatReadStateSql, String> {
    Optional<ChatReadStateSql> findByThreadIdAndUserId(String threadId, String userId);
}

