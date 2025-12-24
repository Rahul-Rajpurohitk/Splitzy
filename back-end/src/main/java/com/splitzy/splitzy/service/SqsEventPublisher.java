package com.splitzy.splitzy.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/**
 * Publishes events to AWS SQS for reliable delivery.
 * Events are consumed by SqsEventConsumer and broadcast via Socket.IO.
 */
@Service
public class SqsEventPublisher {

    private static final Logger logger = LoggerFactory.getLogger(SqsEventPublisher.class);

    private final SqsClient sqsClient;
    private final ObjectMapper objectMapper;

    @Value("${aws.sqs.queue-url:}")
    private String queueUrl;

    public SqsEventPublisher(SqsClient sqsClient) {
        this.sqsClient = sqsClient;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Publish an event to SQS for reliable delivery to specific users.
     * 
     * @param eventType Type of event (e.g., "EXPENSE_CREATED", "FRIEND_REQUEST", "CHAT_MESSAGE")
     * @param eventName Socket.IO event name (e.g., "expenseEvent", "friendRequest", "chat:new_message")
     * @param targetEmails Set of user emails to receive this event
     * @param payload Event data
     */
    public void publishEvent(String eventType, String eventName, Set<String> targetEmails, Object payload) {
        if (queueUrl == null || queueUrl.isEmpty()) {
            logger.warn("[SQS] Queue URL not configured, skipping event publish");
            return;
        }

        try {
            Map<String, Object> message = new HashMap<>();
            message.put("eventType", eventType);
            message.put("eventName", eventName);
            message.put("targetEmails", targetEmails);
            message.put("payload", payload);
            message.put("timestamp", System.currentTimeMillis());

            String messageBody = objectMapper.writeValueAsString(message);

            SendMessageRequest request = SendMessageRequest.builder()
                    .queueUrl(queueUrl)
                    .messageBody(messageBody)
                    .build();

            sqsClient.sendMessage(request);
            logger.info("[SQS] Published {} event to {} recipients", eventType, targetEmails.size());

        } catch (Exception e) {
            logger.error("[SQS] Failed to publish event: {}", e.getMessage(), e);
        }
    }

    /**
     * Publish expense event
     */
    public void publishExpenseEvent(Set<String> targetEmails, Object expenseData) {
        publishEvent("EXPENSE_CREATED", "expenseEvent", targetEmails, expenseData);
    }

    /**
     * Publish friend request event
     */
    public void publishFriendRequestEvent(String targetEmail, Object requestData) {
        publishEvent("FRIEND_REQUEST", "friendRequest", Set.of(targetEmail), requestData);
    }

    /**
     * Publish chat message event
     */
    public void publishChatMessageEvent(Set<String> targetEmails, Object messageData) {
        publishEvent("CHAT_MESSAGE", "chat:new_message", targetEmails, messageData);
    }

    /**
     * Publish chat notification event
     */
    public void publishChatNotification(Set<String> targetEmails, Object notificationData) {
        publishEvent("CHAT_NOTIFICATION", "chat:notification", targetEmails, notificationData);
    }
}

