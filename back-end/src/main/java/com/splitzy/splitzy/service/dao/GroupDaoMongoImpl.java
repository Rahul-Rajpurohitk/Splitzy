package com.splitzy.splitzy.service.dao;

import com.splitzy.splitzy.model.Group;
import com.splitzy.splitzy.model.GroupMember;
import com.splitzy.splitzy.repository.GroupRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * MongoDB implementation of GroupDao.
 */
@Repository
@Profile("!postgres")
public class GroupDaoMongoImpl implements GroupDao {

    private final GroupRepository groupRepository;

    public GroupDaoMongoImpl(GroupRepository groupRepository) {
        this.groupRepository = groupRepository;
    }

    @Override
    public Optional<GroupDto> findById(String id) {
        return groupRepository.findById(id).map(this::toDto);
    }

    @Override
    public List<GroupDto> findByCreatorIdOrMemberId(String userId) {
        return groupRepository.findByCreatorIdOrFriendsId(userId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<GroupDto> findAll() {
        return groupRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public GroupDto save(GroupDto groupDto) {
        Group group = toEntity(groupDto);
        Group saved = groupRepository.save(group);
        return toDto(saved);
    }

    @Override
    public void deleteById(String id) {
        groupRepository.deleteById(id);
    }

    // Mapping methods
    private GroupDto toDto(Group group) {
        GroupDto dto = new GroupDto();
        dto.setId(group.getId());
        dto.setGroupName(group.getGroupName());
        dto.setCreatorId(group.getCreatorId());
        dto.setCreatorName(group.getCreatorName());
        dto.setGroupType(group.getGroupType());
        dto.setCreatedAt(group.getCreatedAt());
        
        if (group.getFriends() != null) {
            dto.setFriends(group.getFriends().stream()
                    .map(m -> new GroupDto.GroupMemberDto(m.getId(), m.getUsername(), m.getEmail()))
                    .collect(Collectors.toList()));
        }
        return dto;
    }

    private Group toEntity(GroupDto dto) {
        Group group = new Group();
        group.setId(dto.getId());
        group.setGroupName(dto.getGroupName());
        group.setCreatorId(dto.getCreatorId());
        group.setCreatorName(dto.getCreatorName());
        group.setGroupType(dto.getGroupType());
        group.setCreatedAt(dto.getCreatedAt());
        
        if (dto.getFriends() != null) {
            group.setFriends(dto.getFriends().stream()
                    .map(m -> {
                        GroupMember member = new GroupMember();
                        member.setId(m.getId());
                        member.setUsername(m.getUsername());
                        member.setEmail(m.getEmail());
                        return member;
                    })
                    .collect(Collectors.toList()));
        }
        return group;
    }
}

