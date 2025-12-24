package com.splitzy.splitzy.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    @Autowired
    private JavaMailSender mailSender;

    @Value("${app.base-url:http://localhost:8080}")
    private String appBaseUrl;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    @Value("${spring.mail.username:noreply@splitzy.com}")
    private String fromEmail;

    @Value("${app.name:Splitzy}")
    private String appName;

    /**
     * Send email verification link to new users
     */
    public void sendVerificationEmail(String toEmail, String token) {
        logger.info("Preparing to send verification email to {}", toEmail);

        String verificationLink = appBaseUrl + "/auth/verify-email?token=" + token 
                + "&redirectTo=" + frontendUrl + "/login";

        String subject = "🎉 Welcome to " + appName + " - Verify Your Email";
        
        String htmlContent = buildVerificationEmailTemplate(toEmail, verificationLink);

        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    /**
     * Send friend request notification
     */
    public void sendFriendRequestNotification(String toEmail, String senderName) {
        logger.info("Preparing to send friend request notification to {}", toEmail);

        String subject = "👋 " + senderName + " wants to connect on " + appName;
        
        String htmlContent = buildFriendRequestTemplate(senderName);

        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    /**
     * Send expense notification
     */
    public void sendExpenseNotification(String toEmail, String payerName, String description, double amount) {
        logger.info("Preparing to send expense notification to {}", toEmail);

        String subject = "💰 New expense added by " + payerName;
        
        String htmlContent = buildExpenseNotificationTemplate(payerName, description, amount);

        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    /**
     * Send settlement reminder
     */
    public void sendSettlementReminder(String toEmail, String friendName, double amount) {
        logger.info("Preparing to send settlement reminder to {}", toEmail);

        String subject = "⏰ Reminder: You owe " + friendName + " $" + String.format("%.2f", amount);
        
        String htmlContent = buildSettlementReminderTemplate(friendName, amount);

        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    /**
     * Send password reset email
     */
    public void sendPasswordResetEmail(String toEmail, String token) {
        logger.info("Preparing to send password reset email to {}", toEmail);

        String resetLink = frontendUrl + "/reset-password?token=" + token;
        String subject = "🔐 Reset Your " + appName + " Password";
        
        String htmlContent = buildPasswordResetTemplate(resetLink);

        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    /**
     * Core method to send HTML emails
     */
    private void sendHtmlEmail(String toEmail, String subject, String htmlContent) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setFrom(fromEmail, appName);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(htmlContent, true); // true = HTML

            mailSender.send(message);
            logger.info("Email sent successfully to {}", toEmail);
        } catch (MessagingException e) {
            logger.error("Failed to send email to {}: {}", toEmail, e.getMessage());
        } catch (Exception e) {
            logger.error("Unexpected error sending email to {}", toEmail, e);
        }
    }

    // ==================== EMAIL TEMPLATES ====================

    private String buildVerificationEmailTemplate(String email, String verificationLink) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f0f23;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td align="center" style="padding: 40px 0;">
                            <table role="presentation" style="width: 600px; border-collapse: collapse; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                                
                                <!-- Header -->
                                <tr>
                                    <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                                        <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -1px;">
                                            ✨ %s
                                        </h1>
                                        <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                                            Split expenses with friends, effortlessly
                                        </p>
                                    </td>
                                </tr>
                                
                                <!-- Content -->
                                <tr>
                                    <td style="padding: 40px;">
                                        <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600;">
                                            Welcome aboard! 🚀
                                        </h2>
                                        <p style="margin: 0 0 20px; color: #a0aec0; font-size: 16px; line-height: 1.6;">
                                            Thanks for signing up for <strong style="color: #667eea;">%s</strong>! 
                                            We're excited to have you join our community.
                                        </p>
                                        <p style="margin: 0 0 30px; color: #a0aec0; font-size: 16px; line-height: 1.6;">
                                            To get started, please verify your email address by clicking the button below:
                                        </p>
                                        
                                        <!-- CTA Button -->
                                        <table role="presentation" style="width: 100%%; border-collapse: collapse;">
                                            <tr>
                                                <td align="center">
                                                    <a href="%s" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                                                        ✓ Verify My Email
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <p style="margin: 30px 0 0; color: #718096; font-size: 14px; line-height: 1.6;">
                                            Or copy and paste this link into your browser:
                                        </p>
                                        <p style="margin: 10px 0 0; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 6px; word-break: break-all;">
                                            <a href="%s" style="color: #667eea; font-size: 13px; text-decoration: none;">%s</a>
                                        </p>
                                        
                                        <hr style="margin: 30px 0; border: none; border-top: 1px solid rgba(255,255,255,0.1);">
                                        
                                        <p style="margin: 0; color: #718096; font-size: 13px;">
                                            ⏰ This link expires in <strong>24 hours</strong>
                                        </p>
                                        <p style="margin: 10px 0 0; color: #718096; font-size: 13px;">
                                            If you didn't create an account, you can safely ignore this email.
                                        </p>
                                    </td>
                                </tr>
                                
                                <!-- Footer -->
                                <tr>
                                    <td style="padding: 20px 40px; background: rgba(0,0,0,0.2); text-align: center;">
                                        <p style="margin: 0; color: #4a5568; font-size: 12px;">
                                            © 2024 %s. All rights reserved.
                                        </p>
                                        <p style="margin: 10px 0 0; color: #4a5568; font-size: 12px;">
                                            Made with ❤️ for smarter expense splitting
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            """.formatted(appName, appName, verificationLink, verificationLink, verificationLink, appName);
    }

    private String buildFriendRequestTemplate(String senderName) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f0f23;">
                <table role="presentation" style="width: 100%%; border-collapse: collapse;">
                    <tr>
                        <td align="center" style="padding: 40px 0;">
                            <table role="presentation" style="width: 600px; border-collapse: collapse; background: linear-gradient(135deg, #1a1a2e 0%%, #16213e 100%%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                                
                                <!-- Header -->
                                <tr>
                                    <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #10b981 0%%, #059669 100%%);">
                                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                                            👋 New Friend Request!
                                        </h1>
                                    </td>
                                </tr>
                                
                                <!-- Content -->
                                <tr>
                                    <td style="padding: 40px; text-align: center;">
                                        <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); border-radius: 50%%; display: flex; align-items: center; justify-content: center;">
                                            <span style="font-size: 36px; line-height: 80px;">🤝</span>
                                        </div>
                                        <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 22px;">
                                            <strong style="color: #10b981;">%s</strong> wants to connect!
                                        </h2>
                                        <p style="margin: 0 0 30px; color: #a0aec0; font-size: 16px; line-height: 1.6;">
                                            Accept their request to start splitting expenses together.
                                        </p>
                                        
                                        <a href="%s/home" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #10b981 0%%, #059669 100%%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 8px;">
                                            View Request →
                                        </a>
                                    </td>
                                </tr>
                                
                                <!-- Footer -->
                                <tr>
                                    <td style="padding: 20px 40px; background: rgba(0,0,0,0.2); text-align: center;">
                                        <p style="margin: 0; color: #4a5568; font-size: 12px;">
                                            © 2024 %s. Split smarter, not harder.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            """.formatted(senderName, frontendUrl, appName);
    }

    private String buildExpenseNotificationTemplate(String payerName, String description, double amount) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f0f23;">
                <table role="presentation" style="width: 100%%; border-collapse: collapse;">
                    <tr>
                        <td align="center" style="padding: 40px 0;">
                            <table role="presentation" style="width: 600px; border-collapse: collapse; background: linear-gradient(135deg, #1a1a2e 0%%, #16213e 100%%); border-radius: 16px; overflow: hidden;">
                                
                                <tr>
                                    <td style="padding: 30px; text-align: center; background: linear-gradient(135deg, #f59e0b 0%%, #d97706 100%%);">
                                        <h1 style="margin: 0; color: #ffffff; font-size: 24px;">💰 New Expense Added</h1>
                                    </td>
                                </tr>
                                
                                <tr>
                                    <td style="padding: 40px;">
                                        <p style="margin: 0 0 20px; color: #a0aec0; font-size: 16px;">
                                            <strong style="color: #f59e0b;">%s</strong> added a new expense:
                                        </p>
                                        
                                        <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin: 20px 0;">
                                            <p style="margin: 0 0 10px; color: #ffffff; font-size: 18px; font-weight: 600;">
                                                %s
                                            </p>
                                            <p style="margin: 0; color: #f59e0b; font-size: 28px; font-weight: 700;">
                                                $%.2f
                                            </p>
                                        </div>
                                        
                                        <a href="%s/home" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #f59e0b 0%%, #d97706 100%%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 8px;">
                                            View Details →
                                        </a>
                                    </td>
                                </tr>
                                
                                <tr>
                                    <td style="padding: 20px; background: rgba(0,0,0,0.2); text-align: center;">
                                        <p style="margin: 0; color: #4a5568; font-size: 12px;">© 2024 %s</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            """.formatted(payerName, description, amount, frontendUrl, appName);
    }

    private String buildSettlementReminderTemplate(String friendName, double amount) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f0f23;">
                <table role="presentation" style="width: 100%%; border-collapse: collapse;">
                    <tr>
                        <td align="center" style="padding: 40px 0;">
                            <table role="presentation" style="width: 600px; border-collapse: collapse; background: linear-gradient(135deg, #1a1a2e 0%%, #16213e 100%%); border-radius: 16px; overflow: hidden;">
                                
                                <tr>
                                    <td style="padding: 30px; text-align: center; background: linear-gradient(135deg, #ef4444 0%%, #dc2626 100%%);">
                                        <h1 style="margin: 0; color: #ffffff; font-size: 24px;">⏰ Settlement Reminder</h1>
                                    </td>
                                </tr>
                                
                                <tr>
                                    <td style="padding: 40px; text-align: center;">
                                        <p style="margin: 0 0 20px; color: #a0aec0; font-size: 16px;">
                                            You owe <strong style="color: #ef4444;">%s</strong>
                                        </p>
                                        
                                        <p style="margin: 0 0 30px; color: #ef4444; font-size: 42px; font-weight: 700;">
                                            $%.2f
                                        </p>
                                        
                                        <a href="%s/home" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #10b981 0%%, #059669 100%%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 8px;">
                                            Settle Up Now →
                                        </a>
                                    </td>
                                </tr>
                                
                                <tr>
                                    <td style="padding: 20px; background: rgba(0,0,0,0.2); text-align: center;">
                                        <p style="margin: 0; color: #4a5568; font-size: 12px;">© 2024 %s</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            """.formatted(friendName, amount, frontendUrl, appName);
    }

    private String buildPasswordResetTemplate(String resetLink) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f0f23;">
                <table role="presentation" style="width: 100%%; border-collapse: collapse;">
                    <tr>
                        <td align="center" style="padding: 40px 0;">
                            <table role="presentation" style="width: 600px; border-collapse: collapse; background: linear-gradient(135deg, #1a1a2e 0%%, #16213e 100%%); border-radius: 16px; overflow: hidden;">
                                
                                <tr>
                                    <td style="padding: 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%);">
                                        <h1 style="margin: 0; color: #ffffff; font-size: 24px;">🔐 Password Reset</h1>
                                    </td>
                                </tr>
                                
                                <tr>
                                    <td style="padding: 40px;">
                                        <p style="margin: 0 0 20px; color: #a0aec0; font-size: 16px; line-height: 1.6;">
                                            We received a request to reset your password. Click the button below to create a new password:
                                        </p>
                                        
                                        <table role="presentation" style="width: 100%%; margin: 30px 0;">
                                            <tr>
                                                <td align="center">
                                                    <a href="%s" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                                                        Reset Password
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <p style="margin: 0; color: #718096; font-size: 13px;">
                                            ⏰ This link expires in <strong>1 hour</strong>
                                        </p>
                                        <p style="margin: 10px 0 0; color: #718096; font-size: 13px;">
                                            If you didn't request this, please ignore this email.
                                        </p>
                                    </td>
                                </tr>
                                
                                <tr>
                                    <td style="padding: 20px; background: rgba(0,0,0,0.2); text-align: center;">
                                        <p style="margin: 0; color: #4a5568; font-size: 12px;">© 2024 %s</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            """.formatted(resetLink, appName);
    }
}
