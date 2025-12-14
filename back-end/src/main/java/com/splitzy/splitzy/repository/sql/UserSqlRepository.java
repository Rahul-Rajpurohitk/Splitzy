package com.splitzy.splitzy.repository.sql;

import com.splitzy.splitzy.entity.UserSql;
import org.springframework.context.annotation.Profile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

@Profile("postgres")
public interface UserSqlRepository extends JpaRepository<UserSql, String> {
    Optional<UserSql> findByEmail(String email);
    boolean existsByEmail(String email);
}

