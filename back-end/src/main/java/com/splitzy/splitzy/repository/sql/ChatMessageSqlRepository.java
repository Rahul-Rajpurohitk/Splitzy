package com.splitzy.splitzy.repository.sql;

import com.splitzy.splitzy.entity.ChatMessageSql;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@Profile("postgres")
public interface ChatMessageSqlRepository extends JpaRepository<ChatMessageSql, String> {
    List<ChatMessageSql> findByThreadIdOrderByCreatedAtDesc(String threadId, Pageable pageable);
}

