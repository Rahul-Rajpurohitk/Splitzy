package com.splitzy.splitzy.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Properties;

@Configuration
public class MailConfig {

    private static final Logger logger = LoggerFactory.getLogger(MailConfig.class);

    @Value("${spring.mail.username}")
    private String mailUsername;

    @Value("${spring.mail.password}")
    private String mailPassword;

    @Bean
    public JavaMailSender getJavaMailSender() {

        logger.info("Initializing JavaMailSender bean with SMTP configuration.");

        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost("smtp.gmail.com");
        mailSender.setPort(587);
        logger.debug("Configuring mail sender with username: {}", mailUsername);
        logger.debug("Configuring mail sender with password: {}", mailPassword);

        mailSender.setUsername(mailUsername); // Use @Value-injected value
        mailSender.setPassword(mailPassword); // Use @Value-injected value

        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.debug", "true");

        logger.info("Mail sender configured successfully.");

        return mailSender;
    }
}

