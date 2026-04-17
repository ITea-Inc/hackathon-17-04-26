package com.discohack.backenditeaapp.fuse;

import com.discohack.backenditeaapp.cloud.CloudProvider;
import com.discohack.backenditeaapp.cloud.CloudProviderException;
import com.discohack.backenditeaapp.domain.CloudFile;
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
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * CloudFileSystem — реализация виртуальной файловой системы через FUSE.
 *
 * FUSE (Filesystem in Userspace) — механизм Linux, позволяющий создавать
 * файловые системы в пользовательском пространстве (без написания драйверов ядра).
 *
 * Как это работает:
 * 1. MountManager монтирует эту ФС в ~/CloudMount/yandex
 * 2. Когда Nautilus открывает ~/CloudMount/yandex — ядро Linux вызывает наш readdir()
 * 3. Когда пользователь открывает файл — ядро вызывает наш open() и read()
 * 4. Когда сохраняет файл — ядро вызывает write() и flush()
 *
 * FuseStubFS — базовый класс из jnr-fuse, реализует все методы заглушками.
 * Мы переопределяем только нужные.
 *
 * КРИТИЧЕСКИ ВАЖНО: все методы FUSE должны возвращать 0 при успехе
 * и отрицательный errno-код при ошибке (например, -ErrorCodes.ENOENT()).
 */
@Slf4j
public class CloudFileSystem extends FuseStubFS {

    // Провайдер облака (Яндекс, NextCloud и т.д.)
    private final CloudProvider provider;

    // ─────────────────────────────────────────────────
    // In-memory кеш метаданных файлов (для фазы 3)
    // Ключ: путь файла. Значение: CloudFile + время кеширования.
    // ConcurrentHashMap — потокобезопасная Map (FUSE вызывает методы из разных потоков!)
    // ─────────────────────────────────────────────────
    private final ConcurrentHashMap<String, CachedEntry<CloudFile>> fileInfoCache
            = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, CachedEntry<List<CloudFile>>> dirCache
            = new ConcurrentHashMap<>();

    // Время жизни кеша метаданных: 60 секунд
    private static final long CACHE_TTL_MS = 60_000;

    // Буфер записи: собираем байты при write(), загружаем при flush()
    // Ключ: путь файла (или handle). Значение: буфер байт.
    private final ConcurrentHashMap<String, byte[]> writeBuffers
            = new ConcurrentHashMap<>();

    public CloudFileSystem(CloudProvider provider) {
        this.provider = provider;
    }

    // ════════════════════════════════════════════════════
    // getattr — получить метаданные файла/папки
    // ════════════════════════════════════════════════════

    /**
     * getattr вызывается ОЧЕНЬ часто — при каждом обращении к файлу.
     * Например, при ls Nautilus вызывает getattr для каждого файла в папке.
     * Поэтому здесь критичен кеш.
     *
     * stat — структура с метаданными файла в Linux:
     *   st_mode  — тип (файл/папка) + права доступа
     *   st_nlink — количество жёстких ссылок (для папок = 2)
     *   st_size  — размер в байтах
     *   st_atime — время последнего доступа
     *   st_mtime — время последнего изменения
     *
     * @return 0 при успехе, -ENOENT если не найдено
     */
    @Override
    public int getattr(String path, FileStat stat) {
        log.debug("getattr: {}", path);

        try {
            // Корень "/" — всегда папка
            if ("/".equals(path)) {
                fillDirStat(stat, Instant.now());
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

    // ════════════════════════════════════════════════════
    // readdir — получить список файлов в папке
    // ════════════════════════════════════════════════════

    /**
     * readdir вызывается когда Nautilus/ls открывает папку.
     * Мы должны вызвать filler.apply() для каждого файла в папке.
     *
     * filler — callback функция FUSE. Вызываем её для каждой записи:
     *   filler.apply(buf, "filename", null, 0)
     *   null — мы не заполняем stat здесь (FUSE сам вызовет getattr),
     *   0    — смещение (0 = без pagination)
     *
     * @return 0 при успехе
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

    // ════════════════════════════════════════════════════
    // read — прочитать содержимое файла
    // ════════════════════════════════════════════════════

    /**
     * read вызывается когда программа читает файл (cat, open в редакторе, и т.д.).
     *
     * buf    — буфер, куда нужно записать прочитанные байты
     * size   — сколько байт нужно прочитать
     * offset — с какой позиции в файле читать
     *
     * FUSE может вызывать read несколько раз для одного файла (chunk by chunk).
     * Это нормально — offset будет увеличиваться с каждым вызовом.
     *
     * @return количество прочитанных байт, или отрицательный errno-код
     */
    @Override
    public int read(String path, Pointer buf, @size_t long size,
                    @off_t long offset, FuseFileInfo fi) {
        log.debug("read: {} size={} offset={}", path, size, offset);

        try {
            // Скачиваем нужный кусок файла
            InputStream stream = provider.downloadFile(path, offset, size);

            // Читаем байты из потока в массив
            byte[] bytes = stream.readNBytes((int) size);

            if (bytes.length == 0) {
                return 0;  // Конец файла
            }

            // Записываем байты в FUSE-буфер через JNR (Java Native Runtime)
            buf.put(0, bytes, 0, bytes.length);

            log.debug("read: {} прочитано {} байт", path, bytes.length);
            return bytes.length;

        } catch (CloudProviderException e) {
            log.error("read ошибка для {}: {}", path, e.getMessage());
            return e.toFuseErrorCode();
        } catch (Exception e) {
            log.error("read неожиданная ошибка для {}: {}", path, e.getMessage());
            return -ErrorCodes.EIO();
        }
    }

    // ════════════════════════════════════════════════════
    // write / flush — запись файла
    // ════════════════════════════════════════════════════

    /**
     * write вызывается когда программа записывает данные в файл.
     * Данные пишутся кусками — мы их накапливаем в writeBuffers.
     * Реальная загрузка происходит в flush().
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
     * flush вызывается при закрытии файла (после последнего write).
     * Здесь мы реально загружаем файл в облако, в том числе пустые файлы.
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
     * release вызывается когда последний файловый дескриптор закрыт.
     * Используется как резервный путь загрузки, если flush() был пропущен.
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

    /**
     * Загружает буфер в облако и инвалидирует кеш.
     */
    private int uploadBuffer(String path, byte[] data) {
        try {
            provider.uploadFile(path,
                new java.io.ByteArrayInputStream(data),
                data.length
            );
            invalidateCache(path);
            log.info("uploadBuffer: {} загружен в облако ({} байт)", path, data.length);
            return 0;
        } catch (CloudProviderException e) {
            log.error("uploadBuffer ошибка для {}: {}", path, e.getMessage());
            return e.toFuseErrorCode();
        }
    }

    // ════════════════════════════════════════════════════
    // CRUD операции (Фаза 3)
    // ════════════════════════════════════════════════════

    /**
     * unlink — удалить файл.
     * Вызывается командой rm или через Nautilus.
     */
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

    /**
     * mkdir — создать папку.
     * mode — права доступа (обычно 0755 — мы его игнорируем, облако само решает).
     */
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

    /**
     * rmdir — удалить папку.
     */
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

    /**
     * rename — переименовать/переместить файл или папку.
     * Вызывается при mv и при drag & drop в Nautilus.
     */
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

    /**
     * create — создать новый пустой файл.
     * flags — флаги открытия файла (O_CREAT и т.д.) — игнорируем.
     */
    @Override
    public int create(String path, long mode, FuseFileInfo fi) {
        log.debug("create: {}", path);
        // Создаём пустой файл через upload пустого содержимого
        writeBuffers.put(path, new byte[0]);
        return 0;
    }

    // ════════════════════════════════════════════════════
    // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
    // ════════════════════════════════════════════════════

    /**
     * Заполнить stat для папки.
     * S_IFDIR — константа типа "директория"
     * 0755    — права: владелец rwx, группа r-x, остальные r-x
     */
    private void fillDirStat(FileStat stat, Instant mtime) {
        stat.st_mode.set(FileStat.S_IFDIR | 0755);
        stat.st_nlink.set(2);  // Минимум 2 ссылки у любой папки (. и ..)
        stat.st_size.set(4096); // Стандартный размер блока папки
        long epochSeconds = mtime != null ? mtime.getEpochSecond() : Instant.now().getEpochSecond();
        stat.st_mtim.tv_sec.set(epochSeconds);
        stat.st_atim.tv_sec.set(epochSeconds);
    }

    /**
     * Заполнить stat для файла.
     * S_IFREG — константа типа "обычный файл"
     * 0644    — права: владелец rw-, группа r--, остальные r--
     */
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
        // Инвалидируем и родительскую папку
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
