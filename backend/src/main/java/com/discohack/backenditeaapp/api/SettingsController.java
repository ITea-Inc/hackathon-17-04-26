package com.discohack.backenditeaapp.api;

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * SettingsController — REST API для настроек приложения.
 *
 * Хранит настройки в памяти (in-memory). Для хакатона этого достаточно;
 * при перезапуске настройки сбрасываются к дефолтам.
 *
 * Endpoints:
 *   GET /api/settings          — получить текущие настройки
 *   PUT /api/settings          — сохранить настройки
 */
@Slf4j
@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    // Настройки хранятся в памяти
    @Getter
    private volatile String syncFrequency = "1d";

    @Getter
    private volatile long cacheSizeBytes = 5_368_709_120L; // 5 ГБ по умолчанию

    /**
     * GET /api/settings
     * Возвращает текущие настройки приложения.
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getSettings() {
        return ResponseEntity.ok(Map.of(
            "syncFrequency", syncFrequency,
            "cacheSizeBytes", cacheSizeBytes
        ));
    }

    /**
     * PUT /api/settings
     * Обновляет настройки приложения.
     * Принимает JSON с любыми из полей: syncFrequency, cacheSizeBytes.
     */
    @PutMapping
    public ResponseEntity<Map<String, Object>> updateSettings(
        @RequestBody Map<String, Object> body
    ) {
        if (body.containsKey("syncFrequency")) {
            syncFrequency = String.valueOf(body.get("syncFrequency"));
            log.info("Настройка syncFrequency обновлена: {}", syncFrequency);
        }
        if (body.containsKey("cacheSizeBytes")) {
            try {
                cacheSizeBytes = Long.parseLong(String.valueOf(body.get("cacheSizeBytes")));
                log.info("Настройка cacheSizeBytes обновлена: {}", cacheSizeBytes);
            } catch (NumberFormatException e) {
                log.warn("Некорректное значение cacheSizeBytes: {}", body.get("cacheSizeBytes"));
            }
        }
        return getSettings();
    }
}
