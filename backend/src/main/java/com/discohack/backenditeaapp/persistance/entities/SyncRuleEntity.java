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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private SyncPolicy policy;

    @Column(nullable = false)
    private int priority;

    // Cron-выражение для политики SCHEDULED. Null для остальных политик.
    // Формат Spring: "секунды минуты часы день_месяца месяц день_недели"
    // Пример: "0 0 2 * * *" = каждый день в 02:00
    @Column(name = "cron_expression")
    private String cronExpression;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
