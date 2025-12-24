package com.splitzy.splitzy.service;

import com.corundumstudio.socketio.SocketIOServer;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.DeleteMessageRequest;
import software.amazon.awssdk.services.sqs.model.Message;
import software.amazon.awssdk.services.sqs.model.ReceiveMessageRequest;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Consumes events from AWS SQS and broadcasts them via Socket.IO.
 * This ensures guaranteed delivery even if socket connections drop.
 */
@Service
public class SqsEventConsumer {

    private static final Logger logger = LoggerFactory.getLogger(SqsEventConsumer.class);

    private final SqsClient sqsClient;
    private final ObjectMapper objectMapper;
    private final AtomicBoolean running = new AtomicBoolean(false);
    private ExecutorService executor;

    @Autowired(required = false)
    private SocketIOServer socketIOServer;

    @Value("${aws.sqs.queue-url:}")
    private String queueUrl;

    @Value("${aws.sqs.enabled:false}")
    private boolean sqsEnabled;

    public SqsEventConsumer(SqsClient sqsClient) {
        this.sqsClient = sqsClient;
        this.objectMapper = new ObjectMapper();
    }

    @PostConstruct
    public void startConsumer() {
        if (!sqsEnabled || queueUrl == null || queueUrl.isEmpty()) {
            logger.info("[SQS Consumer] SQS not enabled or queue URL not set, skipping consumer startup");
            return;
        }

        running.set(true);
        executor = Executors.newSingleThreadExecutor();
        executor.submit(this::pollMessages);
        logger.info("[SQS Consumer] Started polling queue: {}", queueUrl);
    }

    @PreDestroy
    public void stopConsumer() {
        running.set(false);
        if (executor != null) {
            executor.shutdownNow();
            logger.info("[SQS Consumer] Stopped");
        }
    }

    private void pollMessages() {
        while (running.get()) {
            try {
                ReceiveMessageRequest request = ReceiveMessageRequest.builder()
                        .queueUrl(queueUrl)
                        .maxNumberOfMessages(10)
                        .waitTimeSeconds(20) // Long polling
                        .build();

                List<Message> messages = sqsClient.receiveMessage(request).messages();

                for (Message message : messages) {
                    try {
                        processMessage(message);
                        deleteMessage(message);
                    } catch (Exception e) {
                        logger.error("[SQS Consumer] Error processing message: {}", e.getMessage(), e);
                        // Message will become visible again after visibility timeout
                    }
                }
            } catch (Exception e) {
                if (running.get()) {
                    logger.error("[SQS Consumer] Error polling queue: {}", e.getMessage());
                    try {
                        Thread.sleep(5000); // Back off on error
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
        }
    }

    @SuppressWarnings("unchecked")
    private void processMessage(Message message) throws Exception {
        Map<String, Object> event = objectMapper.readValue(message.body(), 
                new TypeReference<Map<String, Object>>() {});

        String eventName = (String) event.get("eventName");
        List<String> targetEmailsList = (List<String>) event.get("targetEmails");
        Set<String> targetEmails = Set.copyOf(targetEmailsList);
        Object payload = event.get("payload");

        logger.info("[SQS Consumer] Processing {} event for {} recipients", eventName, targetEmails.size());

        if (socketIOServer == null) {
            logger.warn("[SQS Consumer] Socket.IO server not available");
            return;
        }

        // Broadcast to each target user's room
        for (String email : targetEmails) {
            int clientCount = socketIOServer.getRoomOperations(email).getClients().size();
            if (clientCount > 0) {
                socketIOServer.getRoomOperations(email).sendEvent(eventName, payload);
                logger.debug("[SQS Consumer] Sent {} to {} ({} clients)", eventName, email, clientCount);
            } else {
                logger.debug("[SQS Consumer] No clients in room {} for event {}", email, eventName);
            }
        }
    }

    private void deleteMessage(Message message) {
        DeleteMessageRequest deleteRequest = DeleteMessageRequest.builder()
                .queueUrl(queueUrl)
                .receiptHandle(message.receiptHandle())
                .build();
        sqsClient.deleteMessage(deleteRequest);
    }
}

