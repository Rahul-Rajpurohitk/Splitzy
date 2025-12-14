package com.splitzy.splitzy.service;

import com.corundumstudio.socketio.SocketIOServer;
import com.splitzy.splitzy.dto.FriendDTO;
import com.splitzy.splitzy.dto.FriendRequestData;
import com.splitzy.splitzy.model.FriendRequest;
import com.splitzy.splitzy.model.FriendRequestStatus;
import com.splitzy.splitzy.model.User;
import com.splitzy.splitzy.service.dao.FriendRequestDao;
import com.splitzy.splitzy.service.dao.FriendRequestDto;
import com.splitzy.splitzy.service.dao.UserDao;
import com.splitzy.splitzy.service.dao.UserDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class FriendService {

    private static final Logger logger = LoggerFactory.getLogger(FriendService.class);

    @Autowired
    private FriendRequestDao friendRequestDao;

    @Autowired
    private UserDao userDao;

    @Autowired
    private EmailService emailService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private SocketIOServer socketIOServer;

    public List<FriendDTO> getFriendDetails(String userId) {
        // 1) Load the main user
        UserDto user = userDao.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // 2) Convert the friendIds set to a list
        List<String> friendIds = new ArrayList<>(user.getFriendIds());

        // 3) Find all friend users in one go
        List<UserDto> friendUsers = userDao.findAllById(friendIds);

        // 4) Build a list of DTOs (id + name)
        List<FriendDTO> friendList = new ArrayList<>();
        for (UserDto friend : friendUsers) {
            friendList.add(new FriendDTO(friend.getId(), friend.getName()));
        }
        return friendList;
    }

    public FriendRequest sendFriendRequest(String senderId, String receiverId) {
        // Check if a request already exists
        FriendRequestDto existingDto = friendRequestDao.findBySenderIdAndReceiverId(senderId, receiverId);
        if (existingDto != null && existingDto.getStatus() == FriendRequestStatus.PENDING) {
            throw new RuntimeException("Friend request already sent and is pending.");
        }

        logger.info("[FriendService] sendFriendRequest from {} to {}", senderId, receiverId);

        // Create a new request
        FriendRequestDto friendRequestDto = new FriendRequestDto();
        friendRequestDto.setSenderId(senderId);
        friendRequestDto.setReceiverId(receiverId);
        friendRequestDto.setStatus(FriendRequestStatus.PENDING);
        friendRequestDto.setCreatedAt(LocalDateTime.now());
        friendRequestDto.setUpdatedAt(LocalDateTime.now());
        FriendRequestDto savedDto = friendRequestDao.save(friendRequestDto);

        // send an email notification to the receiver
        UserDto sender = userDao.findById(senderId).orElseThrow();
        UserDto receiver = userDao.findById(receiverId).orElseThrow();
        emailService.sendFriendRequestNotification(receiver.getEmail(), sender.getName());
        logger.info("[FriendService] sendFriendRequest from {} to {}", sender.getEmail(), receiver.getEmail());

        // create a notification for the receiver
        String message = "You have a new friend request from " + sender.getName();
        notificationService.createNotification(receiverId, message, savedDto.getId(), sender.getName(), sender.getId(), "FRIEND_REQUEST" );

        // In sendFriendRequest method:
        try {
            // Build and emit a Socket.IO event to the receiver's room (using their email)
            FriendRequestData data = new FriendRequestData();
            data.setType("FRIEND_REQUEST_SENT");
            data.setRequestId(savedDto.getId());
            data.setSenderId(senderId);
            data.setReceiverId(receiverId);
            socketIOServer.getRoomOperations(receiver.getEmail()).sendEvent("friendRequest", data);
            logger.info("[FriendService] Socket.IO event sent to room: {}", receiver.getEmail());
        } catch (Exception e) {
            logger.error("[FriendService] Error sending WebSocket message: ", e);
        }

        return toFriendRequest(savedDto);
    }

    public void acceptFriendRequest(String requestId, String receiverId) {
        FriendRequestDto friendRequestDto = friendRequestDao.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Friend request not found"));

        if (!friendRequestDto.getReceiverId().equals(receiverId)) {
            throw new RuntimeException("You are not authorized to accept this request.");
        }

        friendRequestDto.setStatus(FriendRequestStatus.ACCEPTED);
        friendRequestDto.setUpdatedAt(LocalDateTime.now());
        friendRequestDao.save(friendRequestDto);

        // Add each user's ID to the other's friendIds
        UserDto sender = userDao.findById(friendRequestDto.getSenderId()).orElseThrow();
        UserDto receiver = userDao.findById(friendRequestDto.getReceiverId()).orElseThrow();

        logger.info("[FriendService] acceptFriendRequest for {} from {} to {}", requestId, sender.getEmail(), receiver.getEmail());

        // Mark the notification as read or delete it
        notificationService.markAsReadByFriendRequestId(requestId);

        // Add to friend lists, etc.

        // 1) Identify the SENDER who might need a real-time update
        String senderId = friendRequestDto.getSenderId();

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
            userDao.save(sender);
        }

        if (!receiver.getFriendIds().contains(sender.getId())) {
            receiver.getFriendIds().add(sender.getId());
            userDao.save(receiver);
        }
    }

    public void rejectFriendRequest(String requestId, String receiverId) {
        FriendRequestDto friendRequestDto = friendRequestDao.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Friend request not found"));

        if (!friendRequestDto.getReceiverId().equals(receiverId)) {
            throw new RuntimeException("You are not authorized to reject this request.");
        }

        friendRequestDto.setStatus(FriendRequestStatus.REJECTED);
        friendRequestDto.setUpdatedAt(LocalDateTime.now());
        friendRequestDao.save(friendRequestDto);
        notificationService.markAsReadByFriendRequestId(requestId);

        // Add each user's ID to the other's friendIds
        UserDto sender = userDao.findById(friendRequestDto.getSenderId()).orElseThrow();
        UserDto receiver = userDao.findById(friendRequestDto.getReceiverId()).orElseThrow();

        // Then notify the sender
        String senderId = friendRequestDto.getSenderId();

        try {
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
        UserDto user1 = userDao.findById(userId1)
                .orElseThrow(() -> new RuntimeException("User1 not found: " + userId1));
        UserDto user2 = userDao.findById(userId2)
                .orElseThrow(() -> new RuntimeException("User2 not found: " + userId2));

        user1.getFriendIds().remove(userId2);
        user2.getFriendIds().remove(userId1);

        userDao.save(user1);
        userDao.save(user2);

        try {
            // Build and emit a Socket.IO event to the receiver's room (using their email)
            FriendRequestData data = new FriendRequestData();
            data.setType("UNFRIEND");
            data.setSenderId(userId1);
            data.setReceiverId(userId2);
            socketIOServer.getRoomOperations(user1.getEmail()).sendEvent("friendRequest", data);
            socketIOServer.getRoomOperations(user2.getEmail()).sendEvent("friendRequest", data);
            logger.info("[FriendService] Socket.IO event sent [UNFRIEND] to room: {}", user1.getEmail());
            logger.info("[FriendService] Socket.IO event sent [UNFRIEND] to room: {}", user2.getEmail());
        } catch (Exception e) {
            logger.error("[FriendService] Error sending WebSocket messages: ", e);
        }
    }

    // --- Conversion helpers ---

    private FriendRequest toFriendRequest(FriendRequestDto dto) {
        FriendRequest fr = new FriendRequest();
        fr.setId(dto.getId());
        fr.setSenderId(dto.getSenderId());
        fr.setReceiverId(dto.getReceiverId());
        fr.setStatus(dto.getStatus());
        fr.setCreatedAt(dto.getCreatedAt());
        fr.setUpdatedAt(dto.getUpdatedAt());
        return fr;
    }
}
