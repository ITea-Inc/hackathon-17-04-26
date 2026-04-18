package com.discohack.backenditeaapp.persistance.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "pinned_files",
    uniqueConstraints = @UniqueConstraint(columnNames = {"account_id", "path"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PinnedFileEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "account_id", nullable = false, length = 36)
    private String accountId;

    @Column(nullable = false)
    private String path;

    @Column(nullable = false, updatable = false)
    private Instant pinnedAt;

    @PrePersist
    void prePersist() {
        if (pinnedAt == null) pinnedAt = Instant.now();
    }
}
