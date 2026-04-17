package com.discohack.backenditeaapp.api;

import com.discohack.backenditeaapp.domain.RuleEngine;
import com.discohack.backenditeaapp.domain.SyncPolicy;
import com.discohack.backenditeaapp.persistance.entities.SyncRuleEntity;
import com.discohack.backenditeaapp.persistance.repository.SyncRuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * RulesController — REST API для управления правилами синхронизации.
 *
 * Endpoints:
 *   GET    /api/rules?accountId=...           — все правила для аккаунта
 *   POST   /api/rules                         — создать или обновить правило (upsert по accountId+path)
 *   PUT    /api/rules/{id}                    — обновить правило по ID
 *   DELETE /api/rules/{id}                    — удалить правило
 *   GET    /api/rules/resolve?accountId=...&path=... — получить эффективную политику для пути
 */
@Slf4j
@RestController
@RequestMapping("/api/rules")
@RequiredArgsConstructor
public class RulesController {

    private final SyncRuleRepository ruleRepository;
    private final RuleEngine ruleEngine;

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
     * GET /api/rules?accountId=...
     * Список всех правил для аккаунта.
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
     * POST /api/rules
     * Создать или обновить правило (upsert по accountId + pathPattern).
     * Если правило для данного пути уже существует — обновляем политику и приоритет.
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
            return ResponseEntity.ok(ruleRepository.save(rule));
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
     * POST /api/rules/presets
     * Применить пресет — создать набор типовых правил одним запросом.
     *
     * Типы пресетов:
     *   "documents_always"   — Documents/Документы всегда синхронизировать
     *   "media_on_demand"    — Фото/Видео только по запросу
     *   "backups_scheduled"  — Backup папка синхронизируется каждую ночь в 02:00
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
     * PUT /api/rules/{id}
     * Обновить политику и приоритет существующего правила.
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
     * DELETE /api/rules/{id}
     * Удалить правило.
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
     * GET /api/rules/resolve?accountId=...&path=...
     * Определить эффективную политику синхронизации для конкретного файла.
     * Используется фронтом для отображения текущего статуса синхронизации файла.
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
