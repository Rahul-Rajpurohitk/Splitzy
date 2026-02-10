package com.splitzy.splitzy.controller;

import com.splitzy.splitzy.model.RedisUser;
import com.splitzy.splitzy.model.User;
import com.splitzy.splitzy.service.CustomUserDetailsService;
import com.splitzy.splitzy.service.EmailService;
import com.splitzy.splitzy.service.RedisCacheService;
import com.splitzy.splitzy.service.dao.UserDao;
import com.splitzy.splitzy.service.dao.UserDto;
import com.splitzy.splitzy.util.JwtUtil;
import java.io.IOException;
import java.net.URI;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/auth")
public class AuthController {

    @Value("${spring.profiles.active:default}")
    private String activeProfile;

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);
    private static final Pattern STRONG_PASSWORD = Pattern.compile("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&]).{8,}$");
    private static final Set<String> ALLOWED_REDIRECT_HOSTS = Set.of(
            "splitzy.xyz", "www.splitzy.xyz", "localhost"
    );

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private CustomUserDetailsService userDetailsService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private EmailService emailService;

    @Autowired
    private UserDao userDao;

    @Autowired
    private RedisCacheService redisCacheService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody User user) {
        logger.info("Login request received for email: {}", user.getEmail());
        Map<String, Object> response = new HashMap<>();

        try {
            UserDto userFromDatabase = userDao.findByEmail(user.getEmail())
                    .orElseThrow(() -> new UsernameNotFoundException("User not found"));

            // Authenticate
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(user.getEmail(), user.getPassword())
            );
            logger.info("Login successful for email: {}", user.getEmail());

            // Generate JWT
            String token = jwtUtil.generateToken(user.getEmail());

            // Build JSON response
            response.put("token", token);
            response.put("id", userFromDatabase.getId());
            response.put("name", userFromDatabase.getName());
            response.put("email", userFromDatabase.getEmail());
            response.put("friendIds", userFromDatabase.getFriendIds());

            return ResponseEntity.ok(response);

        } catch (UsernameNotFoundException e) {
            logger.warn("Authentication failed for email: {}", user.getEmail());
            response.put("error", "Invalid email or password.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);

        } catch (BadCredentialsException e) {
            logger.warn("Authentication failed for email: {}", user.getEmail());
            response.put("error", "Invalid email or password.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);

        } catch (Exception e) {
            logger.error("Login failed for email: {}", user.getEmail(), e);
            response.put("error", "Server error occurred.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }


    @PostMapping("/signup")
    public String signup(@RequestBody User user) {
        logger.info("Signup request received for email: {}", user.getEmail());
        try {
            // Check if the email already exists
            if (userDetailsService.userExists(user.getEmail())) {
                logger.warn("Signup failed: email {} already exists", user.getEmail());
                return "Error: Email already in use";
            } else {
                logger.info("Email {} is available for registration", user.getEmail());
            }

            // Validate password strength
            if (user.getPassword() == null || !STRONG_PASSWORD.matcher(user.getPassword()).matches()) {
                logger.warn("Signup failed: weak password for email {}", user.getEmail());
                return "Error: Password must be at least 8 characters and include upper, lower, number, and symbol.";
            }

            // Generate a verification token
            String verificationToken = java.util.UUID.randomUUID().toString();

            // Create a temporary user for Redis
            RedisUser tempUser = new RedisUser(user.getName(), user.getEmail(), user.getPassword(), verificationToken);

            // Log the temporary user
            logger.info("Temporary user created for Redis: {}", tempUser);


            // Save the user temporarily in Redis with an expiration of 24 hours
            redisCacheService.save(user.getEmail(), tempUser, 24 * 60 * 60);

            // Send a verification email
            emailService.sendVerificationEmail(user.getEmail(), verificationToken);

            return "Verification email sent. Please verify your email to complete the registration.";
        } catch (Exception e) {
            logger.error("Signup failed for email: {}", user.getEmail(), e);
            throw e;
        }
    }

    @GetMapping("/verify-email")
    public void verify(@RequestParam String token, @RequestParam(required = false, defaultValue = "http://localhost:3000/login") String redirectTo,
                       HttpServletResponse response) throws IOException {
        logger.info("Verification request received");

        // Validate redirect URL against allowlist to prevent open redirect attacks
        String safeRedirect = getSafeRedirectUrl(redirectTo);

        try {
            RedisUser tempUser = null;
            String userKey = null;
            for (String key : redisCacheService.getAllKeys()) {
                RedisUser redisUser = redisCacheService.getRedisUser(key);

                if (redisUser != null && redisUser.getVerificationToken().equals(token)) {
                    tempUser = redisUser;
                    userKey = key;
                    break;
                }
            }

            if (tempUser == null) {
                logger.warn("Verification failed: invalid or expired token");
                response.sendRedirect(safeRedirect + "?message=InvalidOrExpiredToken");
                return;
            }

            // Move the user to the permanent User collection
            User user = new User();
            user.setName(tempUser.getName());
            user.setEmail(tempUser.getEmail());
            user.setPassword(tempUser.getPassword());
            user.setVerified(true);
            userDetailsService.save(user);

            logger.info("User verified successfully: {}", user.getEmail());

            if (userKey != null) {
                redisCacheService.delete(userKey);
            }

            response.sendRedirect(safeRedirect + "?message=RegisteredSuccessfully");
        } catch (Exception e) {
            logger.error("Verification failed", e);
            response.sendRedirect(safeRedirect + "?message=ServerError");
        }
    }

    /**
     * Validates the redirect URL against an allowlist to prevent open redirect attacks.
     * Falls back to the frontend login page if the URL is not allowed.
     */
    private String getSafeRedirectUrl(String redirectTo) {
        if (redirectTo == null || redirectTo.isBlank()) {
            return "https://splitzy.xyz/login";
        }
        try {
            URI uri = new URI(redirectTo);
            String host = uri.getHost();
            if (host != null && ALLOWED_REDIRECT_HOSTS.contains(host.toLowerCase())) {
                return redirectTo;
            }
        } catch (Exception e) {
            logger.warn("Invalid redirect URL provided: {}", redirectTo);
        }
        return "https://splitzy.xyz/login";
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getCurrentUser(Authentication authentication) {
        String email = authentication.getName();
        UserDto user = userDao.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("name", user.getName());
        response.put("email", user.getEmail());
        response.put("friendIds", user.getFriendIds());

        return ResponseEntity.ok(response);
    }

    /**
     * Debug endpoint to help diagnose user ID mismatches.
     * Returns info about the authenticated user and their friends.
     */
    @GetMapping("/debug/user-info")
    public ResponseEntity<Map<String, Object>> debugUserInfo(Authentication authentication) {
        String email = authentication.getName();
        logger.info("[DEBUG] Checking user info for email: {}", email);
        
        UserDto user = userDao.findByEmail(email).orElse(null);
        
        Map<String, Object> response = new HashMap<>();
        response.put("authEmail", email);
        
        if (user != null) {
            response.put("userId", user.getId());
            response.put("userName", user.getName());
            response.put("userEmail", user.getEmail());
            response.put("friendIds", user.getFriendIds());
            
            // Get friend details
            java.util.List<Map<String, String>> friends = new java.util.ArrayList<>();
            if (user.getFriendIds() != null) {
                for (String friendId : user.getFriendIds()) {
                    UserDto friend = userDao.findById(friendId).orElse(null);
                    if (friend != null) {
                        Map<String, String> friendInfo = new HashMap<>();
                        friendInfo.put("id", friend.getId());
                        friendInfo.put("name", friend.getName());
                        friendInfo.put("email", friend.getEmail());
                        friends.add(friendInfo);
                    } else {
                        Map<String, String> friendInfo = new HashMap<>();
                        friendInfo.put("id", friendId);
                        friendInfo.put("name", "NOT_FOUND");
                        friendInfo.put("email", "NOT_FOUND");
                        friends.add(friendInfo);
                    }
                }
            }
            response.put("friends", friends);
        } else {
            response.put("error", "User not found in database");
        }
        
        return ResponseEntity.ok(response);
    }

    /**
     * Test-only endpoint to create users without email verification.
     * Only available in non-production profiles.
     */
    @PostMapping("/test-signup")
    public ResponseEntity<Map<String, Object>> testSignup(@RequestBody User user) {
        Map<String, Object> response = new HashMap<>();
        
        // Block in production
        if ("prod".equalsIgnoreCase(activeProfile) || "production".equalsIgnoreCase(activeProfile)) {
            response.put("error", "This endpoint is not available in production");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        logger.info("Test signup request for email: {}", user.getEmail());
        
        try {
            // Check if user already exists
            if (userDetailsService.userExists(user.getEmail())) {
                response.put("error", "User already exists");
                return ResponseEntity.ok(response);
            }
            
            // Create user directly without email verification
            User newUser = new User();
            newUser.setName(user.getName());
            newUser.setEmail(user.getEmail());
            newUser.setPassword(user.getPassword()); // Will be encoded by save()
            newUser.setVerified(true);
            newUser.setFriendIds(new HashSet<>());
            
            userDetailsService.save(newUser);
            
            logger.info("Test user created: {}", user.getEmail());
            response.put("message", "User created successfully");
            response.put("email", user.getEmail());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Test signup failed for email: {}", user.getEmail(), e);
            response.put("error", "Failed to create user");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

}
