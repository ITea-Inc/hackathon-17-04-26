package com.discohack.backenditeaapp.api;

import com.discohack.backenditeaapp.domain.RuleEngine;
import com.discohack.backenditeaapp.domain.SyncPolicy;
import com.discohack.backenditeaapp.persistance.entities.SyncRuleEntity;
import com.discohack.backenditeaapp.persistance.repository.SyncRuleRepository;
import com.discohack.backenditeaapp.sync.FileSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * REST API для управления правилами синхронизации.
 */
@Slf4j
@RestController
@RequestMapping("/api/rules")
@RequiredArgsConstructor
public class RulesController {

    private final SyncRuleRepository ruleRepository;
    private final RuleEngine ruleEngine;
    private final FileSyncService fileSyncService;

    record SyncRuleRequest(
        String accountId,
        String pathPattern,
        SyncPolicy policy,
        int priority,
        String cronExpression   // только для SCHEDULED, для остальных null
    ) {}

    record PresetRequest(
        String accountId,
        String presetType   // "documents_always" | "media_on_demand" | "backups_scheduled"
    ) {}

    /**
     * Возвращает список всех правил для аккаунта.
     */
    @GetMapping
    public ResponseEntity<List<SyncRuleEntity>> listRules(
        @RequestParam String accountId
    ) {
        return ResponseEntity.ok(
            ruleRepository.findByAccountIdOrderByPriorityDesc(accountId)
        );
    }

    /**
     * Создает или обновляет правило (upsert по accountId + pathPattern).
     */
    @PostMapping
    public ResponseEntity<SyncRuleEntity> upsertRule(@RequestBody SyncRuleRequest request) {
        log.info("upsertRule: accountId={} path={} policy={}",
            request.accountId(), request.pathPattern(), request.policy());

        SyncRuleEntity rule = ruleRepository
            .findByAccountIdAndPathPattern(request.accountId(), request.pathPattern())
            .orElseGet(() -> SyncRuleEntity.builder()
                .id(UUID.randomUUID().toString())
                .accountId(request.accountId())
                .pathPattern(request.pathPattern())
                .build()
            );

        rule.setPolicy(request.policy());
        rule.setPriority(request.priority());
        rule.setCronExpression(request.cronExpression());

        try {
            SyncRuleEntity saved = ruleRepository.save(rule);
            if (saved.getPolicy() == SyncPolicy.ALWAYS) {
                fileSyncService.syncAsync(saved.getAccountId(), saved.getPathPattern());
            }
            return ResponseEntity.ok(saved);
        } catch (DataIntegrityViolationException e) {
            log.warn("upsertRule: конкурентная вставка для {}/{}, повторная попытка", request.accountId(), request.pathPattern());
            return ruleRepository.findByAccountIdAndPathPattern(request.accountId(), request.pathPattern())
                .map(existing -> {
                    existing.setPolicy(request.policy());
                    existing.setPriority(request.priority());
                    existing.setCronExpression(request.cronExpression());
                    return ResponseEntity.ok(ruleRepository.save(existing));
                })
                .orElseGet(() -> ResponseEntity.status(409).build());
        }
    }

    /**
     * Применяет пресет — создает набор типовых правил одним запросом.
     */
    @PostMapping("/presets")
    public ResponseEntity<?> applyPreset(@RequestBody PresetRequest request) {
        log.info("applyPreset: accountId={} preset={}", request.accountId(), request.presetType());

        List<SyncRuleEntity> toSave;
        try {
            toSave = switch (request.presetType()) {
                case "documents_always" -> List.of(
                    buildRule(request.accountId(), "/Documents",  SyncPolicy.ALWAYS, 10, null),
                    buildRule(request.accountId(), "/Документы", SyncPolicy.ALWAYS, 10, null)
                );
                case "media_on_demand" -> List.of(
                    buildRule(request.accountId(), "/Photos", SyncPolicy.ON_DEMAND, 5, null),
                    buildRule(request.accountId(), "/Фото",   SyncPolicy.ON_DEMAND, 5, null),
                    buildRule(request.accountId(), "/Videos", SyncPolicy.ON_DEMAND, 5, null),
                    buildRule(request.accountId(), "/Видео",  SyncPolicy.ON_DEMAND, 5, null)
                );
                case "backups_scheduled" -> List.of(
                    buildRule(request.accountId(), "/Backup", SyncPolicy.SCHEDULED, 8, "0 0 2 * * *"),
                    buildRule(request.accountId(), "/backup", SyncPolicy.SCHEDULED, 8, "0 0 2 * * *"),
                    buildRule(request.accountId(), "/Бэкап", SyncPolicy.SCHEDULED, 8, "0 0 2 * * *")
                );
                default -> throw new IllegalArgumentException("Неизвестный пресет: " + request.presetType());
            };
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }

        List<SyncRuleEntity> saved = toSave.stream()
            .map(rule -> ruleRepository
                .findByAccountIdAndPathPattern(rule.getAccountId(), rule.getPathPattern())
                .map(existing -> {
                    existing.setPolicy(rule.getPolicy());
                    existing.setPriority(rule.getPriority());
                    existing.setCronExpression(rule.getCronExpression());
                    return ruleRepository.save(existing);
                })
                .orElseGet(() -> ruleRepository.save(rule))
            )
            .toList();

        return ResponseEntity.ok(saved);
    }

    private SyncRuleEntity buildRule(String accountId, String path,
                                     SyncPolicy policy, int priority, String cron) {
        return SyncRuleEntity.builder()
            .id(UUID.randomUUID().toString())
            .accountId(accountId)
            .pathPattern(path)
            .policy(policy)
            .priority(priority)
            .cronExpression(cron)
            .build();
    }

    /**
     * Обновляет политику и приоритет существующего правила.
     */
    @PutMapping("/{id}")
    public ResponseEntity<SyncRuleEntity> updateRule(
        @PathVariable String id,
        @RequestBody SyncRuleRequest request
    ) {
        return ruleRepository.findById(id).map(rule -> {
            rule.setPolicy(request.policy());
            rule.setPriority(request.priority());
            log.info("updateRule: id={} policy={}", id, request.policy());
            return ResponseEntity.ok(ruleRepository.save(rule));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * Удаляет правило.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteRule(@PathVariable String id) {
        if (!ruleRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        ruleRepository.deleteById(id);
        log.info("deleteRule: id={}", id);
        return ResponseEntity.ok(Map.of("message", "Правило удалено"));
    }

    /**
     * Определяет эффективную политику синхронизации для конкретного файла.
     */
    @GetMapping("/resolve")
    public ResponseEntity<Map<String, String>> resolvePolicy(
        @RequestParam String accountId,
        @RequestParam String path
    ) {
        SyncPolicy policy = ruleEngine.resolvePolicy(accountId, path);
        return ResponseEntity.ok(Map.of(
            "accountId", accountId,
            "path", path,
            "policy", policy.name()
        ));
    }
}
