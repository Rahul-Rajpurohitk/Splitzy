package com.splitzy.splitzy.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    @Autowired
    private JavaMailSender mailSender;

    public void sendVerificationEmail(String toEmail, String token) {
        logger.info("Preparing to send verification email to {}", toEmail);


        String subject = "Verify your email address";
        String body =  "Please verify your email by clicking the link below:\n"
                + "http://localhost:8080/auth/verify-email?token=" + token
                + "&redirectTo=http://localhost:3000/login";

        logger.debug("Email subject: {}", subject);
        logger.debug("Email body: {}", body);

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject(subject);
        message.setText(body);

        try {
            mailSender.send(message);
            logger.info("Verification email sent successfully to {}", toEmail);
        } catch (Exception e) {
            logger.error("Failed to send verification email to {}", toEmail, e);
        }

    }

    public void sendFriendRequestNotification(String toEmail, String senderName) {
        logger.info("Preparing to send friend request notification to {}", toEmail);

        String subject = senderName + " has sent you a friend request!";
        String body =  "Hello,\n\nYou have a new friend request from " + senderName +
                ". Please log in to accept or reject the request.\n\n" +
                "Best regards,\nYourAppName";

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject(subject);
        message.setText(body);

        try {
            mailSender.send(message);
            logger.info("Friend request notification email sent successfully to {}", toEmail);
        } catch (Exception e) {
            logger.error("Failed to send friend request notification to {}", toEmail, e);
        }
    }

}
