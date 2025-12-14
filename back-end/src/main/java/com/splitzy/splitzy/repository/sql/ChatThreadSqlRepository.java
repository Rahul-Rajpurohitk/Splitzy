package com.splitzy.splitzy.repository.sql;

import com.splitzy.splitzy.entity.ChatThreadSql;
import com.splitzy.splitzy.model.ChatType;
import org.springframework.context.annotation.Profile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@Profile("postgres")
public interface ChatThreadSqlRepository extends JpaRepository<ChatThreadSql, String> {
    List<ChatThreadSql> findByParticipantIdsContaining(String userId);
    List<ChatThreadSql> findByTypeAndParticipantIdsContaining(ChatType type, String userId);
    List<ChatThreadSql> findByGroupId(String groupId);
}

