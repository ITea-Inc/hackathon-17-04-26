package com.discohack.backenditeaapp.domain;

import com.discohack.backenditeaapp.persistance.entities.SyncRuleEntity;
import com.discohack.backenditeaapp.persistance.repository.SyncRuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Сервис разрешения политик синхронизации для файлов.
 * Определяет применяемую политику на основе наибольшего приоритета и совпадения пути.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RuleEngine {

    private final SyncRuleRepository ruleRepository;

    /**
     * Разрешает политику синхронизации для указанного пути и аккаунта.
     */
    public SyncPolicy resolvePolicy(String accountId, String path) {
        List<SyncRuleEntity> rules = ruleRepository.findByAccountIdOrderByPriorityDesc(accountId);

        for (SyncRuleEntity rule : rules) {
            if (matches(rule.getPathPattern(), path)) {
                log.debug("resolvePolicy: {} → {} (правило: {})", path, rule.getPolicy(), rule.getPathPattern());
                return rule.getPolicy();
            }
        }

        log.debug("resolvePolicy: {} → ON_DEMAND (нет совпадений)", path);
        return SyncPolicy.ON_DEMAND;
    }

    /**
     * Проверяет соответствие пути заданному шаблону (точное или префиксное).
     */
    private boolean matches(String pathPattern, String path) {
        if (pathPattern.equals(path)) {
            return true;
        }
        // Если паттерн — папка, совпадает с любым файлом внутри
        String prefix = pathPattern.endsWith("/") ? pathPattern : pathPattern + "/";
        return path.startsWith(prefix);
    }
}
