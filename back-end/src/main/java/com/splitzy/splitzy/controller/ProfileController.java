package com.splitzy.splitzy.controller;

import com.splitzy.splitzy.dto.ChangePasswordRequest;
import com.splitzy.splitzy.dto.UpdateProfileRequest;
import com.splitzy.splitzy.service.CustomUserDetailsService;
import com.splitzy.splitzy.service.dao.UserDao;
import com.splitzy.splitzy.service.dao.UserDto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/profile")
public class ProfileController {

    @Autowired
    private UserDao userDao;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private CustomUserDetailsService userDetailsService;

    @GetMapping
    public ResponseEntity<?> getProfile(Authentication auth) {
        String email = auth.getName();
        UserDto user = userDao.findByEmail(email).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }
        Map<String, Object> res = new HashMap<>();
        res.put("id", user.getId());
        res.put("name", user.getName());
        res.put("email", user.getEmail());
        res.put("avatarUrl", user.getAvatarUrl());
        res.put("verified", user.isVerified());
        return ResponseEntity.ok(res);
    }

    @PutMapping
    public ResponseEntity<?> updateProfile(Authentication auth, @RequestBody UpdateProfileRequest req) {
        String email = auth.getName();
        UserDto user = userDao.findByEmail(email).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }

        // If email change, ensure not taken
        if (req.getEmail() != null && !req.getEmail().equalsIgnoreCase(user.getEmail())) {
            if (userDao.existsByEmail(req.getEmail())) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body("Email already in use");
            }
            user.setEmail(req.getEmail());
        }

        if (req.getName() != null && !req.getName().isBlank()) {
            user.setName(req.getName());
        }
        if (req.getAvatarUrl() != null) {
            user.setAvatarUrl(req.getAvatarUrl());
        }

        userDao.save(user);
        return ResponseEntity.ok("Profile updated");
    }

    @PostMapping("/password")
    public ResponseEntity<?> changePassword(Authentication auth, @RequestBody ChangePasswordRequest req) {
        String email = auth.getName();
        UserDto user = userDao.findByEmail(email).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }

        // If user has no password (OAuth), allow setting new password without current
        boolean hasPassword = user.getPassword() != null && !user.getPassword().isBlank();
        if (hasPassword) {
            if (req.getCurrentPassword() == null || !passwordEncoder.matches(req.getCurrentPassword(), user.getPassword())) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Current password is incorrect");
            }
        }
        // Validate new password
        if (req.getNewPassword() == null || req.getNewPassword().length() < 8) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("New password must be at least 8 characters");
        }

        user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        userDao.save(user);
        return ResponseEntity.ok("Password updated");
    }
}

