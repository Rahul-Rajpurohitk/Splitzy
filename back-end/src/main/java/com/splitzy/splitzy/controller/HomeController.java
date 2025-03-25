package com.splitzy.splitzy.controller;

import com.splitzy.splitzy.dto.FriendDTO;
import com.splitzy.splitzy.model.FriendRequest;
import com.splitzy.splitzy.service.FriendService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/home") // All endpoints start with /home
public class HomeController {

    @Autowired
    private FriendService friendService;

    @GetMapping
    public ResponseEntity<String> homeData() {
        // If we reach here, user has a valid JWT (i.e., is authenticated).
        // Return a 200 OK with the body "Authorized".
        return ResponseEntity.ok("Authorized");
    }

    @GetMapping("/friends")
    public List<FriendDTO> getFriendIds(@RequestParam String userId) {
        // Delegate to the service
        return friendService.getFriendDetails(userId);
    }



    // Now we move the /friends endpoints under /home/friends
    @PostMapping("/friends/request")
    public FriendRequest sendFriendRequest(@RequestParam String senderId, @RequestParam String receiverId) {
        return friendService.sendFriendRequest(senderId, receiverId);
    }

    @PatchMapping("/friends/unfriend")
    public void unfriend(@RequestParam String userId1, @RequestParam String userId2) {
        friendService.unfriend(userId1, userId2);
    }

    @PatchMapping("/friends/request/{requestId}/accept")
    public void acceptFriendRequest(@PathVariable String requestId, @RequestParam String receiverId) {
        friendService.acceptFriendRequest(requestId, receiverId);
    }

    @PatchMapping("/friends/request/{requestId}/reject")
    public void rejectFriendRequest(@PathVariable String requestId, @RequestParam String receiverId) {
        friendService.rejectFriendRequest(requestId, receiverId);
    }


}
