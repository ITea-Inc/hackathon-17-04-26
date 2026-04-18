package com.discohack.backenditeaapp.sync;

import com.discohack.backenditeaapp.cloud.CloudProvider;
import com.discohack.backenditeaapp.cloud.CloudProviderException;
import com.discohack.backenditeaapp.cloud.CloudProviderRegistry;
import com.discohack.backenditeaapp.domain.CloudFile;
import com.discohack.backenditeaapp.fuse.FileCacheManager;
import com.discohack.backenditeaapp.ws.EventBroadcaster;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * FileSyncService — фоновая загрузка файлов в дисковый кэш.
 *
 * Используется двумя путями:
 *  - ALWAYS: вызывается из RulesController сразу при сохранении правила
 *  - SCHEDULED: вызывается из ScheduledSyncJob по расписанию
 *
 * Для каждого пути скачивает все файлы (не рекурсивно — только прямые потомки),
 * сохраняет в FileCacheManager и рассылает WebSocket-события.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FileSyncService {

    private final FileCacheManager fileCache;
    private final CloudProviderRegistry providerRegistry;
    private final EventBroadcaster broadcaster;

    // Пул из 3 потоков: несколько аккаунтов/папок могут синхронизироваться параллельно,
    // но не перегружаем сеть.
    private final ExecutorService executor = Executors.newFixedThreadPool(3);

    /**
     * Запускает синхронизацию пути в фоновом потоке.
     * Возвращает управление немедленно.
     */
    public void syncAsync(String accountId, String path) {
        providerRegistry.findById(accountId).ifPresentOrElse(
            provider -> executor.submit(() -> syncPath(provider, accountId, path)),
            () -> log.warn("syncAsync: провайдер для аккаунта {} не найден", accountId)
        );
    }

    /**
     * Синхронный вариант — для вызова из ScheduledSyncJob в уже фоновом потоке.
     */
    public void syncSync(CloudProvider provider, String accountId, String path) {
        syncPath(provider, accountId, path);
    }

    private void syncPath(CloudProvider provider, String accountId, String path) {
        log.info("Начинаем синхронизацию: accountId={} path={}", accountId, path);
        broadcaster.publishProgress(accountId, path, 0);

        try {
            List<CloudFile> files = provider.listDirectory(path);
            List<CloudFile> onlyFiles = files.stream().filter(f -> !f.isDirectory()).toList();

            int done = 0;
            for (CloudFile file : onlyFiles) {
                // Пропускаем если уже в кэше
                if (fileCache.get(accountId, file.getPath()).isPresent()) {
                    done++;
                    continue;
                }

                try {
                    InputStream stream = provider.downloadFile(file.getPath(), 0, 0);
                    fileCache.put(accountId, file.getPath(), stream);
                    done++;

                    int progress = (int) ((done * 100.0) / onlyFiles.size());
                    broadcaster.publishProgress(accountId, file.getPath(), progress);
                    log.debug("Закэширован: {} ({}/{})", file.getPath(), done, onlyFiles.size());

                } catch (CloudProviderException e) {
                    log.warn("Не удалось скачать {}: {}", file.getPath(), e.getMessage());
                }
            }

            broadcaster.publish(com.discohack.backenditeaapp.ws.SyncEvent.builder()
                .type("sync_done")
                .accountId(accountId)
                .path(path)
                .data(Map.of("fileCount", onlyFiles.size(), "cached", done))
                .build());

            log.info("Синхронизация завершена: {} файлов в {}", done, path);

        } catch (CloudProviderException e) {
            broadcaster.publishError(accountId, path, e.getMessage());
            log.error("Ошибка синхронизации {}: {}", path, e.getMessage());
        }
    }
}
