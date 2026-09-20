package com.faeiq.ClothNCare;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ClothNCareApplication {

	public static void main(String[] args) {
		SpringApplication.run(ClothNCareApplication.class, args);
	}

}
