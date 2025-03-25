package com.splitzy.splitzy.repository;

import com.splitzy.splitzy.model.Expense;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExpenseRepository extends MongoRepository<Expense, String> {


    // 1) ALL: user is creator, payer, or participant
    @Query("{ $or: [ {'creatorId': ?0}, {'payers.userId': ?0}, {'participants.userId': ?0} ] }")
    List<Expense> findAllByUserInvolvement(String userId, org.springframework.data.domain.Sort sort);

    // 2) Only where user is the creator
    @Query("{ 'creatorId': ?0 }")
    List<Expense> findAllByCreatorId(String userId, org.springframework.data.domain.Sort sort);

    // 3) Only where user is a payer
    @Query("{ 'payers.userId': ?0 }")
    List<Expense> findAllByPayer(String userId, org.springframework.data.domain.Sort sort);

    // 4) Only where user is a participant
    @Query("{ 'participants.userId': ?0 }")
    List<Expense> findAllByParticipant(String userId, org.springframework.data.domain.Sort sort);
}
