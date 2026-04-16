package com.hackathon.springcrudjwtstarterproject.dto.response;

import jakarta.validation.constraints.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
public class UserResponse {
    private Long id;

    private String username;

    private String email;

    private LocalDateTime createdAt;
}
