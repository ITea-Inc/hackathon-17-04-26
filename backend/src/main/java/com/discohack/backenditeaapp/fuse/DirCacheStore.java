package com.discohack.backenditeaapp.fuse;

import com.discohack.backenditeaapp.domain.CloudFile;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.*;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;

/**
 * Персистирует листинги директорий на диск для офлайн-доступа.
 * Файлы хранятся по пути ~/.cache/discohack/dirs/{accountId}/{sha256(path)}.json
 */
@Slf4j
@Component
public class DirCacheStore {

    private final Path cacheRoot;
    private final ObjectMapper objectMapper;

    public DirCacheStore(@Value("${user.home}") String userHome) {
        this.cacheRoot = Paths.get(userHome, ".cache", "discohack", "dirs");
        this.objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(cacheRoot);
        } catch (IOException e) {
            log.warn("Не удалось создать директорию кэша листингов: {}", e.getMessage());
        }
    }

    public void save(String accountId, String path, List<CloudFile> files) {
        try {
            Path dir = cacheRoot.resolve(accountId);
            Files.createDirectories(dir);
            objectMapper.writeValue(dir.resolve(toFileName(path)).toFile(), files);
        } catch (IOException e) {
            log.warn("Не удалось сохранить листинг директории {}: {}", path, e.getMessage());
        }
    }

    public Optional<List<CloudFile>> load(String accountId, String path) {
        try {
            Path file = cacheRoot.resolve(accountId).resolve(toFileName(path));
            if (!Files.exists(file)) return Optional.empty();
            List<CloudFile> files = objectMapper.readValue(
                file.toFile(),
                objectMapper.getTypeFactory().constructCollectionType(List.class, CloudFile.class)
            );
            log.debug("Офлайн-листинг загружен из кэша: {} ({} записей)", path, files.size());
            return Optional.of(files);
        } catch (IOException e) {
            log.warn("Не удалось загрузить листинг директории {}: {}", path, e.getMessage());
            return Optional.empty();
        }
    }

    /** Инвалидация при удалении/переименовании директории. */
    public void invalidate(String accountId, String path) {
        try {
            Files.deleteIfExists(cacheRoot.resolve(accountId).resolve(toFileName(path)));
        } catch (IOException ignored) {}
    }

    private String toFileName(String path) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(path.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString() + ".json";
        } catch (Exception e) {
            return path.replace("/", "_") + ".json";
        }
    }
}
