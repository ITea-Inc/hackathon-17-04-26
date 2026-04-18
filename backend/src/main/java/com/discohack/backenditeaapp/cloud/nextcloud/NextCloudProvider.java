package com.discohack.backenditeaapp.cloud.nextcloud;

import com.discohack.backenditeaapp.cloud.CloudProvider;
import com.discohack.backenditeaapp.cloud.CloudProviderException;
import com.discohack.backenditeaapp.cloud.CloudProviderException.ErrorType;
import com.discohack.backenditeaapp.domain.CloudFile;
import com.github.sardine.DavResource;
import com.github.sardine.Sardine;
import com.github.sardine.SardineFactory;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Реализация {@link CloudProvider} для NextCloud.
 *
 * Взаимодействует с NextCloud через WebDAV endpoint: {@code /remote.php/webdav}
 * с использованием библиотеки Sardine.
 */
@Slf4j
public class NextCloudProvider implements CloudProvider {

    // Стандартный WebDAV путь в NextCloud
    private static final String WEBDAV_ROOT = "/remote.php/webdav";

    private final String serverUrl; // https://my-nextcloud.example.com
    private final String username;
    private final Sardine sardine;

    public NextCloudProvider(String serverUrl, String username, String password) {
        // Убираем завершающий слеш
        this.serverUrl = serverUrl.endsWith("/")
            ? serverUrl.substring(0, serverUrl.length() - 1)
            : serverUrl;
        this.username = username;
        this.sardine = SardineFactory.begin(username, password);
    }

    @Override
    public String getProviderName() {
        return "nextcloud";
    }

    /**
     * Строит полный WebDAV URL для пути.
     * "/" → "https://server/remote.php/webdav/"
     * "/Documents" → "https://server/remote.php/webdav/Documents"
     */
    private String toWebDavUrl(String path) {
        if ("/".equals(path)) {
            return serverUrl + WEBDAV_ROOT + "/";
        }
        // Убираем ведущий слеш из пути (он уже есть в WEBDAV_ROOT)
        String cleanPath = path.startsWith("/") ? path.substring(1) : path;
        return serverUrl + WEBDAV_ROOT + "/" + cleanPath;
    }

    @Override
    public List<CloudFile> listDirectory(String path) {
        String url = toWebDavUrl(path);
        log.debug("NextCloud listDirectory: {}", url);

        try {
            // PROPFIND depth=1 — сам ресурс + дочерние элементы
            List<DavResource> resources = sardine.list(url);
            List<CloudFile> files = new ArrayList<>();

            // Первый элемент — сама папка, пропускаем
            for (int i = 1; i < resources.size(); i++) {
                files.add(toCloudFile(resources.get(i), path));
            }

            log.debug("NextCloud listDirectory: {} → {} элементов", path, files.size());
            return files;

        } catch (IOException e) {
            log.error("NextCloud listDirectory ошибка: {}", e.getMessage());
            throw new CloudProviderException(
                "Ошибка получения списка файлов NextCloud: " + e.getMessage(),
                ErrorType.IO_ERROR, e
            );
        }
    }

    @Override
    public Optional<CloudFile> getFileInfo(String path) {
        String url = toWebDavUrl(path);
        log.debug("NextCloud getFileInfo: {}", url);

        try {
            // depth=0 — только сам ресурс, без дочерних
            List<DavResource> resources = sardine.list(url, 0);
            if (resources.isEmpty()) {
                return Optional.empty();
            }
            String parentPath = path.contains("/") && !path.equals("/")
                ? path.substring(0, path.lastIndexOf('/'))
                : "/";
            return Optional.of(toCloudFile(resources.get(0), parentPath));

        } catch (IOException e) {
            String msg = e.getMessage();
            if (msg != null && (msg.contains("404") || msg.contains("Not Found"))) {
                return Optional.empty();
            }
            throw new CloudProviderException(
                "Ошибка получения метаданных NextCloud: " + msg,
                ErrorType.IO_ERROR, e
            );
        }
    }

    @Override
    public InputStream downloadFile(String path, long offset, long length) {
        String url = toWebDavUrl(path);
        log.debug("NextCloud downloadFile: {} offset={} length={}", url, offset, length);

        try {
            // Sardine.get() возвращает InputStream
            // Range-запросы через WebDAV требуют отдельной реализации;
            // для простоты скачиваем весь файл и пропускаем offset байт.
            InputStream stream = sardine.get(url);
            if (offset > 0) {
                // skip() не гарантирует пропуск нужного числа байт за один вызов
                long remaining = offset;
                while (remaining > 0) {
                    long skipped = stream.skip(remaining);
                    if (skipped <= 0) break; // EOF или ошибка чтения
                    remaining -= skipped;
                }
            }
            return stream;
        } catch (IOException e) {
            throw new CloudProviderException(
                "Ошибка скачивания файла NextCloud: " + e.getMessage(),
                ErrorType.IO_ERROR, e
            );
        }
    }

    @Override
    public void uploadFile(String path, InputStream content, long size) {
        String url = toWebDavUrl(path);
        log.debug("NextCloud uploadFile: {} size={}", url, size);

        try {
            sardine.put(url, content, "application/octet-stream");
            log.debug("NextCloud uploadFile: {} загружен", path);
        } catch (IOException e) {
            throw new CloudProviderException(
                "Ошибка загрузки файла NextCloud: " + e.getMessage(),
                ErrorType.IO_ERROR, e
            );
        }
    }

    @Override
    public void deleteFile(String path) {
        String url = toWebDavUrl(path);
        log.debug("NextCloud deleteFile: {}", url);

        try {
            sardine.delete(url);
        } catch (IOException e) {
            throw new CloudProviderException(
                "Ошибка удаления файла NextCloud: " + e.getMessage(),
                ErrorType.IO_ERROR, e
            );
        }
    }

    @Override
    public void createDirectory(String path) {
        String url = toWebDavUrl(path);
        log.debug("NextCloud createDirectory: {}", url);

        try {
            sardine.createDirectory(url);
        } catch (IOException e) {
            throw new CloudProviderException(
                "Ошибка создания папки NextCloud: " + e.getMessage(),
                ErrorType.IO_ERROR, e
            );
        }
    }

    @Override
    public void deleteDirectory(String path) {
        // В WebDAV удаление файла и папки — одна и та же операция DELETE
        deleteFile(path);
    }

    @Override
    public void rename(String fromPath, String toPath) {
        String fromUrl = toWebDavUrl(fromPath);
        String toUrl = toWebDavUrl(toPath);
        log.debug("NextCloud rename: {} → {}", fromUrl, toUrl);

        try {
            sardine.move(fromUrl, toUrl);
        } catch (IOException e) {
            throw new CloudProviderException(
                "Ошибка переименования NextCloud: " + e.getMessage(),
                ErrorType.IO_ERROR, e
            );
        }
    }

    @Override
    public Optional<String> createShareLink(String path) {
        // Создание публичных ссылок в NextCloud требует OCS API (не WebDAV).
        // Не реализуем для хакатона.
        log.debug("NextCloud createShareLink: не поддерживается для {}", path);
        return Optional.empty();
    }

    @Override
    public boolean isAvailable() {
        try {
            sardine.list(toWebDavUrl("/"));
            return true;
        } catch (Exception e) {
            log.debug("NextCloud isAvailable: недоступен — {}", e.getMessage());
            return false;
        }
    }

    /**
     * Конвертирует DavResource в CloudFile.
     *
     * @param res        ресурс от WebDAV PROPFIND
     * @param parentPath путь родительской папки (для построения полного пути файла)
     */
    private CloudFile toCloudFile(DavResource res, String parentPath) {
        String name = res.getName();

        // Строим путь: /parentPath/name
        String normalParent = parentPath.endsWith("/") && !parentPath.equals("/")
            ? parentPath.substring(0, parentPath.length() - 1)
            : parentPath;
        String filePath = "/".equals(normalParent) ? "/" + name : normalParent + "/" + name;

        long size = res.getContentLength() != null ? res.getContentLength() : 0L;
        Instant modified = res.getModified() != null
            ? res.getModified().toInstant()
            : Instant.now();

        return CloudFile.builder()
            .name(name)
            .path(filePath)
            .size(size)
            .directory(res.isDirectory())
            .lastModified(modified)
            .mimeType(res.getContentType() != null ? res.getContentType() : "")
            .build();
    }
}
