package com.discohack.backenditeaapp.persistance.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "accounts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccountEntity {

    @Id
    @Column(length = 36)
    private String id;

    @Column(nullable = false, length = 32)
    private String provider;

    @Column(nullable = false)
    private String username;

    @Column(length = 512)
    private String serverUrl;  // для NextCloud: https://my-server.com

    @Column(nullable = false, length = 2048)
    private String accessToken;

    @Column(length = 2048)
    private String refreshToken;

    @Column(nullable = false)
    private String mountPath;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
