package com.discohack.backenditeaapp.sync;

import com.discohack.backenditeaapp.cloud.CloudProvider;
import com.discohack.backenditeaapp.cloud.CloudProviderException;
import com.discohack.backenditeaapp.cloud.CloudProviderRegistry;
import com.discohack.backenditeaapp.domain.CloudFile;
import com.discohack.backenditeaapp.fuse.FileCacheManager;
import com.discohack.backenditeaapp.ws.EventBroadcaster;
import com.discohack.backenditeaapp.ws.SyncEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Сервис фоновой загрузки файлов в локальный кэш (диск).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FileSyncService {

    private final FileCacheManager fileCache;
    private final CloudProviderRegistry providerRegistry;
    private final EventBroadcaster broadcaster;

    /** Тред-пул для фоновой загрузки. */
    private final ExecutorService executor = Executors.newFixedThreadPool(3);

    /**
     * Асинхронно запускает синхронизацию указанного пути.
     */
    public void syncAsync(String accountId, String path) {
        providerRegistry.findById(accountId).ifPresentOrElse(
            provider -> executor.submit(() -> syncPath(provider, accountId, path)),
            () -> log.warn("syncAsync: провайдер для аккаунта {} не найден", accountId)
        );
    }

    /**
     * Синхронно выполняет синхронизацию указанного пути.
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

            broadcaster.publish(SyncEvent.builder()
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
