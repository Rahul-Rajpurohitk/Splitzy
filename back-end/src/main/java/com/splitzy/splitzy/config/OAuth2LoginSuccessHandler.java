package com.splitzy.splitzy.config;

import com.splitzy.splitzy.service.dao.UserDao;
import com.splitzy.splitzy.service.dao.UserDto;
import com.splitzy.splitzy.util.JwtUtil;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.HashSet;
import java.util.Optional;

@Component
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    @Autowired
    private UserDao userDao;

    @Autowired
    private JwtUtil jwtUtil;

    @Value("${frontend.url:http://localhost:3000}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
        OAuth2User oauth2User = (OAuth2User) authentication.getPrincipal();
        
        // Extract details from Google user
        String email = oauth2User.getAttribute("email");
        String name = oauth2User.getAttribute("name");
        
        // Check if user exists
        Optional<UserDto> userOptional = userDao.findByEmail(email);
        
        if (userOptional.isEmpty()) {
            // Create new user
            UserDto newUser = new UserDto();
            newUser.setEmail(email);
            newUser.setName(name);
            newUser.setVerified(true);
            newUser.setPassword(""); // No password for OAuth users
            newUser.setFriendIds(new HashSet<>());
            newUser.setGroupIds(new HashSet<>());
            userDao.save(newUser);
        } else {
            // Ensure existing user is marked verified if they login via Google
            UserDto existingUser = userOptional.get();
            if (!existingUser.isVerified()) {
                existingUser.setVerified(true);
                userDao.save(existingUser);
            }
        }
        
        // Generate JWT
        String token = jwtUtil.generateToken(email);
        
        // Redirect to frontend with token
        response.sendRedirect(frontendUrl + "/oauth2/redirect?token=" + token);
    }
}
