package com.splitzy.splitzy.config;

//import com.corundumstudio.socketio.Configuration;
import com.corundumstudio.socketio.SocketIOServer;
import com.corundumstudio.socketio.listener.DataListener;
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

        server.start();
        System.out.println("Socket.IO server started on port 9092");
    }

    private static com.corundumstudio.socketio.Configuration getConfiguration() {
        com.corundumstudio.socketio.Configuration config = new com.corundumstudio.socketio.Configuration();
        config.setHostname("0.0.0.0"); // Adjust if needed
        config.setPort(9092); // Socket.IO server port

        // IMPORTANT: Set allowed origins
        // This ensures that http://localhost:3000 can connect to the Socket.IO server on port 9092
        config.setOrigin("http://localhost:3000");

        // This is the key line to allow custom requests (including cookies)
        config.setAllowCustomRequests(true);
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
