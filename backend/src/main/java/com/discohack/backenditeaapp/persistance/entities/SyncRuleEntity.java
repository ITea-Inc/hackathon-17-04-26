package com.discohack.backenditeaapp.persistance.entities;

import com.discohack.backenditeaapp.domain.SyncPolicy;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * SyncRuleEntity — правило синхронизации для файла или папки.
 *
 * Правило привязано к конкретному аккаунту ({@code accountId}) и пути ({@code pathPattern}).
 * Определяет политику синхронизации: ALWAYS, ON_DEMAND, MANUAL или SCHEDULED.
 *
 * При разрешении политики для файла движок ({@link com.discohack.backenditeaapp.domain.RuleEngine})
 * выбирает правило с наибольшим {@code priority}, чей {@code pathPattern} совпадает с путём.
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

    /**
     * Шаблон пути: точный путь или префикс папки.
     * Примеры: "/Documents/report.pdf", "/Documents"
     */
    @Column(name = "path_pattern", nullable = false)
    private String pathPattern;

    /** Политика синхронизации. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private SyncPolicy policy;

    /**
     * Приоритет правила: чем выше число — тем выше приоритет.
     * При конфликте (несколько совпадающих правил) победит правило с наибольшим priority.
     */
    @Column(nullable = false)
    private int priority;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
