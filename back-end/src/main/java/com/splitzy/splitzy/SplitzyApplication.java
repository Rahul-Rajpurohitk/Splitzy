package com.splitzy.splitzy;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class SplitzyApplication {

	private static final Logger logger = LoggerFactory.getLogger(SplitzyApplication.class);

	public static void main(String[] args) {
		logger.info("Starting Splitzy Application");
		SpringApplication.run(SplitzyApplication.class, args);
	}
}
