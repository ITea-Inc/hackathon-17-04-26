package com.discohack.backenditeaapp.fuse;

import com.discohack.backenditeaapp.api.SettingsController;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.io.*;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Управляет дисковым кэшированием скачанных файлов.
 * Реализует LRU-вытеснение при превышении лимита размера кэша.
 */
@Slf4j
@Component
public class FileCacheManager {

    private final Path cacheRoot;
    private final SettingsController settingsController;

    // ключ: "accountId:путь" → запись с локальным путём, размером, временем доступа
    private final ConcurrentHashMap<String, CacheEntry> index = new ConcurrentHashMap<>();
    private final AtomicLong totalCachedBytes = new AtomicLong(0);

    // защищает от параллельного скачивания одного и того же файла
    private final ConcurrentHashMap<String, Object> inProgress = new ConcurrentHashMap<>();
    private static final Object SENTINEL = new Object();

    public FileCacheManager(SettingsController settingsController,
                            @Value("${user.home}") String userHome) {
        this.settingsController = settingsController;
        this.cacheRoot = Paths.get(userHome, ".cache", "discohack", "files");
    }

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(cacheRoot);
            rebuildIndex();
            log.info("Кэш файлов инициализирован: {}, записей: {}", cacheRoot, index.size());
        } catch (IOException e) {
            log.error("Не удалось создать директорию кэша: {}", e.getMessage());
        }
    }

    private void rebuildIndex() {
        if (!Files.exists(cacheRoot)) return;
        try {
            Files.walk(cacheRoot, 2)
                .filter(p -> p.toString().endsWith(".meta"))
                .forEach(metaPath -> {
                    try {
                        String[] parts = Files.readString(metaPath).split("\n", 2);
                        if (parts.length < 2) return;
                        String accountId = parts[0].trim();
                        String cloudPath = parts[1].trim();
                        Path dataFile = Path.of(metaPath.toString().replace(".meta", ""));
                        if (Files.exists(dataFile)) {
                            long size = Files.size(dataFile);
                            index.put(key(accountId, cloudPath), new CacheEntry(dataFile, size));
                            totalCachedBytes.addAndGet(size);
                        }
                    } catch (IOException e) {
                        log.warn("Пропускаем повреждённый .meta файл: {}", metaPath);
                    }
                });
        } catch (IOException e) {
            log.warn("Не удалось восстановить индекс кэша: {}", e.getMessage());
        }
    }

    /**
     * Возвращает путь к локальному файлу, если он закэширован.
     * Обновляет время последнего доступа (для LRU).
     */
    public Optional<Path> get(String accountId, String path) {
        String key = key(accountId, path);
        CacheEntry entry = index.get(key);
        if (entry == null) return Optional.empty();

        if (!Files.exists(entry.localPath)) {
            // файл был удалён снаружи — убираем из индекса
            index.remove(key);
            totalCachedBytes.addAndGet(-entry.size);
            return Optional.empty();
        }

        entry.lastAccess = System.currentTimeMillis();
        return Optional.of(entry.localPath);
    }

    /**
     * Сохраняет содержимое файла на диск.
     * Если параллельно уже идёт сохранение того же файла — пропускает.
     */
    public void put(String accountId, String path, InputStream data) {
        String key = key(accountId, path);

        if (inProgress.putIfAbsent(key, SENTINEL) != null) {
            log.debug("put: {} уже скачивается, пропускаем", path);
            return;
        }

        try {
            Path dir = cacheRoot.resolve(accountId);
            Files.createDirectories(dir);
            Path file = dir.resolve(toFileName(path));

            // вытесняем старые файлы заранее (приблизительно, не знаем точный размер)
            evictIfNeeded(0);

            Files.copy(data, file, StandardCopyOption.REPLACE_EXISTING);
            long actualSize = Files.size(file);

            Path metaFile = Path.of(file + ".meta");
            Files.writeString(metaFile, accountId + "\n" + path);

            CacheEntry old = index.put(key, new CacheEntry(file, actualSize));
            if (old != null) totalCachedBytes.addAndGet(-old.size);
            totalCachedBytes.addAndGet(actualSize);

            // проверяем лимит ещё раз с реальным размером
            evictIfNeeded(0);

            log.debug("Закэширован: {} ({} байт), итого кэш: {} байт", path, actualSize, totalCachedBytes.get());
        } catch (IOException e) {
            log.warn("Не удалось закэшировать {}: {}", path, e.getMessage());
        } finally {
            inProgress.remove(key);
        }
    }

    /**
     * Удаляет файл из кэша — вызывается при изменении, удалении или переименовании.
     */
    public void invalidate(String accountId, String path) {
        String key = key(accountId, path);
        CacheEntry entry = index.remove(key);
        if (entry != null) {
            totalCachedBytes.addAndGet(-entry.size);
            try {
                Files.deleteIfExists(entry.localPath);
                Files.deleteIfExists(Path.of(entry.localPath + ".meta"));
                log.debug("Инвалидирован кэш: {}", path);
            } catch (IOException ignored) {}
        }
    }

    public long getTotalCachedBytes() {
        return totalCachedBytes.get();
    }

    /**
     * LRU-вытеснение: удаляет старейшие файлы пока суммарный размер не войдёт в лимит.
     */
    private void evictIfNeeded(long incomingSize) {
        long limit = settingsController.getCacheSizeBytes();
        if (totalCachedBytes.get() + incomingSize <= limit) return;

        List<Map.Entry<String, CacheEntry>> entries = new ArrayList<>(index.entrySet());
        entries.sort(Comparator.comparingLong(e -> e.getValue().lastAccess));

        for (Map.Entry<String, CacheEntry> e : entries) {
            if (totalCachedBytes.get() + incomingSize <= limit) break;
            CacheEntry removed = index.remove(e.getKey());
            if (removed != null) {
                totalCachedBytes.addAndGet(-removed.size);
                try {
                    Files.deleteIfExists(removed.localPath);
                    log.debug("LRU-вытеснен: {}", e.getKey());
                } catch (IOException ignored) {}
            }
        }
    }

    private String key(String accountId, String path) {
        return accountId + ":" + path;
    }

    /** SHA-256 от пути — безопасное имя файла без проблем с разделителями */
    private String toFileName(String path) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(path.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            return path.replace("/", "_");
        }
    }

    private static class CacheEntry {
        final Path localPath;
        final long size;
        volatile long lastAccess;

        CacheEntry(Path localPath, long size) {
            this.localPath = localPath;
            this.size = size;
            this.lastAccess = System.currentTimeMillis();
        }
    }
}
