package com.splitzy.splitzy.service;

import com.splitzy.splitzy.dto.GroupDTO;
import com.splitzy.splitzy.dto.GroupEventData;
import com.splitzy.splitzy.dto.GroupMemberDTO;
import com.splitzy.splitzy.model.Group;
import com.splitzy.splitzy.model.GroupMember;
import com.splitzy.splitzy.model.Notification;
import com.splitzy.splitzy.service.dao.GroupDao;
import com.splitzy.splitzy.service.dao.GroupDto;
import com.splitzy.splitzy.service.dao.UserDao;
import com.splitzy.splitzy.service.dao.UserDto;
import com.corundumstudio.socketio.SocketIOServer;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GroupServiceImpl implements GroupService {

    private static final Logger logger = LoggerFactory.getLogger(GroupServiceImpl.class);

    private final GroupDao groupDao;
    private final UserDao userDao;
    private final NotificationService notificationService;
    private final SocketIOServer socketIOServer;

    @Override
    public GroupDTO createGroup(GroupDTO groupDTO) {
        logger.info("Creating group with name '{}' for creatorId: {}", groupDTO.getGroupName(), groupDTO.getCreatorId());
        
        // Convert DTO to internal GroupDto with creator's id and name.
        GroupDto groupDtoInternal = new GroupDto();
        groupDtoInternal.setGroupName(groupDTO.getGroupName());
        groupDtoInternal.setCreatorId(groupDTO.getCreatorId());
        groupDtoInternal.setCreatorName(groupDTO.getCreatorName());
        groupDtoInternal.setGroupType(groupDTO.getGroupType());
        groupDtoInternal.setCreatedAt(LocalDateTime.now());
        
        if (groupDTO.getFriends() != null) {
            groupDtoInternal.setFriends(groupDTO.getFriends().stream()
                    .map(f -> new GroupDto.GroupMemberDto(f.getId(), f.getUsername(), f.getEmail()))
                    .collect(Collectors.toList()));
        }

        // Save group via DAO
        GroupDto savedGroup = groupDao.save(groupDtoInternal);
        logger.info("Group saved with id: {} and name: '{}'", savedGroup.getId(), savedGroup.getGroupName());

        // Update the creator's User document to add this group id.
        userDao.findById(groupDTO.getCreatorId()).ifPresent(user -> {
            user.getGroupIds().add(savedGroup.getId());
            userDao.save(user);
            logger.debug("Updated creator (id: {}) document with new group id: {}", groupDTO.getCreatorId(), savedGroup.getId());
        });

        // For each friend member, update their User document,
        // create a notification, and emit a socket event.
        if (groupDTO.getFriends() != null) {
            groupDTO.getFriends().forEach(friendDto -> {
                // Process only if the friend id is provided.
                if (friendDto.getId() != null && !friendDto.getId().isEmpty()) {
                    userDao.findById(friendDto.getId()).ifPresent(friend -> {
                        friend.getGroupIds().add(savedGroup.getId());
                        userDao.save(friend);
                        logger.debug("Updated friend (id: {}) document with new group id: {}", friendDto.getId(), savedGroup.getId());

                        // Create a notification with message like "creatorName added you in a group."
                        String message = groupDTO.getCreatorName() + " added you in a group.";
                        Notification notif = notificationService.createNotification(
                                friend.getId(),
                                message,
                                savedGroup.getId(),
                                groupDTO.getCreatorName(),
                                groupDTO.getCreatorId(),
                                "GROUP_INVITE"
                        );
                        logger.debug("Notification created for friend (id: {}) with message: '{}'", friend.getId(), message);

                        // Build a payload similar to ExpenseEventData
                        GroupEventData payload = new GroupEventData();
                        payload.setType("GROUP_INVITE");
                        payload.setGroupId(savedGroup.getId());
                        payload.setGroupName(savedGroup.getGroupName());
                        payload.setCreatorId(groupDTO.getCreatorId());
                        payload.setCreatorName(groupDTO.getCreatorName());

                        // Emit the socket event to the friend based on their email.
                        if (friend.getEmail() != null) {
                            socketIOServer.getRoomOperations(friend.getEmail())
                                    .sendEvent("groupInvite", payload);
                            logger.info("[GroupService] Socket.IO event [GROUP_INVITE] sent to room: {}", friend.getEmail());
                        }
                    });
                } else {
                    logger.warn("Skipping friend processing as friendDto does not have a valid id: {}", friendDto);
                }
            });
        }
        logger.info("Group creation completed for group id: {}", savedGroup.getId());
        
        // Update the return DTO with the saved id
        groupDTO.setId(savedGroup.getId());
        return groupDTO;
    }

    @Override
    public List<GroupDTO> getGroupsForUser(String userId) {
        logger.info("Fetching groups for userId: {}", userId);
        List<GroupDto> groups = groupDao.findByCreatorIdOrMemberId(userId);
        logger.info("Found {} groups for userId: {}", groups.size(), userId);

        return groups.stream()
                .map(group -> {
                    GroupDTO dto = new GroupDTO();
                    dto.setId(group.getId());
                    dto.setGroupName(group.getGroupName());
                    dto.setGroupType(group.getGroupType());
                    // skip setting other fields
                    return dto;
                })
                .collect(Collectors.toList());
    }
}
