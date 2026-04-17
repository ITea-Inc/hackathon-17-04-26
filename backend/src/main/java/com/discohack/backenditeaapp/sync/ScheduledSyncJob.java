package com.discohack.backenditeaapp.sync;

import com.discohack.backenditeaapp.cloud.CloudProvider;
import com.discohack.backenditeaapp.cloud.CloudProviderException;
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
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * ScheduledSyncJob — выполняет синхронизацию по расписанию.
 *
 * Каждую минуту проверяет все правила с политикой SCHEDULED.
 * Для каждого правила смотрит на cron-выражение и время последнего запуска.
 * Если пришло время — запускает синхронизацию для этой папки.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ScheduledSyncJob {

    private final SyncRuleRepository ruleRepository;
    private final CloudProviderRegistry providerRegistry;
    private final EventBroadcaster broadcaster;

    // Время последней синхронизации для каждого правила (ruleId → Instant)
    // Хранится в памяти — при рестарте все правила синхронизируются заново
    private final ConcurrentHashMap<String, Instant> lastSyncTime = new ConcurrentHashMap<>();

    /**
     * Основной тик планировщика — каждую минуту.
     * @EnableScheduling в BackendIteaAppApplication активирует этот метод.
     */
    @Scheduled(fixedDelay = 60_000)
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
     * Проверяет, нужно ли сейчас запускать синхронизацию для правила.
     *
     * Логика: берём время последнего запуска (или начало эпохи если ни разу не запускали),
     * вычисляем следующий момент по cron-выражению, смотрим не наступил ли он.
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
     * Выполняет синхронизацию для одного правила:
     * — находит провайдер аккаунта
     * — листит файлы по pathPattern
     * — шлёт WebSocket-событие фронту
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
        try {
            int fileCount = provider.listDirectory(rule.getPathPattern()).size();

            broadcaster.publish(com.discohack.backenditeaapp.ws.SyncEvent.builder()
                .type("scheduled_sync_done")
                .accountId(rule.getAccountId())
                .path(rule.getPathPattern())
                .data(Map.of("fileCount", fileCount, "cron", rule.getCronExpression()))
                .build());

            log.info("Scheduled sync завершён: {} файлов в {}", fileCount, rule.getPathPattern());

        } catch (CloudProviderException e) {
            broadcaster.publishError(rule.getAccountId(), rule.getPathPattern(), e.getMessage());
            log.error("Scheduled sync ошибка для {}: {}", rule.getPathPattern(), e.getMessage());
        }
    }
}
