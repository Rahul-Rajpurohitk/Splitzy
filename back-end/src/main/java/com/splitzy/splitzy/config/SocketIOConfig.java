package com.splitzy.splitzy.config;

import com.corundumstudio.socketio.SocketIOServer;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.splitzy.splitzy.util.JwtUtil;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SocketIOConfig {

    @Getter
    private SocketIOServer server;

    @Autowired
    private JwtUtil jwtUtil;

    @PostConstruct
    public void startSocketIOServer() {
        com.corundumstudio.socketio.Configuration config = getConfiguration();

        server = new SocketIOServer(config);

        // On connect: extract the token, validate, and join a room by email
        server.addConnectListener(client -> {
            String token = client.getHandshakeData().getSingleUrlParam("token");
            if (token != null) {
                try {
                    String email = jwtUtil.extractUsername(token);
                    client.joinRoom(email);
                    System.out.println("Socket.IO client " + client.getSessionId() + " joined room: " + email);
                } catch (Exception e) {
                    System.out.println("Token extraction failed: " + e.getMessage());
                    client.disconnect();
                }
            } else {
                System.out.println("No token provided, disconnecting client " + client.getSessionId());
                client.disconnect();
            }
        });

        server.addDisconnectListener(client ->
                System.out.println("Socket.IO client disconnected: " + client.getSessionId())
        );

        // Allow clients to join/leave chat threads
        server.addEventListener("joinThread", String.class, (client, room, ackRequest) -> {
            if (room != null && !room.isBlank()) {
                client.joinRoom("thread:" + room);
                System.out.println("Client " + client.getSessionId() + " joined thread room: thread:" + room);
            }
        });
        server.addEventListener("leaveThread", String.class, (client, room, ackRequest) -> {
            if (room != null && !room.isBlank()) {
                client.leaveRoom("thread:" + room);
                System.out.println("Client " + client.getSessionId() + " left thread room: thread:" + room);
            }
        });

        server.start();
        System.out.println("Socket.IO server started on port 9092");
    }

    private static com.corundumstudio.socketio.Configuration getConfiguration() {
        com.corundumstudio.socketio.Configuration config = new com.corundumstudio.socketio.Configuration();
        config.setHostname("0.0.0.0");
        config.setPort(9092);

        // Set allowed origins for CORS
        config.setOrigin("http://localhost:3000");
        config.setAllowCustomRequests(true);

        // Configure Jackson with Java 8 date/time support
        config.setJsonSupport(new com.corundumstudio.socketio.protocol.JacksonJsonSupport(new JavaTimeModule()));

        return config;
    }

    @PreDestroy
    public void stopSocketIOServer() {
        if (server != null) {
            server.stop();
            System.out.println("Socket.IO server stopped.");
        }
    }

    // Expose the SocketIOServer as a Spring bean
    @Bean
    public SocketIOServer socketIOServer() {
        return this.server;
    }

}
