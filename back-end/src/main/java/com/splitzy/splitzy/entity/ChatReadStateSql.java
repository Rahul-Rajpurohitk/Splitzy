package com.splitzy.splitzy.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.GenericGenerator;

import java.time.LocalDateTime;

@Entity
@Table(name = "chat_read_state")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatReadStateSql {

    @Id
    @GeneratedValue(generator = "uuid2")
    @GenericGenerator(name = "uuid2", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(length = 36)
    private String id;

    @Column(length = 36, nullable = false)
    private String threadId;

    @Column(length = 36, nullable = false)
    private String userId;

    private LocalDateTime lastReadAt;
}

