package com.splitzy.splitzy.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.splitzy.splitzy.model.ChatType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.GenericGenerator;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "chat_threads")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatThreadSql {

    @Id
    @GeneratedValue(generator = "uuid2")
    @GenericGenerator(name = "uuid2", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(length = 36)
    private String id;

    @Enumerated(EnumType.STRING)
    private ChatType type; // P2P or GROUP

    // For group chats, store the groupId. Null for P2P.
    private String groupId;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "chat_thread_participants", joinColumns = @JoinColumn(name = "thread_id"))
    @Column(name = "participant_id")
    private Set<String> participantIds = new HashSet<>();

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime lastMessageAt;
}

