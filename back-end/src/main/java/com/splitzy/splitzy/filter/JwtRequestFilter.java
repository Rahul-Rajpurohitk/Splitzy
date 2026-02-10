package com.splitzy.splitzy.filter;

import com.splitzy.splitzy.util.JwtUtil;
import io.jsonwebtoken.io.IOException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;


@Component
public class JwtRequestFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(JwtRequestFilter.class);

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull FilterChain chain)
            throws IOException, jakarta.servlet.ServletException, java.io.IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                String jwt = authHeader.substring(7);
                String username = jwtUtil.extractUsername(jwt);

                if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                    if (jwtUtil.validateToken(jwt, userDetails.getUsername())) {
                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                    }
                }
            } catch (Exception e) {
                logger.warn("JWT authentication failed: {}", e.getMessage());
                SecurityContextHolder.clearContext();
            }
        }
        chain.doFilter(request, response);
    }
}
