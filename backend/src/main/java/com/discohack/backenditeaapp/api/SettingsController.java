package com.discohack.backenditeaapp.api;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST API для управления настройками приложения.
 * Примечание: Настройки хранятся в памяти (in-memory) и сбрасываются при перезапуске сервера.
 */
@Slf4j
@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
public class SettingsController {

    private final com.discohack.backenditeaapp.persistance.repository.AppSettingsRepository repository;

    private static final String KEY_SYNC_FREQ = "syncFrequency";
    private static final String KEY_CACHE_SIZE = "cacheSizeBytes";

    /**
     * Возвращает текущие настройки приложения.
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getSettings() {
        String freq = repository.findById(KEY_SYNC_FREQ)
            .map(com.discohack.backenditeaapp.persistance.entities.AppSettingsEntity::getValue)
            .orElse("1d");
            
        long cache = repository.findById(KEY_CACHE_SIZE)
            .map(e -> Long.parseLong(e.getValue()))
            .orElse(5_368_709_120L);

        return ResponseEntity.ok(Map.of(
                "syncFrequency", freq,
                "cacheSizeBytes", cache));
    }

    public long getCacheSizeBytes() {
        return repository.findById(KEY_CACHE_SIZE)
            .map(e -> Long.parseLong(e.getValue()))
            .orElse(5_368_709_120L);
    }

    /**
     * Обновляет настройки приложения.
     */
    @PutMapping
    public ResponseEntity<Map<String, Object>> updateSettings(
            @RequestBody Map<String, Object> body) {
        
        if (body.containsKey("syncFrequency")) {
            String val = String.valueOf(body.get("syncFrequency"));
            repository.save(new com.discohack.backenditeaapp.persistance.entities.AppSettingsEntity(KEY_SYNC_FREQ, val));
            log.info("Настройка syncFrequency сохранена в БД: {}", val);
        }
        
        if (body.containsKey("cacheSizeBytes")) {
            try {
                String val = String.valueOf(body.get("cacheSizeBytes"));
                Long.parseLong(val); // проверка формата
                repository.save(new com.discohack.backenditeaapp.persistance.entities.AppSettingsEntity(KEY_CACHE_SIZE, val));
                log.info("Настройка cacheSizeBytes сохранена в БД: {}", val);
            } catch (NumberFormatException e) {
                log.warn("Некорректное значение cacheSizeBytes: {}", body.get("cacheSizeBytes"));
            }
        }
        
        return getSettings();
    }
}
