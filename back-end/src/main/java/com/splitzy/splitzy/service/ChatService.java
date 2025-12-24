package com.splitzy.splitzy.service;

import com.corundumstudio.socketio.SocketIOServer;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.splitzy.splitzy.entity.ChatMessageSql;
import com.splitzy.splitzy.entity.ChatReadStateSql;
import com.splitzy.splitzy.entity.ChatThreadSql;
import com.splitzy.splitzy.model.ChatType;
import com.splitzy.splitzy.service.dao.*;
import com.splitzy.splitzy.repository.sql.ChatMessageSqlRepository;
import com.splitzy.splitzy.repository.sql.ChatReadStateSqlRepository;
import com.splitzy.splitzy.repository.sql.ChatThreadSqlRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Profile("postgres")
public class ChatService {

    private final ChatThreadSqlRepository threadRepo;
    private final ChatMessageSqlRepository messageRepo;
    private final ChatReadStateSqlRepository readRepo;
    private final UserDao userDao;
    private final GroupDao groupDao;
    private final ExpenseDao expenseDao;
    private final SocketIOServer socketIOServer;
    private final ObjectMapper objectMapper;

    public ChatService(ChatThreadSqlRepository threadRepo,
                       ChatMessageSqlRepository messageRepo,
                       ChatReadStateSqlRepository readRepo,
                       UserDao userDao,
                       GroupDao groupDao,
                       ExpenseDao expenseDao,
                       SocketIOServer socketIOServer,
                       ObjectMapper objectMapper) {
        this.threadRepo = threadRepo;
        this.messageRepo = messageRepo;
        this.readRepo = readRepo;
        this.userDao = userDao;
        this.groupDao = groupDao;
        this.expenseDao = expenseDao;
        this.socketIOServer = socketIOServer;
        this.objectMapper = objectMapper;
    }

    // --- Threads ---
    @Transactional
    public ChatThreadSql createOrGetP2P(String userId, String friendId) {
        // Verify friendship
        UserDto user = userDao.findById(userId).orElseThrow();
        if (!user.getFriendIds().contains(friendId)) {
            throw new RuntimeException("Not friends");
        }

        // Try to find existing
        List<ChatThreadSql> candidates = threadRepo.findByTypeAndParticipantIdsContaining(ChatType.P2P, userId);
        for (ChatThreadSql t : candidates) {
            if (t.getParticipantIds().contains(friendId) && t.getType() == ChatType.P2P) {
                return t;
            }
        }

        ChatThreadSql thread = new ChatThreadSql();
        thread.setType(ChatType.P2P);
        thread.setParticipantIds(new HashSet<>(Arrays.asList(userId, friendId)));
        thread.setLastMessageAt(LocalDateTime.now());
        return threadRepo.save(thread);
    }

    @Transactional
    public ChatThreadSql createOrGetGroupThread(String userId, String groupId) {
        System.out.println("[ChatService] createOrGetGroupThread called with userId=" + userId + ", groupId=" + groupId);
        
        // Verify group exists
        GroupDto group = groupDao.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found: " + groupId));
        
        System.out.println("[ChatService] Found group: " + group.getGroupName() + ", creatorId=" + group.getCreatorId());
        
        // Extract member IDs from the friends list
        Set<String> members = new HashSet<>();
        if (group.getFriends() != null) {
            group.getFriends().forEach(m -> members.add(m.getId()));
            System.out.println("[ChatService] Group has " + group.getFriends().size() + " friends/members");
        }
        // Always include creator
        members.add(group.getCreatorId());
        
        System.out.println("[ChatService] Total members for chat: " + members.size() + ", checking if " + userId + " is a member");
        
        if (!members.contains(userId)) {
            throw new RuntimeException("Not a group member. User " + userId + " not in members: " + members);
        }

        List<ChatThreadSql> existing = threadRepo.findByGroupId(groupId);
        if (!existing.isEmpty()) {
            System.out.println("[ChatService] Found existing thread: " + existing.get(0).getId());
            return existing.get(0);
        }

        ChatThreadSql thread = new ChatThreadSql();
        thread.setType(ChatType.GROUP);
        thread.setGroupId(groupId);
        thread.setParticipantIds(members);
        thread.setLastMessageAt(LocalDateTime.now());
        ChatThreadSql saved = threadRepo.save(thread);
        System.out.println("[ChatService] Created new group thread: " + saved.getId());
        return saved;
    }

    public List<ChatThreadSql> getThreadsForUser(String userId) {
        return threadRepo.findByParticipantIdsContaining(userId);
    }

    public Optional<ChatThreadSql> getThreadForUser(String threadId, String userId) {
        return threadRepo.findById(threadId)
                .filter(t -> t.getParticipantIds().contains(userId));
    }

    // --- Messages ---
    @Transactional
    public ChatMessageSql postMessage(String threadId, String senderId, String content) {
        return postMessage(threadId, senderId, content, null);
    }

    @Transactional
    public ChatMessageSql postMessage(String threadId, String senderId, String content, String replyToId) {
        ChatThreadSql thread = threadRepo.findById(threadId).orElseThrow();
        if (!thread.getParticipantIds().contains(senderId)) {
            throw new RuntimeException("Not a participant");
        }

        ChatMessageSql msg = new ChatMessageSql();
        msg.setThreadId(threadId);
        msg.setSenderId(senderId);
        msg.setSenderName(userDao.findById(senderId).map(UserDto::getName).orElse("Unknown"));
        msg.setMessageType(ChatMessageSql.MessageType.TEXT);
        msg.setContent(content);
        msg.setCreatedAt(LocalDateTime.now());

        // Handle reply reference
        if (replyToId != null && !replyToId.isEmpty()) {
            messageRepo.findById(replyToId).ifPresent(parentMsg -> {
                msg.setReplyToId(replyToId);
                msg.setReplyToSenderName(parentMsg.getSenderName());
                // Truncate content for preview
                String preview = parentMsg.getContent();
                if (parentMsg.getMessageType() == ChatMessageSql.MessageType.EXPENSE_SHARE) {
                    preview = "💰 Shared an expense";
                } else if (preview != null && preview.length() > 100) {
                    preview = preview.substring(0, 100) + "...";
                }
                msg.setReplyToContent(preview);
            });
        }

        ChatMessageSql saved = messageRepo.save(msg);

        thread.setLastMessageAt(saved.getCreatedAt());
        threadRepo.save(thread);

        broadcastMessage(threadId, saved);
        return saved;
    }

    @Transactional
    public ChatMessageSql shareExpense(String threadId, String senderId, String expenseId, String message) {
        ChatThreadSql thread = threadRepo.findById(threadId).orElseThrow();
        if (!thread.getParticipantIds().contains(senderId)) {
            throw new RuntimeException("Not a participant");
        }

        // Fetch expense and create snapshot
        ExpenseDto expense = expenseDao.findById(expenseId)
                .orElseThrow(() -> new RuntimeException("Expense not found"));

        // Build expense snapshot as JSON
        String expenseSnapshot;
        try {
            Map<String, Object> snapshot = new HashMap<>();
            snapshot.put("id", expense.getId());
            snapshot.put("description", expense.getDescription());
            snapshot.put("totalAmount", expense.getTotalAmount());
            snapshot.put("category", expense.getCategory());
            snapshot.put("date", expense.getDate());
            snapshot.put("splitMethod", expense.getSplitMethod());
            snapshot.put("creatorName", expense.getCreatorName());
            snapshot.put("participants", expense.getParticipants());
            expenseSnapshot = objectMapper.writeValueAsString(snapshot);
        } catch (Exception e) {
            expenseSnapshot = "{}";
        }

        ChatMessageSql msg = new ChatMessageSql();
        msg.setThreadId(threadId);
        msg.setSenderId(senderId);
        msg.setSenderName(userDao.findById(senderId).map(UserDto::getName).orElse("Unknown"));
        msg.setMessageType(ChatMessageSql.MessageType.EXPENSE_SHARE);
        msg.setContent(message != null && !message.isEmpty() ? message : "Shared an expense");
        msg.setExpenseId(expenseId);
        msg.setExpenseSnapshot(expenseSnapshot);
        msg.setCreatedAt(LocalDateTime.now());
        ChatMessageSql saved = messageRepo.save(msg);

        thread.setLastMessageAt(saved.getCreatedAt());
        threadRepo.save(thread);

        broadcastMessage(threadId, saved);
        return saved;
    }

    // Share expense to multiple threads at once
    @Transactional
    public List<ChatMessageSql> shareExpenseToMultiple(String senderId, String expenseId, List<String> threadIds, String message) {
        List<ChatMessageSql> results = new ArrayList<>();
        for (String threadId : threadIds) {
            try {
                results.add(shareExpense(threadId, senderId, expenseId, message));
            } catch (Exception e) {
                System.err.println("Failed to share expense to thread " + threadId + ": " + e.getMessage());
            }
        }
        return results;
    }

    public List<ChatMessageSql> getMessages(String threadId, String userId, int page, int size) {
        ChatThreadSql thread = threadRepo.findById(threadId).orElseThrow();
        if (!thread.getParticipantIds().contains(userId)) {
            throw new RuntimeException("Not a participant");
        }
        PageRequest pr = PageRequest.of(page, size);
        return messageRepo.findByThreadIdOrderByCreatedAtDesc(threadId, pr);
    }

    // --- Read state ---
    @Transactional
    public void markRead(String threadId, String userId) {
        ChatThreadSql thread = threadRepo.findById(threadId).orElseThrow();
        if (!thread.getParticipantIds().contains(userId)) {
            throw new RuntimeException("Not a participant");
        }
        ChatReadStateSql state = readRepo.findByThreadIdAndUserId(threadId, userId)
                .orElseGet(ChatReadStateSql::new);
        state.setThreadId(threadId);
        state.setUserId(userId);
        state.setLastReadAt(LocalDateTime.now());
        readRepo.save(state);
        broadcastRead(threadId, userId);
    }

    public Map<String, Object> toThreadSummary(ChatThreadSql t, String userId) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", t.getId());
        map.put("type", t.getType());
        map.put("groupId", t.getGroupId());
        map.put("participantIds", t.getParticipantIds());
        map.put("lastMessageAt", t.getLastMessageAt());
        // unread: count messages after lastReadAt
        LocalDateTime lastRead = readRepo.findByThreadIdAndUserId(t.getId(), userId)
                .map(ChatReadStateSql::getLastReadAt).orElse(LocalDateTime.MIN);
        int unread = (int) messageRepo.findByThreadIdOrderByCreatedAtDesc(t.getId(), PageRequest.of(0, 200))
                .stream()
                .filter(m -> m.getCreatedAt() != null && m.getCreatedAt().isAfter(lastRead))
                .count();
        map.put("unread", unread);
        return map;
    }

    // --- Broadcasting helpers ---
    private void broadcastMessage(String threadId, ChatMessageSql msg) {
        if (socketIOServer == null) return;
        
        // Send to thread room (for users who have the chat window open)
        socketIOServer.getRoomOperations("thread:" + threadId).sendEvent("chat:new_message", msg);
        
        // Also send to each participant's email room (for notification badges)
        // This ensures users get notified even if they don't have the chat window open
        threadRepo.findById(threadId).ifPresent(thread -> {
            for (String participantId : thread.getParticipantIds()) {
                // Don't notify the sender
                if (!participantId.equals(msg.getSenderId())) {
                    userDao.findById(participantId).ifPresent(user -> {
                        socketIOServer.getRoomOperations(user.getEmail()).sendEvent("chat:notification", msg);
                    });
                }
            }
        });
    }

    private void broadcastRead(String threadId, String userId) {
        if (socketIOServer == null) return;
        Map<String, String> payload = new HashMap<>();
        payload.put("threadId", threadId);
        payload.put("userId", userId);
        socketIOServer.getRoomOperations("thread:" + threadId).sendEvent("chat:read", payload);
    }
}

