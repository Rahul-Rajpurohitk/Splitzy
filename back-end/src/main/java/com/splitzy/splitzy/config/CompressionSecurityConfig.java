package com.splitzy.splitzy.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * Configuration for secure compression handling.
 * 
 * Security considerations:
 * 1. BREACH attack mitigation - avoid compressing responses with secrets + user input
 * 2. Proper Vary headers for caching
 * 3. Security headers to prevent content-type sniffing
 */
@Configuration
public class CompressionSecurityConfig {

    /**
     * Filter that adds security headers for compressed responses.
     * This helps mitigate compression-related attacks and ensures proper caching.
     */
    @Bean
    public OncePerRequestFilter compressionSecurityFilter() {
        return new OncePerRequestFilter() {
            @Override
            protected void doFilterInternal(HttpServletRequest request,
                                            HttpServletResponse response,
                                            FilterChain filterChain) throws ServletException, IOException {
                
                // Add Vary header - important for caching compressed content correctly
                response.addHeader("Vary", "Accept-Encoding");
                
                // Prevent content-type sniffing (security)
                response.addHeader("X-Content-Type-Options", "nosniff");
                
                // Add cache control for API responses
                String path = request.getRequestURI();
                if (path.startsWith("/api/") || path.startsWith("/chat/") || 
                    path.startsWith("/expenses/") || path.startsWith("/users/") ||
                    path.startsWith("/friends/") || path.startsWith("/groups/")) {
                    
                    // Don't cache sensitive API responses
                    response.addHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
                    response.addHeader("Pragma", "no-cache");
                } else {
                    // Static resources can be cached
                    response.addHeader("Cache-Control", "public, max-age=31536000");
                }
                
                filterChain.doFilter(request, response);
            }
        };
    }
}

