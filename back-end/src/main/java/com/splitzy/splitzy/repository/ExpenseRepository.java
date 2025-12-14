package com.splitzy.splitzy.repository;

import org.springframework.context.annotation.Profile;
import com.splitzy.splitzy.model.Expense;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@Profile("!postgres")
public interface ExpenseRepository extends MongoRepository<Expense, String> {


    // 1) ALL: user is creator, payer, or participant
    @Query("{ $or: [ {'creatorId': ?0}, {'payers.userId': ?0}, {'participants.userId': ?0} ] }")
    List<Expense> findAllByUserInvolvement(String userId, Sort sort);

    // 2) Only where user is the creator
    @Query("{ 'creatorId': ?0 }")
    List<Expense> findAllByCreatorId(String userId, Sort sort);

    // 3) Only where user is a payer
    @Query("{ 'payers.userId': ?0 }")
    List<Expense> findAllByPayer(String userId, Sort sort);

    // 4) Only where user is a participant
    @Query("{ 'participants.userId': ?0 }")
    List<Expense> findAllByParticipant(String userId, Sort sort);

    // 5) Only where expense belongs to a specific group
    @Query("{ 'groupId': ?0 }")
    List<Expense> findAllByGroupId(String groupId, Sort sort);

    // 6) Only where both the current user and friend are involved
    @Query("{ $and: [ { $or: [ {'creatorId': ?0}, {'payers.userId': ?0}, {'participants.userId': ?0} ] }, { $or: [ {'creatorId': ?1}, {'payers.userId': ?1}, {'participants.userId': ?1} ] } ] }")
    List<Expense> findAllByBothUserInvolvement(String userId, String friendId, Sort sort);
}
