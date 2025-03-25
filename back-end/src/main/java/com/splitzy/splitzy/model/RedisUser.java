package com.splitzy.splitzy.model;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.springframework.data.annotation.Id;

import java.io.Serializable;

@Data
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class RedisUser implements Serializable {

    @Id
    private String name;
    private String email;
    private String password;
    private String verificationToken;

}

