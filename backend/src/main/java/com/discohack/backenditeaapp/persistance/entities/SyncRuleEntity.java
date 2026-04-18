package com.discohack.backenditeaapp.persistance.entities;

import com.discohack.backenditeaapp.domain.SyncPolicy;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Сущность правила синхронизации.
 * Содержит настройки политики синхронизации для конкретного пути в рамках аккаунта.
 */
@Entity
@Table(name = "sync_rules",
    uniqueConstraints = @UniqueConstraint(columnNames = {"account_id", "path_pattern"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SyncRuleEntity {

    @Id
    @Column(length = 36)
    private String id;

    /** UUID аккаунта, к которому относится правило. */
    @Column(name = "account_id", nullable = false, length = 36)
    private String accountId;

    /** Шаблон пути (точный путь файла или префикс директории). */
    @Column(name = "path_pattern", nullable = false)
    private String pathPattern;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private SyncPolicy policy;

    @Column(nullable = false)
    private int priority;

    /** Cron-выражение (используется только для политики SCHEDULED). */
    @Column(name = "cron_expression")
    private String cronExpression;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
