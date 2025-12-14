package com.splitzy.splitzy.repository.sql;

import com.splitzy.splitzy.entity.ExpenseSql;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

@Profile("postgres")
public interface ExpenseSqlRepository extends JpaRepository<ExpenseSql, String> {

    /**
     * ALL: user is creator, payer, or participant
     */
    @Query("SELECT DISTINCT e FROM ExpenseSql e " +
           "LEFT JOIN e.payers p " +
           "LEFT JOIN e.participants pt " +
           "WHERE e.creatorId = :userId OR p.userId = :userId OR pt.userId = :userId")
    List<ExpenseSql> findAllByUserInvolvement(@Param("userId") String userId, Sort sort);

    /**
     * User involvement with date range filter
     */
    @Query("SELECT DISTINCT e FROM ExpenseSql e " +
           "LEFT JOIN e.payers p " +
           "LEFT JOIN e.participants pt " +
           "WHERE (e.creatorId = :userId OR p.userId = :userId OR pt.userId = :userId) " +
           "AND e.date BETWEEN :startDate AND :endDate")
    List<ExpenseSql> findAllByUserInvolvementAndDateRange(
        @Param("userId") String userId,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate,
        Sort sort);

    /**
     * Only where user is the creator
     */
    List<ExpenseSql> findAllByCreatorId(String creatorId, Sort sort);

    /**
     * Only where user is a payer
     */
    @Query("SELECT DISTINCT e FROM ExpenseSql e JOIN e.payers p WHERE p.userId = :userId")
    List<ExpenseSql> findAllByPayer(@Param("userId") String userId, Sort sort);

    /**
     * Only where user is a participant
     */
    @Query("SELECT DISTINCT e FROM ExpenseSql e JOIN e.participants pt WHERE pt.userId = :userId")
    List<ExpenseSql> findAllByParticipant(@Param("userId") String userId, Sort sort);

    /**
     * Only where expense belongs to a specific group
     */
    List<ExpenseSql> findAllByGroupId(String groupId, Sort sort);

    /**
     * Group expenses with date range
     */
    @Query("SELECT e FROM ExpenseSql e WHERE e.groupId = :groupId AND e.date BETWEEN :startDate AND :endDate")
    List<ExpenseSql> findAllByGroupIdAndDateRange(
        @Param("groupId") String groupId,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate,
        Sort sort);

    /**
     * Only where both the current user and friend are involved
     */
    @Query("SELECT DISTINCT e FROM ExpenseSql e " +
           "LEFT JOIN e.payers p1 " +
           "LEFT JOIN e.payers p2 " +
           "LEFT JOIN e.participants pt1 " +
           "LEFT JOIN e.participants pt2 " +
           "WHERE (e.creatorId = :userId OR p1.userId = :userId OR pt1.userId = :userId) " +
           "AND (e.creatorId = :friendId OR p2.userId = :friendId OR pt2.userId = :friendId)")
    List<ExpenseSql> findAllByBothUserInvolvement(@Param("userId") String userId, 
                                                   @Param("friendId") String friendId, 
                                                   Sort sort);

    /**
     * Count expenses by user involvement
     */
    @Query("SELECT COUNT(DISTINCT e) FROM ExpenseSql e " +
           "LEFT JOIN e.payers p " +
           "LEFT JOIN e.participants pt " +
           "WHERE e.creatorId = :userId OR p.userId = :userId OR pt.userId = :userId")
    long countByUserInvolvement(@Param("userId") String userId);

    /**
     * Count expenses in date range
     */
    @Query("SELECT COUNT(DISTINCT e) FROM ExpenseSql e " +
           "LEFT JOIN e.payers p " +
           "LEFT JOIN e.participants pt " +
           "WHERE (e.creatorId = :userId OR p.userId = :userId OR pt.userId = :userId) " +
           "AND e.date BETWEEN :startDate AND :endDate")
    long countByUserInvolvementAndDateRange(
        @Param("userId") String userId,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate);

    /**
     * Get distinct categories used by user
     */
    @Query("SELECT DISTINCT e.category FROM ExpenseSql e " +
           "LEFT JOIN e.payers p " +
           "LEFT JOIN e.participants pt " +
           "WHERE (e.creatorId = :userId OR p.userId = :userId OR pt.userId = :userId) " +
           "AND e.category IS NOT NULL")
    List<String> findDistinctCategoriesByUser(@Param("userId") String userId);

    /**
     * Get distinct group IDs for user
     */
    @Query("SELECT DISTINCT e.groupId FROM ExpenseSql e " +
           "LEFT JOIN e.payers p " +
           "LEFT JOIN e.participants pt " +
           "WHERE (e.creatorId = :userId OR p.userId = :userId OR pt.userId = :userId) " +
           "AND e.groupId IS NOT NULL")
    List<String> findDistinctGroupIdsByUser(@Param("userId") String userId);

    /**
     * Sum total amount for user in date range
     */
    @Query("SELECT COALESCE(SUM(e.totalAmount), 0) FROM ExpenseSql e " +
           "LEFT JOIN e.payers p " +
           "LEFT JOIN e.participants pt " +
           "WHERE (e.creatorId = :userId OR p.userId = :userId OR pt.userId = :userId) " +
           "AND e.date BETWEEN :startDate AND :endDate")
    double sumTotalAmountByUserAndDateRange(
        @Param("userId") String userId,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate);

    /**
     * Find recent expenses (limited)
     */
    @Query("SELECT DISTINCT e FROM ExpenseSql e " +
           "LEFT JOIN e.payers p " +
           "LEFT JOIN e.participants pt " +
           "WHERE e.creatorId = :userId OR p.userId = :userId OR pt.userId = :userId " +
           "ORDER BY e.date DESC, e.createdAt DESC")
    List<ExpenseSql> findRecentByUserInvolvement(@Param("userId") String userId);
}

