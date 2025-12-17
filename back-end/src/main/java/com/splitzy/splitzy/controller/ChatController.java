package com.splitzy.splitzy.controller;

import com.splitzy.splitzy.entity.ChatMessageSql;
import com.splitzy.splitzy.entity.ChatThreadSql;
import com.splitzy.splitzy.service.ChatService;
import com.splitzy.splitzy.service.dao.UserDao;
import com.splitzy.splitzy.service.dao.UserDto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/chat")
public class ChatController {

    @Autowired
    private ChatService chatService;
    @Autowired
    private UserDao userDao;

    // List threads for current user
    @GetMapping("/threads")
    public List<Map<String, Object>> getThreads(Authentication auth) {
        String userId = getUserId(auth);
        return chatService.getThreadsForUser(userId).stream()
                .map(t -> chatService.toThreadSummary(t, userId))
                .collect(Collectors.toList());
    }

    // Create or get P2P thread with a friend
    @PostMapping("/threads/p2p")
    public ChatThreadSql createP2P(Authentication auth, @RequestBody Map<String, String> body) {
        String userId = getUserId(auth);
        String friendId = body.get("friendId");
        return chatService.createOrGetP2P(userId, friendId);
    }

    // Create or get group thread
    @PostMapping("/threads/group")
    public ResponseEntity<?> createGroup(Authentication auth, @RequestBody Map<String, String> body) {
        String userId = getUserId(auth);
        String groupId = body.get("groupId");
        if (groupId == null || groupId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "groupId is required"));
        }
        try {
            ChatThreadSql thread = chatService.createOrGetGroupThread(userId, groupId);
            return ResponseEntity.ok(thread);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // Fetch messages
    @GetMapping("/messages/{threadId}")
    public List<ChatMessageSql> getMessages(Authentication auth,
                                            @PathVariable String threadId,
                                            @RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "50") int size) {
        String userId = getUserId(auth);
        return chatService.getMessages(threadId, userId, page, size);
    }

    // Post a message (with optional reply)
    @PostMapping("/messages/{threadId}")
    public ChatMessageSql postMessage(Authentication auth,
                                      @PathVariable String threadId,
                                      @RequestBody Map<String, String> body) {
        String userId = getUserId(auth);
        String content = body.get("content");
        String replyToId = body.get("replyToId");
        return chatService.postMessage(threadId, userId, content, replyToId);
    }

    // Mark read
    @PostMapping("/read/{threadId}")
    public ResponseEntity<?> markRead(Authentication auth, @PathVariable String threadId) {
        String userId = getUserId(auth);
        chatService.markRead(threadId, userId);
        return ResponseEntity.ok().build();
    }

    // Share expense to a single thread
    @PostMapping("/share-expense/{threadId}")
    public ResponseEntity<?> shareExpense(Authentication auth,
                                          @PathVariable String threadId,
                                          @RequestBody Map<String, String> body) {
        String userId = getUserId(auth);
        String expenseId = body.get("expenseId");
        String message = body.get("message");
        if (expenseId == null || expenseId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "expenseId is required"));
        }
        try {
            ChatMessageSql msg = chatService.shareExpense(threadId, userId, expenseId, message);
            return ResponseEntity.ok(msg);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // Share expense to multiple threads
    @PostMapping("/share-expense-bulk")
    public ResponseEntity<?> shareExpenseBulk(Authentication auth, @RequestBody Map<String, Object> body) {
        String userId = getUserId(auth);
        String expenseId = (String) body.get("expenseId");
        String message = (String) body.get("message");
        @SuppressWarnings("unchecked")
        List<String> threadIds = (List<String>) body.get("threadIds");
        
        if (expenseId == null || expenseId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "expenseId is required"));
        }
        if (threadIds == null || threadIds.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "threadIds are required"));
        }
        
        List<ChatMessageSql> results = chatService.shareExpenseToMultiple(userId, expenseId, threadIds, message);
        return ResponseEntity.ok(Map.of("shared", results.size(), "messages", results));
    }

    private String getUserId(Authentication auth) {
        String email = auth.getName();
        UserDto user = userDao.findByEmail(email).orElseThrow();
        return user.getId();
    }
}

