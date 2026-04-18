package com.discohack.backenditeaapp.persistance.settings;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Objects;
import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class AppSettingsFileStore {

    private static final String DEFAULT_SYNC_FREQUENCY = "1d";
    private static final long DEFAULT_CACHE_SIZE_BYTES = 5_368_709_120L;
    private static final long DEFAULT_EXPLORER_REFRESH_SECONDS = 30L;
    private static final Set<Long> ALLOWED_EXPLORER_REFRESH_SECONDS = Set.of(10L, 15L, 30L, 60L);

    private final ObjectMapper objectMapper;
    private final Object lock = new Object();

    private final Path settingsPath = Path.of(
        System.getProperty("user.home"),
        ".config",
        "discohack",
        "settings.json"
    );

    @PostConstruct
    void init() {
        synchronized (lock) {
            SettingsData loaded = readInternal();
            writeInternal(loaded);
        }
    }

    public SettingsData read() {
        synchronized (lock) {
            return readInternal();
        }
    }

    public void write(SettingsData data) {
        synchronized (lock) {
            writeInternal(data);
        }
    }

    private SettingsData readInternal() {
        if (Files.notExists(settingsPath)) {
            return SettingsData.defaults();
        }

        try {
            SettingsData fromFile = objectMapper.readValue(settingsPath.toFile(), SettingsData.class);
            if (fromFile == null) {
                return SettingsData.defaults();
            }
            return fromFile.withDefaults();
        } catch (IOException e) {
            log.warn("Не удалось прочитать настройки из {}: {}", settingsPath, e.getMessage());
            return SettingsData.defaults();
        }
    }

    private void writeInternal(SettingsData data) {
        try {
            Files.createDirectories(settingsPath.getParent());
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(settingsPath.toFile(), data.withDefaults());
        } catch (IOException e) {
            throw new IllegalStateException("Не удалось сохранить настройки в " + settingsPath, e);
        }
    }

    public static boolean isAllowedExplorerRefreshSeconds(long seconds) {
        return ALLOWED_EXPLORER_REFRESH_SECONDS.contains(seconds);
    }

    public record SettingsData(String syncFrequency, Long cacheSizeBytes, Long explorerRefreshSeconds) {
        public static SettingsData defaults() {
            return new SettingsData(
                DEFAULT_SYNC_FREQUENCY,
                DEFAULT_CACHE_SIZE_BYTES,
                DEFAULT_EXPLORER_REFRESH_SECONDS
            );
        }

        public SettingsData withDefaults() {
            return new SettingsData(
                Objects.requireNonNullElse(syncFrequency, DEFAULT_SYNC_FREQUENCY),
                Objects.requireNonNullElse(cacheSizeBytes, DEFAULT_CACHE_SIZE_BYTES),
                Objects.requireNonNullElse(explorerRefreshSeconds, DEFAULT_EXPLORER_REFRESH_SECONDS)
            );
        }
    }
}
