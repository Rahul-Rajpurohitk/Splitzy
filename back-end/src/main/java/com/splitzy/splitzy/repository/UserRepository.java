package com.splitzy.splitzy.repository;
import com.splitzy.splitzy.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmail(String email);
    // Spring Data gives you standard CRUD methods automatically
    Optional<User> findByVerificationToken(String verificationToken);


    // 1) Partial match on "name" using a regular expression
    List<User> findByNameRegex(String regex);

    // 2) Partial match on "email" using a regular expression
    List<User> findByEmailRegex(String regex);

    // A custom query that does it all in one shot:
    @Query("{ '_id': { $in: ?0 }, $or: [ { 'name': { $regex: ?1, $options: 'i' } }, { 'email': { $regex: ?1, $options: 'i' } } ] }")
    List<User> findFriendsByRegex(Set<String> friendIds, String regex);

}
