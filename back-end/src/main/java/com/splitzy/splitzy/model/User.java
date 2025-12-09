package com.splitzy.splitzy.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;


import java.util.HashSet;
import java.util.Set;

@Document(collection = "userTable") // Tells Spring Data this is a MongoDB document
@Data // Generates getters, setters, toString, equals, and hashCode
@NoArgsConstructor // Generates a no-argument constructor
@AllArgsConstructor // Generates a constructor with all fields
@CompoundIndexes({
        // Example of a compound index that helps with searching name & email
        @CompoundIndex(name = "name_email_idx", def = "{'name': 1, 'email': 1}")
})
public class User {

    @Id
    private String id;
    private String name;
    private String email;
    private String password;
    private String verificationToken; // For email verification
    private boolean verified; // To check if the user is verified

    private Set<String> friendIds = new HashSet<>();
    private Set<String> groupIds = new HashSet<>();

}
