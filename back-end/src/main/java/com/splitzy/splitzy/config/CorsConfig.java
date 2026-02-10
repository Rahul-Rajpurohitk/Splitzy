package com.splitzy.splitzy.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig {

    @Value("${cors.allowed-origins:http://localhost:3000}")
    private String allowedOriginsString;

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(@NonNull CorsRegistry registry) {
                // Split the comma-separated origins
                String[] origins = allowedOriginsString.split(",");
                registry.addMapping("/**")
                        .allowedOrigins(origins)
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                        .allowedHeaders("Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With", "Cache-Control", "Pragma")
                        .allowCredentials(true)
                        .maxAge(3600);
            }
        };
    }
}
