package com.splitzy.splitzy.service.dao;

import com.splitzy.splitzy.entity.NotificationSql;
import com.splitzy.splitzy.repository.sql.NotificationSqlRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * PostgreSQL implementation of NotificationDao.
 */
@Repository
@Profile("postgres")
public class NotificationDaoPostgresImpl implements NotificationDao {

    private final NotificationSqlRepository notificationSqlRepository;

    public NotificationDaoPostgresImpl(NotificationSqlRepository notificationSqlRepository) {
        this.notificationSqlRepository = notificationSqlRepository;
    }

    @Override
    public Optional<NotificationDto> findById(String id) {
        return notificationSqlRepository.findById(id).map(this::toDto);
    }

    @Override
    public List<NotificationDto> findByUserIdAndReadFalse(String userId) {
        return notificationSqlRepository.findByUserIdAndReadFalse(userId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<NotificationDto> findByUserId(String userId) {
        return notificationSqlRepository.findByUserId(userId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<NotificationDto> findByReferenceId(String referenceId) {
        return notificationSqlRepository.findByReferenceId(referenceId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public NotificationDto save(NotificationDto notificationDto) {
        NotificationSql notification = toEntity(notificationDto);
        NotificationSql saved = notificationSqlRepository.save(notification);
        return toDto(saved);
    }

    @Override
    public void deleteById(String id) {
        notificationSqlRepository.deleteById(id);
    }

    @Override
    public void deleteAll(List<NotificationDto> notifications) {
        List<String> ids = notifications.stream()
                .map(NotificationDto::getId)
                .collect(Collectors.toList());
        notificationSqlRepository.deleteAllById(ids);
    }

    // Mapping methods
    private NotificationDto toDto(NotificationSql notification) {
        NotificationDto dto = new NotificationDto();
        dto.setId(notification.getId());
        dto.setUserId(notification.getUserId());
        dto.setMessage(notification.getMessage());
        dto.setType(notification.getType());
        dto.setRead(notification.isRead());
        dto.setCreatedAt(notification.getCreatedAt());
        dto.setReferenceId(notification.getReferenceId());
        dto.setSenderName(notification.getSenderName());
        dto.setSenderId(notification.getSenderId());
        return dto;
    }

    private NotificationSql toEntity(NotificationDto dto) {
        NotificationSql notification = new NotificationSql();
        notification.setId(dto.getId());
        notification.setUserId(dto.getUserId());
        notification.setMessage(dto.getMessage());
        notification.setType(dto.getType());
        notification.setRead(dto.isRead());
        notification.setCreatedAt(dto.getCreatedAt());
        notification.setReferenceId(dto.getReferenceId());
        notification.setSenderName(dto.getSenderName());
        notification.setSenderId(dto.getSenderId());
        return notification;
    }
}

