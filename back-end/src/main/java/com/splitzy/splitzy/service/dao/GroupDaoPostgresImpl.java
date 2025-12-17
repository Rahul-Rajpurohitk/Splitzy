package com.splitzy.splitzy.service.dao;

import com.splitzy.splitzy.entity.GroupSql;
import com.splitzy.splitzy.repository.sql.GroupSqlRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * PostgreSQL implementation of GroupDao.
 */
@Repository
@Profile("postgres")
@Transactional(readOnly = true)
public class GroupDaoPostgresImpl implements GroupDao {

    private final GroupSqlRepository groupSqlRepository;

    public GroupDaoPostgresImpl(GroupSqlRepository groupSqlRepository) {
        this.groupSqlRepository = groupSqlRepository;
    }

    @Override
    public Optional<GroupDto> findById(String id) {
        return groupSqlRepository.findById(id).map(this::toDto);
    }

    @Override
    public List<GroupDto> findByCreatorIdOrMemberId(String userId) {
        return groupSqlRepository.findByCreatorIdOrMemberId(userId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<GroupDto> findAll() {
        return groupSqlRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public GroupDto save(GroupDto groupDto) {
        GroupSql group = toEntity(groupDto);
        GroupSql saved = groupSqlRepository.save(group);
        return toDto(saved);
    }

    @Override
    @Transactional
    public void deleteById(String id) {
        groupSqlRepository.deleteById(id);
    }

    // Mapping methods - Note: GroupSql uses memberIds (Set<String>) instead of friends list
    private GroupDto toDto(GroupSql group) {
        GroupDto dto = new GroupDto();
        dto.setId(group.getId());
        dto.setGroupName(group.getGroupName());
        dto.setCreatorId(group.getCreatorId());
        dto.setCreatorName(group.getCreatorName());
        dto.setGroupType(group.getGroupType());
        // Note: GroupSql doesn't have createdAt yet - can be added if needed
        
        // Convert memberIds to GroupMemberDto (minimal info - just IDs)
        if (group.getMemberIds() != null) {
            dto.setFriends(group.getMemberIds().stream()
                    .map(id -> new GroupDto.GroupMemberDto(id, null, null))
                    .collect(Collectors.toList()));
        }
        return dto;
    }

    private GroupSql toEntity(GroupDto dto) {
        GroupSql group = new GroupSql();
        group.setId(dto.getId());
        group.setGroupName(dto.getGroupName());
        group.setCreatorId(dto.getCreatorId());
        group.setCreatorName(dto.getCreatorName());
        group.setGroupType(dto.getGroupType());
        
        // Convert friends list to memberIds set
        if (dto.getFriends() != null) {
            group.setMemberIds(dto.getFriends().stream()
                    .map(GroupDto.GroupMemberDto::getId)
                    .collect(Collectors.toSet()));
        }
        return group;
    }
}

