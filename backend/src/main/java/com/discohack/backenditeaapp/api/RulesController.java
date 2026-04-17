package com.discohack.backenditeaapp.api;

import com.discohack.backenditeaapp.domain.RuleEngine;
import com.discohack.backenditeaapp.domain.SyncPolicy;
import com.discohack.backenditeaapp.persistance.entities.SyncRuleEntity;
import com.discohack.backenditeaapp.persistance.repository.SyncRuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    /** Тело запроса для создания/обновления правила. */
    record SyncRuleRequest(
        String accountId,
        String pathPattern,
        SyncPolicy policy,
        int priority
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

        return ResponseEntity.ok(ruleRepository.save(rule));
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
