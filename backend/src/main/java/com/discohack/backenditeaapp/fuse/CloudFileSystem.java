package com.discohack.backenditeaapp.fuse;

import com.discohack.backenditeaapp.cloud.CloudProvider;
import com.discohack.backenditeaapp.cloud.CloudProviderException;
import com.discohack.backenditeaapp.domain.CloudFile;
import com.discohack.backenditeaapp.domain.RuleEngine;
import com.discohack.backenditeaapp.domain.SyncPolicy;
import com.discohack.backenditeaapp.ws.EventBroadcaster;
import jnr.ffi.Pointer;
import jnr.ffi.types.off_t;
import jnr.ffi.types.size_t;
import lombok.extern.slf4j.Slf4j;
import ru.serce.jnrfuse.ErrorCodes;
import ru.serce.jnrfuse.FuseFillDir;
import ru.serce.jnrfuse.FuseStubFS;
import ru.serce.jnrfuse.struct.FileStat;
import ru.serce.jnrfuse.struct.FuseFileInfo;

import java.io.InputStream;
import java.io.RandomAccessFile;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Реализация виртуальной файловой системы FUSE для облачного провайдера.
 * Обертка над {@link CloudProvider} для интеграции с файловой системой Linux.
 * Все методы FUSE возвращают 0 при успехе или отрицательный код ошибки (errno).
 */
@Slf4j
public class CloudFileSystem extends FuseStubFS {

    private final CloudProvider provider;
    private final EventBroadcaster broadcaster;
    private final RuleEngine ruleEngine;
    private final String accountId;
    private final FileCacheManager fileCache;

    private final ConcurrentHashMap<String, CachedEntry<CloudFile>> fileInfoCache
            = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, CachedEntry<List<CloudFile>>> dirCache
            = new ConcurrentHashMap<>();

    private static final long CACHE_TTL_MS = 300_000; // 5 минут

    private final ConcurrentHashMap<String, byte[]> writeBuffers
            = new ConcurrentHashMap<>();

    public CloudFileSystem(CloudProvider provider, EventBroadcaster broadcaster,
                           RuleEngine ruleEngine, String accountId, FileCacheManager fileCache) {
        this.provider = provider;
        this.broadcaster = broadcaster;
        this.ruleEngine = ruleEngine;
        this.accountId = accountId;
        this.fileCache = fileCache;
    }



    /**
     * Возвращает метаданные файла или директории (stat).
     *
     * @return 0 при успехе, отрицательный код ошибки (напр. -ENOENT) при сбое.
     */
    @Override
    public int getattr(String path, FileStat stat) {
        log.debug("getattr: {}", path);

        try {
            if ("/".equals(path)) {
                fillDirStat(stat, Instant.now());
                return 0;
            }

            // Файл сейчас пишется — возвращаем размер буфера, не идём в облако.
            // Без этого новосозданный файл получал бы ENOENT пока не загружен.
            byte[] inProgress = writeBuffers.get(path);
            if (inProgress != null) {
                fillFileStat(stat, inProgress.length, Instant.now());
                return 0;
            }

            // Проверяем кеш
            Optional<CloudFile> cachedFile = getCachedFileInfo(path);
            CloudFile file;

            if (cachedFile.isPresent()) {
                file = cachedFile.get();
            } else {
                // Кеш промах — запрашиваем у провайдера
                Optional<CloudFile> providerFile = provider.getFileInfo(path);
                if (providerFile.isEmpty()) {
                    return -ErrorCodes.ENOENT();  // Файл не найден
                }
                file = providerFile.get();
                // Кешируем результат
                fileInfoCache.put(path, new CachedEntry<>(file));
            }

            // Заполняем структуру stat
            if (file.isDirectory()) {
                fillDirStat(stat, file.getLastModified());
            } else {
                fillFileStat(stat, file.getSize(), file.getLastModified());
            }

            return 0;  // Успех

        } catch (CloudProviderException e) {
            log.error("getattr ошибка для {}: {}", path, e.getMessage());
            return e.toFuseErrorCode();
        } catch (Exception e) {
            log.error("getattr неожиданная ошибка для {}: {}", path, e.getMessage());
            return -ErrorCodes.EIO();
        }
    }



    /**
     * Возвращает список файлов и директорий внутри указанного пути.
     */
    @Override
    public int readdir(String path, Pointer buf, FuseFillDir filler,
                       @off_t long offset, FuseFileInfo fi) {
        log.debug("readdir: {}", path);

        try {
            // "." и ".." — обязательные записи в любой папке
            // Без них некоторые программы ломаются
            filler.apply(buf, ".", null, 0);
            filler.apply(buf, "..", null, 0);

            // Проверяем кеш директорий
            List<CloudFile> files = getCachedDirListing(path);

            if (files == null) {
                files = provider.listDirectory(path);
                dirCache.put(path, new CachedEntry<>(files));
            }

            // Добавляем каждый файл/папку в листинг
            for (CloudFile file : files) {
                filler.apply(buf, file.getName(), null, 0);
                // Заодно кешируем метаданные каждого файла
                fileInfoCache.put(file.getPath(), new CachedEntry<>(file));
            }

            return 0;

        } catch (CloudProviderException e) {
            log.error("readdir ошибка для {}: {}", path, e.getMessage());
            return e.toFuseErrorCode();
        } catch (Exception e) {
            log.error("readdir неожиданная ошибка для {}: {}", path, e.getMessage());
            return -ErrorCodes.EIO();
        }
    }



    /**
     * Читает содержимое файла по указанному смещению.
     */
    @Override
    public int read(String path, Pointer buf, @size_t long size,
                    @off_t long offset, FuseFileInfo fi) {
        log.debug("read: {} size={} offset={}", path, size, offset);

        try {
            // MANUAL — файл заблокирован для автоматического скачивания
            SyncPolicy policy = ruleEngine.resolvePolicy(accountId, path);
            if (policy == SyncPolicy.MANUAL) {
                log.debug("read: {} заблокирован политикой MANUAL", path);
                return -ErrorCodes.EACCES();
            }

            // Проверяем дисковый кэш
            Optional<Path> cachedPath = fileCache.get(accountId, path);

            if (cachedPath.isEmpty()) {
                // Кэш-промах: скачиваем весь файл (offset=0, length=0 → без Range-заголовка)
                log.debug("read: кэш-промах для {}, скачиваем с облака", path);
                InputStream fullStream = provider.downloadFile(path, 0, 0);
                fileCache.put(accountId, path, fullStream);
                cachedPath = fileCache.get(accountId, path);
            }

            if (cachedPath.isEmpty()) {
                // Кэш не смог сохранить файл — читаем напрямую как раньше
                log.warn("read: не удалось закэшировать {}, читаем напрямую", path);
                InputStream stream = provider.downloadFile(path, offset, size);
                byte[] bytes = stream.readNBytes((int) size);
                if (bytes.length == 0) return 0;
                buf.put(0, bytes, 0, bytes.length);
                return bytes.length;
            }

            // Кэш-попадание: читаем нужный кусок из локального файла
            try (RandomAccessFile raf = new RandomAccessFile(cachedPath.get().toFile(), "r")) {
                raf.seek(offset);
                byte[] bytes = new byte[(int) size];
                int read = raf.read(bytes, 0, (int) size);
                if (read <= 0) return 0;
                buf.put(0, bytes, 0, read);
                log.debug("read: {} прочитано {} байт из кэша (offset={})", path, read, offset);
                return read;
            }

        } catch (CloudProviderException e) {
            log.error("read ошибка для {}: {}", path, e.getMessage());
            return e.toFuseErrorCode();
        } catch (Exception e) {
            log.error("read неожиданная ошибка для {}: {}", path, e.getMessage());
            return -ErrorCodes.EIO();
        }
    }



    /**
     * Записывает часть данных файла во внутренний буфер (до вызова flush).
     */
    @Override
    public int write(String path, Pointer buf, @size_t long size,
                     @off_t long offset, FuseFileInfo fi) {
        log.debug("write: {} size={} offset={}", path, size, offset);

        try {
            // Читаем байты из FUSE-буфера
            byte[] bytes = new byte[(int) size];
            buf.get(0, bytes, 0, (int) size);

            // Накапливаем в writeBuffers.
            // Размер буфера = max(существующий размер, offset + size),
            // чтобы корректно обрабатывать неупорядоченные записи.
            // Ограничение: Java arrays ≤ Integer.MAX_VALUE (~2 ГБ).
            byte[] existing = writeBuffers.getOrDefault(path, new byte[0]);
            long newSizeLong = Math.max(existing.length, offset + size);
            if (newSizeLong > Integer.MAX_VALUE) {
                log.error("write: файл {} слишком большой для буфера ({} байт)", path, newSizeLong);
                return -ErrorCodes.EIO();
            }
            int newSize = (int) newSizeLong;
            byte[] combined = new byte[newSize];
            System.arraycopy(existing, 0, combined, 0, existing.length);
            System.arraycopy(bytes, 0, combined, (int) offset, (int) size);
            writeBuffers.put(path, combined);

            return (int) size;

        } catch (Exception e) {
            log.error("write ошибка для {}: {}", path, e.getMessage());
            return -ErrorCodes.EIO();
        }
    }

    /**
     * Загружает накопленный буфер файла в облачное хранилище при закрытии дескриптора.
     */
    @Override
    public int flush(String path, FuseFileInfo fi) {
        log.debug("flush: {}", path);

        byte[] data = writeBuffers.remove(path);
        if (data == null) {
            return 0;  // Файл не открывался на запись — нечего загружать
        }

        return uploadBuffer(path, data);
    }

    /**
     * Резервное освобождение дескриптора: загружает данные, если flush() не был вызван.
     */
    @Override
    public int release(String path, FuseFileInfo fi) {
        log.debug("release: {}", path);

        byte[] data = writeBuffers.remove(path);
        if (data == null) {
            return 0;  // flush() уже обработал данные — всё в порядке
        }

        log.warn("release: данные для {} не были загружены в flush(), загружаем сейчас", path);
        return uploadBuffer(path, data);
    }

    @Override
    public int truncate(String path, long size) {
        log.debug("truncate: {} → {} байт", path, size);
        if (size == 0) {
            writeBuffers.put(path, new byte[0]);
        } else {
            byte[] existing = writeBuffers.getOrDefault(path, new byte[0]);
            byte[] resized = new byte[(int) size];
            System.arraycopy(existing, 0, resized, 0, Math.min(existing.length, (int) size));
            writeBuffers.put(path, resized);
        }
        invalidateCache(path);
        return 0;
    }

    private int uploadBuffer(String path, byte[] data) {
        try {
            broadcaster.publishProgress(accountId, path, 0);
            provider.uploadFile(path,
                new java.io.ByteArrayInputStream(data),
                data.length
            );
            invalidateCache(path);
            broadcaster.publishFileSynced(accountId, path);
            log.info("uploadBuffer: {} загружен в облако ({} байт)", path, data.length);
            return 0;
        } catch (CloudProviderException e) {
            broadcaster.publishError(accountId, path, e.getMessage());
            log.error("uploadBuffer ошибка для {}: {}", path, e.getMessage());
            return e.toFuseErrorCode();
        }
    }



    /** Удаляет файл. */
    @Override
    public int unlink(String path) {
        log.debug("unlink: {}", path);
        try {
            provider.deleteFile(path);
            invalidateCache(path);
            return 0;
        } catch (CloudProviderException e) {
            return e.toFuseErrorCode();
        }
    }

    /** Создает директорию. */
    @Override
    public int mkdir(String path, long mode) {
        log.debug("mkdir: {}", path);
        try {
            provider.createDirectory(path);
            invalidateParentCache(path);
            return 0;
        } catch (CloudProviderException e) {
            return e.toFuseErrorCode();
        }
    }

    /** Удаляет директорию. */
    @Override
    public int rmdir(String path) {
        log.debug("rmdir: {}", path);
        try {
            provider.deleteDirectory(path);
            invalidateCache(path);
            return 0;
        } catch (CloudProviderException e) {
            return e.toFuseErrorCode();
        }
    }

    /** Переименовывает или перемещает файл/директорию. */
    @Override
    public int rename(String oldpath, String newpath) {
        log.debug("rename: {} → {}", oldpath, newpath);
        try {
            provider.rename(oldpath, newpath);
            invalidateCache(oldpath);
            invalidateParentCache(newpath);
            return 0;
        } catch (CloudProviderException e) {
            return e.toFuseErrorCode();
        }
    }

    /** Создает новый пустой файл. */
    @Override
    public int create(String path, long mode, FuseFileInfo fi) {
        log.debug("create: {}", path);
        // Создаём пустой файл через upload пустого содержимого
        writeBuffers.put(path, new byte[0]);
        return 0;
    }



    /** Устанавливает атрибуты директории (S_IFDIR, 0755). */
    private void fillDirStat(FileStat stat, Instant mtime) {
        stat.st_mode.set(FileStat.S_IFDIR | 0755);
        stat.st_nlink.set(2);  // Минимум 2 ссылки у любой папки (. и ..)
        stat.st_size.set(4096); // Стандартный размер блока папки
        long epochSeconds = mtime != null ? mtime.getEpochSecond() : Instant.now().getEpochSecond();
        stat.st_mtim.tv_sec.set(epochSeconds);
        stat.st_atim.tv_sec.set(epochSeconds);
    }

    /** Устанавливает атрибуты обычного файла (S_IFREG, 0644). */
    private void fillFileStat(FileStat stat, long size, Instant mtime) {
        stat.st_mode.set(FileStat.S_IFREG | 0644);
        stat.st_nlink.set(1);
        stat.st_size.set(size);
        long epochSeconds = mtime != null ? mtime.getEpochSecond() : Instant.now().getEpochSecond();
        stat.st_mtim.tv_sec.set(epochSeconds);
        stat.st_atim.tv_sec.set(epochSeconds);
    }

    // ─── Методы работы с кешем ───

    private Optional<CloudFile> getCachedFileInfo(String path) {
        CachedEntry<CloudFile> entry = fileInfoCache.get(path);
        if (entry == null || entry.isExpired(CACHE_TTL_MS)) {
            return Optional.empty();
        }
        return Optional.of(entry.getValue());
    }

    private List<CloudFile> getCachedDirListing(String path) {
        CachedEntry<List<CloudFile>> entry = dirCache.get(path);
        if (entry == null || entry.isExpired(CACHE_TTL_MS)) {
            return null;
        }
        return entry.getValue();
    }

    private void invalidateCache(String path) {
        fileInfoCache.remove(path);
        dirCache.remove(path);
        fileCache.invalidate(accountId, path);
        invalidateParentCache(path);
    }

    private void invalidateParentCache(String path) {
        int lastSlash = path.lastIndexOf('/');
        if (lastSlash > 0) {
            String parent = path.substring(0, lastSlash);
            dirCache.remove(parent);
        } else {
            dirCache.remove("/");
        }
    }

    // ─── Внутренний класс для кеш-записи с TTL ───

    private static class CachedEntry<T> {
        private final T value;
        private final long cachedAt;  // System.currentTimeMillis() в момент кеширования

        CachedEntry(T value) {
            this.value = value;
            this.cachedAt = System.currentTimeMillis();
        }

        T getValue() { return value; }

        /** Проверяет, истёк ли срок жизни записи */
        boolean isExpired(long ttlMs) {
            return System.currentTimeMillis() - cachedAt > ttlMs;
        }
    }
}
