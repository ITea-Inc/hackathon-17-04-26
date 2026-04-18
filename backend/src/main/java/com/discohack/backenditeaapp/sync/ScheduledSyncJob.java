package com.discohack.backenditeaapp.sync;

import com.discohack.backenditeaapp.cloud.CloudProvider;
import com.discohack.backenditeaapp.cloud.CloudProviderRegistry;
import com.discohack.backenditeaapp.domain.SyncPolicy;
import com.discohack.backenditeaapp.persistance.entities.SyncRuleEntity;
import com.discohack.backenditeaapp.persistance.repository.SyncRuleRepository;
import com.discohack.backenditeaapp.ws.EventBroadcaster;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Фоновое задание для выполнения синхронизации по расписанию (cron).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ScheduledSyncJob {

    private final SyncRuleRepository ruleRepository;
    private final CloudProviderRegistry providerRegistry;
    private final EventBroadcaster broadcaster;
    private final FileSyncService fileSyncService;

    /** Хранилище времени последней синхронизации (в памяти). */
    private final ConcurrentHashMap<String, Instant> lastSyncTime = new ConcurrentHashMap<>();

    /**
     * Основной цикл планировщика (выполняется каждые 10 секунд).
     */
    @Scheduled(fixedDelay = 10_000)
    public void tick() {
        List<SyncRuleEntity> scheduledRules = ruleRepository.findByPolicy(SyncPolicy.SCHEDULED);
        if (scheduledRules.isEmpty()) return;

        Instant now = Instant.now();
        log.debug("ScheduledSyncJob tick: проверяем {} правил", scheduledRules.size());

        for (SyncRuleEntity rule : scheduledRules) {
            if (shouldRunNow(rule, now)) {
                performSync(rule);
                lastSyncTime.put(rule.getId(), now);
            }
        }
    }

    /**
     * Проверяет наступление времени синхронизации на основе cron-выражения.
     */
    private boolean shouldRunNow(SyncRuleEntity rule, Instant now) {
        String cronExpr = rule.getCronExpression();
        if (cronExpr == null || cronExpr.isBlank()) {
            log.warn("Правило {} (SCHEDULED) без cron-выражения — пропускаем", rule.getId());
            return false;
        }

        try {
            CronExpression cron = CronExpression.parse(cronExpr);
            Instant lastRun = lastSyncTime.getOrDefault(rule.getId(), Instant.EPOCH);
            LocalDateTime lastRunLdt = LocalDateTime.ofInstant(lastRun, ZoneId.systemDefault());
            LocalDateTime nextRun = cron.next(lastRunLdt);

            if (nextRun == null) return false;

            Instant nextRunInstant = nextRun.atZone(ZoneId.systemDefault()).toInstant();
            return !nextRunInstant.isAfter(now);

        } catch (Exception e) {
            log.warn("Невалидное cron-выражение '{}' у правила {}: {}", cronExpr, rule.getId(), e.getMessage());
            return false;
        }
    }

    /**
     * Запускает синхронизацию для указанного правила.
     */
    private void performSync(SyncRuleEntity rule) {
        log.info("Scheduled sync: аккаунт={} путь={} cron={}",
            rule.getAccountId(), rule.getPathPattern(), rule.getCronExpression());

        providerRegistry.findById(rule.getAccountId()).ifPresentOrElse(
            provider -> syncPath(provider, rule),
            () -> log.warn("Провайдер для аккаунта {} не найден (аккаунт отключён?)", rule.getAccountId())
        );
    }

    private void syncPath(CloudProvider provider, SyncRuleEntity rule) {
        fileSyncService.syncSync(provider, rule.getAccountId(), rule.getPathPattern());
    }
}
