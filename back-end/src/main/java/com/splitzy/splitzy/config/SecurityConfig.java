package com.splitzy.splitzy.config;

import com.splitzy.splitzy.filter.JwtRequestFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import static org.springframework.security.config.Customizer.withDefaults;

@Configuration
public class SecurityConfig {

    @Autowired
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(withDefaults())
                .csrf(AbstractHttpConfigurer::disable)
                .headers(headers -> headers
                        .frameOptions(frame -> frame.deny())
                        .xssProtection(xss -> xss.headerValue(
                                org.springframework.security.web.header.writers.XXssProtectionHeaderWriter.HeaderValue.ENABLED_MODE_BLOCK))
                        .httpStrictTransportSecurity(hsts -> hsts
                                .includeSubDomains(true)
                                .maxAgeInSeconds(31536000))
                        .referrerPolicy(referrer -> referrer
                                .policy(org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                        .permissionsPolicy(permissions -> permissions
                                .policy("camera=(), microphone=(), geolocation=()"))
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/auth/login", "/auth/signup", "/auth/verify-email", "/oauth2/**", "/login/oauth2/**").permitAll()
                        .requestMatchers("/api/health", "/api/ping", "/actuator/health").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll()
                        .anyRequest().authenticated()
                )
                .oauth2Login(oauth2 -> oauth2
                        .successHandler(oAuth2LoginSuccessHandler)
                )
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .addFilterBefore(jwtRequestFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationManager authenticationManager(HttpSecurity http) throws Exception {
        return http.getSharedObject(AuthenticationManagerBuilder.class).build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public JwtRequestFilter jwtRequestFilter() {
        return new JwtRequestFilter();
    }
}
