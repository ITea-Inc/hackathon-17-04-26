package com.discohack.backenditeaapp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class BackendIteaAppApplication {

    public static void main(String[] args) {
        SpringApplication.run(BackendIteaAppApplication.class, args);
    }

}
