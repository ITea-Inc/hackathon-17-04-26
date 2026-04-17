package com.discohack.backenditeaapp.domain;

import com.discohack.backenditeaapp.persistance.entities.SyncRuleEntity;
import com.discohack.backenditeaapp.persistance.repository.SyncRuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * RuleEngine — движок разрешения политики синхронизации.
 *
 * Для заданного аккаунта и пути файла определяет, какая политика применяется.
 *
 * Алгоритм разрешения:
 *   1. Загружаем все правила для аккаунта, сортированные по priority DESC.
 *   2. Перебираем правила. Первое совпадающее (точное или префиксное) — победитель.
 *   3. Если ни одно правило не совпало — возвращаем ON_DEMAND (дефолт).
 *
 * Примеры соответствия:
 *   rule.pathPattern = "/Documents"  → совпадает с "/Documents", "/Documents/file.txt"
 *   rule.pathPattern = "/report.pdf" → совпадает только с "/report.pdf"
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RuleEngine {

    private final SyncRuleRepository ruleRepository;

    /**
     * Определить политику синхронизации для файла.
     *
     * @param accountId ID аккаунта
     * @param path      полный путь файла (например, "/Documents/report.pdf")
     * @return политика синхронизации
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
     * Проверяет, применяется ли шаблон правила к пути файла.
     *
     * Поддерживаются два вида совпадений:
     *   - Точное совпадение: pathPattern == path
     *   - Префиксное совпадение: path начинается с pathPattern + "/"
     *     (применяется ко всему содержимому папки)
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
