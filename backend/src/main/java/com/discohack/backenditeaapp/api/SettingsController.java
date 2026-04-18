package com.discohack.backenditeaapp.api;

import com.discohack.backenditeaapp.persistance.settings.AppSettingsFileStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST API для управления настройками приложения.
 * Настройки сохраняются в локальный JSON-файл.
 */
@Slf4j
@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
public class SettingsController {

    private final AppSettingsFileStore settingsFileStore;

    private static final String KEY_SYNC_FREQ = "syncFrequency";
    private static final String KEY_CACHE_SIZE = "cacheSizeBytes";
    private static final String KEY_EXPLORER_REFRESH = "explorerRefreshSeconds";

    /**
     * Возвращает текущие настройки приложения.
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getSettings() {
        AppSettingsFileStore.SettingsData settings = settingsFileStore.read();
        String freq = settings.syncFrequency();
        long cache = settings.cacheSizeBytes();
        long refreshSeconds = settings.explorerRefreshSeconds();

        return ResponseEntity.ok(Map.of(
                "syncFrequency", freq,
                "cacheSizeBytes", cache,
                "explorerRefreshSeconds", refreshSeconds));
    }

    public long getCacheSizeBytes() {
        return settingsFileStore.read().cacheSizeBytes();
    }

    /**
     * Обновляет настройки приложения.
     */
    @PutMapping
    public ResponseEntity<Map<String, Object>> updateSettings(
            @RequestBody Map<String, Object> body) {
        AppSettingsFileStore.SettingsData current = settingsFileStore.read();
        String syncFrequency = current.syncFrequency();
        long cacheSizeBytes = current.cacheSizeBytes();
        long explorerRefreshSeconds = current.explorerRefreshSeconds();

        if (body.containsKey("syncFrequency")) {
            syncFrequency = String.valueOf(body.get("syncFrequency"));
            log.info("Настройка syncFrequency сохранена в файл: {}", syncFrequency);
        }

        if (body.containsKey("cacheSizeBytes")) {
            try {
                cacheSizeBytes = Long.parseLong(String.valueOf(body.get("cacheSizeBytes")));
                log.info("Настройка cacheSizeBytes сохранена в файл: {}", cacheSizeBytes);
            } catch (NumberFormatException e) {
                log.warn("Некорректное значение cacheSizeBytes: {}", body.get("cacheSizeBytes"));
            }
        }

        if (body.containsKey(KEY_EXPLORER_REFRESH)) {
            try {
                long requested = Long.parseLong(String.valueOf(body.get(KEY_EXPLORER_REFRESH)));
                if (AppSettingsFileStore.isAllowedExplorerRefreshSeconds(requested)) {
                    explorerRefreshSeconds = requested;
                    log.info("Настройка explorerRefreshSeconds сохранена в файл: {}", explorerRefreshSeconds);
                } else {
                    log.warn("Некорректное значение explorerRefreshSeconds: {}", body.get(KEY_EXPLORER_REFRESH));
                }
            } catch (NumberFormatException e) {
                log.warn("Некорректное значение explorerRefreshSeconds: {}", body.get(KEY_EXPLORER_REFRESH));
            }
        }

        settingsFileStore.write(new AppSettingsFileStore.SettingsData(syncFrequency, cacheSizeBytes, explorerRefreshSeconds));

        return getSettings();
    }
}
