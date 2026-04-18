package com.discohack.backenditeaapp.fuse;

import com.discohack.backenditeaapp.cloud.CloudProvider;
import com.discohack.backenditeaapp.domain.RuleEngine;
import com.discohack.backenditeaapp.ws.EventBroadcaster;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class MountManager {

    @Value("${discohack.mount.base-path}")
    private String baseMountPath;

    private final EventBroadcaster broadcaster;
    private final RuleEngine ruleEngine;
    private final FileCacheManager fileCacheManager;
    private final DirCacheStore dirCacheStore;

    /** Мапа активных FUSE соединений. */
    private final ConcurrentHashMap<String, CloudFileSystem> activeMounts = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Path> mountPaths = new ConcurrentHashMap<>();

    /**
     * Монтирует провайдер аккаунта в файловую систему.
     */
    public void mountProvider(CloudProvider provider, String accountId, String username) {
        if (activeMounts.containsKey(accountId)) {
            log.warn("Аккаунт {} уже смонтирован", accountId);
            return;
        }

        String safeName = username.replaceAll("[^a-zA-Z0-9._-]", "_");
        String dirName = provider.getProviderName() + "-" + safeName;
        Path mountPoint = Paths.get(baseMountPath, dirName);

        try {
            Files.createDirectories(mountPoint);
        } catch (IOException e) {
            log.error("Не удалось создать папку монтирования {}: {}", mountPoint, e.getMessage());
            throw new RuntimeException("Ошибка создания точки монтирования", e);
        }

        CloudFileSystem fs = new CloudFileSystem(provider, broadcaster, ruleEngine, accountId, fileCacheManager, dirCacheStore);

        Thread mountThread = new Thread(() -> {
            try {
                log.info("Монтируем аккаунт {} в {}", accountId, mountPoint);
                fs.mount(mountPoint, true, false, new String[]{"-o", "auto_unmount"});
            } catch (Exception e) {
                log.error("Ошибка монтирования аккаунта {}: {}", accountId, e.getMessage(), e);
                activeMounts.remove(accountId);
                mountPaths.remove(accountId);
            }
        }, "fuse-" + accountId.substring(0, 8));

        mountThread.setDaemon(true);
        mountThread.start();

        activeMounts.put(accountId, fs);
        mountPaths.put(accountId, mountPoint);
        log.info("Аккаунт {} → {}", accountId, mountPoint);
    }

    public void unmountProvider(String accountId) {
        CloudFileSystem fs = activeMounts.remove(accountId);
        Path mountPoint = mountPaths.remove(accountId);

        if (fs == null) {
            log.warn("Аккаунт {} не был смонтирован", accountId);
            return;
        }
        try {
            fs.umount();
            log.info("Аккаунт {} размонтирован", accountId);
        } catch (Exception e) {
            log.error("Ошибка размонтирования {}: {}", accountId, e.getMessage());
        }

        if (mountPoint != null) {
            // Гарантируем размонтирование через fusermount перед удалением папки
            forceUmount(mountPoint);
            deleteMountPoint(mountPoint);
        }
    }

    @PreDestroy
    public void unmountAll() {
        log.info("Размонтируем {} аккаунт(ов)...", activeMounts.size());
        activeMounts.forEach((accountId, fs) -> {
            try {
                fs.umount();
            } catch (Exception e) {
                Path mp = mountPaths.get(accountId);
                if (mp != null) forceUmount(mp);
            }
        });
        activeMounts.clear();
        mountPaths.clear();
    }

    private void forceUmount(Path mountPoint) {
        try {
            Process p = new ProcessBuilder("fusermount", "-u", mountPoint.toString()).start();
            p.waitFor();
        } catch (Exception e) {
            log.warn("fusermount -u для {}: {}", mountPoint, e.getMessage());
        }
    }

    private void deleteMountPoint(Path mountPoint) {
        for (int attempt = 1; attempt <= 5; attempt++) {
            try {
                Files.deleteIfExists(mountPoint);
                log.info("Папка монтирования удалена: {}", mountPoint);
                return;
            } catch (IOException e) {
                if (attempt == 5) {
                    log.warn("Не удалось удалить папку {} после {} попыток: {}", mountPoint, attempt, e.getMessage());
                } else {
                    try { Thread.sleep(200); } catch (InterruptedException ignored) {}
                }
            }
        }
    }

    public boolean isMounted(String accountId) {
        return activeMounts.containsKey(accountId);
    }

    public String getMountPath(String accountId) {
        Path p = mountPaths.get(accountId);
        return p != null ? p.toString() : null;
    }
}
