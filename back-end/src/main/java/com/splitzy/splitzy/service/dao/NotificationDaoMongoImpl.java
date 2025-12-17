package com.splitzy.splitzy.service.dao;

import com.splitzy.splitzy.model.Notification;
import com.splitzy.splitzy.repository.NotificationRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * MongoDB implementation of NotificationDao.
 */
@Repository
@Profile("!postgres")
public class NotificationDaoMongoImpl implements NotificationDao {

    private final NotificationRepository notificationRepository;

    public NotificationDaoMongoImpl(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Override
    public Optional<NotificationDto> findById(String id) {
        return notificationRepository.findById(id).map(this::toDto);
    }

    @Override
    public List<NotificationDto> findByUserIdAndReadFalse(String userId) {
        return notificationRepository.findByUserIdAndReadFalse(userId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<NotificationDto> findByUserId(String userId) {
        return notificationRepository.findByUserId(userId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<NotificationDto> findByReferenceId(String referenceId) {
        return notificationRepository.findByReferenceId(referenceId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public NotificationDto save(NotificationDto notificationDto) {
        Notification notification = toEntity(notificationDto);
        Notification saved = notificationRepository.save(notification);
        return toDto(saved);
    }

    @Override
    public void deleteById(String id) {
        notificationRepository.deleteById(id);
    }

    @Override
    public void deleteAll(List<NotificationDto> notifications) {
        List<Notification> entities = notifications.stream()
                .map(this::toEntity)
                .collect(Collectors.toList());
        notificationRepository.deleteAll(entities);
    }

    // Mapping methods
    private NotificationDto toDto(Notification notification) {
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

    private Notification toEntity(NotificationDto dto) {
        Notification notification = new Notification();
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

