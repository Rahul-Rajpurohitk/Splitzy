package com.splitzy.splitzy.repository.sql;

import com.splitzy.splitzy.entity.GroupSql;
import org.springframework.context.annotation.Profile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

@Profile("postgres")
public interface GroupSqlRepository extends JpaRepository<GroupSql, String> {

    /**
     * Find groups where the user is the creator OR is a member.
     */
    @Query("SELECT g FROM GroupSql g WHERE g.creatorId = :userId OR :userId MEMBER OF g.memberIds")
    List<GroupSql> findByCreatorIdOrMemberId(@Param("userId") String userId);
}

