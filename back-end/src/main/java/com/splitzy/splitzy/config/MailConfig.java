package com.splitzy.splitzy.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Properties;

/**
 * Mail Configuration for Splitzy
 * 
 * Supports multiple email providers:
 * - Gmail SMTP (development)
 * - AWS SES (production - recommended)
 * - SendGrid
 * - Any SMTP server
 * 
 * Configuration via environment variables:
 * - SPRING_MAIL_HOST: SMTP server hostname
 * - SPRING_MAIL_PORT: SMTP port (587 for TLS, 465 for SSL)
 * - SPRING_MAIL_USERNAME: Email/API username
 * - SPRING_MAIL_PASSWORD: Email password or API key
 * 
 * Provider-specific settings:
 * 
 * Gmail:
 *   SPRING_MAIL_HOST=smtp.gmail.com
 *   SPRING_MAIL_PORT=587
 *   SPRING_MAIL_USERNAME=your-email@gmail.com
 *   SPRING_MAIL_PASSWORD=your-app-password (NOT your Gmail password!)
 * 
 * AWS SES:
 *   SPRING_MAIL_HOST=email-smtp.us-east-1.amazonaws.com
 *   SPRING_MAIL_PORT=587
 *   SPRING_MAIL_USERNAME=SMTP credentials from AWS SES
 *   SPRING_MAIL_PASSWORD=SMTP credentials from AWS SES
 * 
 * SendGrid:
 *   SPRING_MAIL_HOST=smtp.sendgrid.net
 *   SPRING_MAIL_PORT=587
 *   SPRING_MAIL_USERNAME=apikey
 *   SPRING_MAIL_PASSWORD=your-sendgrid-api-key
 */
@Configuration
public class MailConfig {

    private static final Logger logger = LoggerFactory.getLogger(MailConfig.class);

    @Value("${spring.mail.host:smtp.gmail.com}")
    private String mailHost;

    @Value("${spring.mail.port:587}")
    private int mailPort;

    @Value("${spring.mail.username}")
    private String mailUsername;

    @Value("${spring.mail.password}")
    private String mailPassword;

    @Value("${spring.mail.protocol:smtp}")
    private String mailProtocol;

    @Value("${spring.mail.properties.mail.smtp.auth:true}")
    private boolean smtpAuth;

    @Value("${spring.mail.properties.mail.smtp.starttls.enable:true}")
    private boolean startTlsEnable;

    @Value("${spring.mail.properties.mail.smtp.ssl.enable:false}")
    private boolean sslEnable;

    @Value("${spring.mail.properties.mail.debug:false}")
    private boolean mailDebug;

    @Bean
    public JavaMailSender getJavaMailSender() {
        logger.info("Initializing JavaMailSender with host: {}, port: {}", mailHost, mailPort);

        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost(mailHost);
        mailSender.setPort(mailPort);
        mailSender.setUsername(mailUsername);
        mailSender.setPassword(mailPassword);

        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", mailProtocol);
        props.put("mail.smtp.auth", String.valueOf(smtpAuth));
        props.put("mail.smtp.starttls.enable", String.valueOf(startTlsEnable));
        props.put("mail.smtp.ssl.enable", String.valueOf(sslEnable));
        props.put("mail.debug", String.valueOf(mailDebug));
        
        // Connection timeouts
        props.put("mail.smtp.connectiontimeout", "10000");
        props.put("mail.smtp.timeout", "10000");
        props.put("mail.smtp.writetimeout", "10000");

        // For AWS SES and some providers
        if (mailHost.contains("amazonaws.com")) {
            props.put("mail.smtp.starttls.required", "true");
            logger.info("AWS SES detected - enabling required TLS");
        }

        logger.info("Mail sender configured successfully for provider: {}", detectProvider());

        return mailSender;
    }

    private String detectProvider() {
        if (mailHost.contains("gmail")) return "Gmail";
        if (mailHost.contains("amazonaws")) return "AWS SES";
        if (mailHost.contains("sendgrid")) return "SendGrid";
        if (mailHost.contains("mailgun")) return "Mailgun";
        return "Custom SMTP";
    }
}
