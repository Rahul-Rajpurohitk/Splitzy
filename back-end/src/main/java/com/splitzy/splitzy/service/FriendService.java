package com.splitzy.splitzy.service;

import com.corundumstudio.socketio.SocketIOServer;
import com.splitzy.splitzy.dto.FriendDTO;
import com.splitzy.splitzy.dto.FriendRequestData;
import com.splitzy.splitzy.model.FriendRequest;
import com.splitzy.splitzy.model.FriendRequestStatus;
import com.splitzy.splitzy.model.User;
import com.splitzy.splitzy.repository.FriendRequestRepository;
import com.splitzy.splitzy.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class FriendService {

    private static final Logger logger = LoggerFactory.getLogger(FriendService.class);

    @Autowired
    private FriendRequestRepository friendRequestRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private SocketIOServer socketIOServer;

    public List<FriendDTO> getFriendDetails(String userId) {
        // 1) Load the main user
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // 2) Convert the friendIds set to a list
        List<String> friendIds = new ArrayList<>(user.getFriendIds());

        // 3) Find all friend users in one go
        List<User> friendUsers = userRepository.findAllById(friendIds);

        // 4) Build a list of DTOs (id + name)
        List<FriendDTO> friendList = new ArrayList<>();
        for (User friend : friendUsers) {
            friendList.add(new FriendDTO(friend.getId(), friend.getName()));
        }
        return friendList;
    }

    public FriendRequest sendFriendRequest(String senderId, String receiverId) {
        // Check if a request already exists
        FriendRequest existing = friendRequestRepository.findBySenderIdAndReceiverId(senderId, receiverId);
        if (existing != null && existing.getStatus() == FriendRequestStatus.PENDING) {
            throw new RuntimeException("Friend request already sent and is pending.");
        }

        logger.info("[FriendService] sendFriendRequest from {} to {}", senderId, receiverId);

        // Create a new request
        FriendRequest friendRequest = new FriendRequest();
        friendRequest.setSenderId(senderId);
        friendRequest.setReceiverId(receiverId);
        friendRequest.setStatus(FriendRequestStatus.PENDING);
        friendRequest.setCreatedAt(LocalDateTime.now());
        friendRequest.setUpdatedAt(LocalDateTime.now());
        FriendRequest savedRequest = friendRequestRepository.save(friendRequest);

        // send an email notification to the receiver
        User sender = userRepository.findById(senderId).orElseThrow();
        User receiver = userRepository.findById(receiverId).orElseThrow();
        emailService.sendFriendRequestNotification(receiver.getEmail(), sender.getName());
        logger.info("[FriendService] sendFriendRequest from {} to {}", sender.getEmail(), receiver.getEmail());

        // create a notification for the receiver
        String message = "You have a new friend request from " + sender.getName();
        notificationService.createNotification(receiverId, message, savedRequest.getId(), sender.getName(), sender.getId(), "FRIEND_REQUEST" );

        // In sendFriendRequest method:
        try {
            // Build and emit a Socket.IO event to the receiver's room (using their email)
            FriendRequestData data = new FriendRequestData();
            data.setType("FRIEND_REQUEST_SENT");
            data.setRequestId(savedRequest.getId());
            data.setSenderId(senderId);
            data.setReceiverId(receiverId);
            socketIOServer.getRoomOperations(receiver.getEmail()).sendEvent("friendRequest", data);
            logger.info("[FriendService] Socket.IO event sent to room: {}", receiver.getEmail());
        } catch (Exception e) {
            logger.error("[FriendService] Error sending WebSocket message: ", e);
        }

        return savedRequest;

    }

    public void acceptFriendRequest(String requestId, String receiverId) {



        FriendRequest friendRequest = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Friend request not found"));

        if (!friendRequest.getReceiverId().equals(receiverId)) {
            throw new RuntimeException("You are not authorized to accept this request.");
        }

        friendRequest.setStatus(FriendRequestStatus.ACCEPTED);
        friendRequest.setUpdatedAt(LocalDateTime.now());
        friendRequestRepository.save(friendRequest);

        // Add each user's ID to the other's friendIds
        User sender = userRepository.findById(friendRequest.getSenderId()).orElseThrow();
        User receiver = userRepository.findById(friendRequest.getReceiverId()).orElseThrow();

        logger.info("[FriendService] acceptFriendRequest for {} from {} to {}", requestId, sender.getEmail(),  receiver.getEmail());

        // Mark the notification as read or delete it
        notificationService.markAsReadByFriendRequestId(requestId);

        // Add to friend lists, etc.

        // 1) Identify the SENDER who might need a real-time update
        String senderId = friendRequest.getSenderId();

        // In acceptFriendRequest method:
        try {
            // Build and emit a Socket.IO event to the receiver's room (using their email)
            FriendRequestData data = new FriendRequestData();
            data.setType("FRIEND_REQUEST_ACCEPTED");
            data.setRequestId(requestId);
            data.setSenderId(senderId);
            data.setReceiverId(receiverId);
            socketIOServer.getRoomOperations(sender.getEmail()).sendEvent("friendRequest", data);
            socketIOServer.getRoomOperations(receiver.getEmail()).sendEvent("friendRequest", data);
            logger.info("[FriendService] Socket.IO event [FRIEND_REQUEST_ACCEPTED] sent to room: {}", sender.getEmail());
            logger.info("[FriendService] Socket.IO event [FRIEND_REQUEST_ACCEPTED] sent to room: {}", receiver.getEmail());
        } catch (Exception e) {
            logger.error("[FriendService] Error sending WebSocket messages: ", e);
        }


        if (!sender.getFriendIds().contains(receiver.getId())) {
            sender.getFriendIds().add(receiver.getId());
            userRepository.save(sender);
        }

        if (!receiver.getFriendIds().contains(sender.getId())) {
            receiver.getFriendIds().add(sender.getId());
            userRepository.save(receiver);
        }


    }

    public void rejectFriendRequest(String requestId, String receiverId) {
        FriendRequest friendRequest = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Friend request not found"));

        if (!friendRequest.getReceiverId().equals(receiverId)) {
            throw new RuntimeException("You are not authorized to reject this request.");
        }

        friendRequest.setStatus(FriendRequestStatus.REJECTED);
        friendRequest.setUpdatedAt(LocalDateTime.now());
        friendRequestRepository.save(friendRequest);
        notificationService.markAsReadByFriendRequestId(requestId);

        // Add each user's ID to the other's friendIds
        User sender = userRepository.findById(friendRequest.getSenderId()).orElseThrow();
        User receiver = userRepository.findById(friendRequest.getReceiverId()).orElseThrow();

        // Then notify the sender
        String senderId = friendRequest.getSenderId();

        try{
            // Build and emit a Socket.IO event to the receiver's room (using their email)
            FriendRequestData data = new FriendRequestData();
            data.setType("FRIEND_REQUEST_REJECTED");
            data.setRequestId(requestId);
            data.setSenderId(senderId);
            data.setReceiverId(receiverId);
            socketIOServer.getRoomOperations(sender.getEmail()).sendEvent("friendRequest", data);
            socketIOServer.getRoomOperations(receiver.getEmail()).sendEvent("friendRequest", data);

            logger.info("[FriendService] Socket.IO event [FRIEND_REQUEST_REJECTED] sent to room: {}", sender.getEmail());
            logger.info("[FriendService] Socket.IO event [FRIEND_REQUEST_REJECTED] sent to room: {}", receiver.getEmail());

        } catch (Exception e) {
            logger.error("[FriendService] Error sending WebSocket messages: ", e);
        }
    }

    public void unfriend(String userId1, String userId2) {
        User user1 = userRepository.findById(userId1)
                .orElseThrow(() -> new RuntimeException("User1 not found: " + userId1));
        User user2 = userRepository.findById(userId2)
                .orElseThrow(() -> new RuntimeException("User2 not found: " + userId2));

        user1.getFriendIds().remove(userId2);
        user2.getFriendIds().remove(userId1);

        userRepository.save(user1);
        userRepository.save(user2);



        try{

            // Build and emit a Socket.IO event to the receiver's room (using their email)
            FriendRequestData data = new FriendRequestData();
            data.setType("UNFRIEND");
            data.setSenderId(userId1);
            data.setReceiverId(userId2);
            socketIOServer.getRoomOperations(user1.getEmail()).sendEvent("friendRequest", data);
            socketIOServer.getRoomOperations(user2.getEmail()).sendEvent("friendRequest", data);
            logger.info("[FriendService] Socket.IO event sent [UNFRIEND] to room: {}", user1.getEmail());
            logger.info("[FriendService] Socket.IO event sent [UNFRIEND] to room: {}", user2.getEmail());
        } catch(Exception e){
            logger.error("[FriendService] Error sending WebSocket messages: ", e);
        }
    }
}
