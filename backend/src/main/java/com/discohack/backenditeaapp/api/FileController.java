package com.discohack.backenditeaapp.api;

import com.discohack.backenditeaapp.cloud.CloudProvider;
import com.discohack.backenditeaapp.cloud.CloudProviderException;
import com.discohack.backenditeaapp.cloud.CloudProviderRegistry;
import com.discohack.backenditeaapp.domain.CloudFile;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * FileController — REST API для просмотра файлов в облаке.
 *
 * Endpoints:
 *   GET /api/files/{accountId}       — список файлов в папке (с параметром ?path=/)
 *   GET /api/files/{accountId}/info  — метаданные одного файла (с параметром ?path=/file.txt)
 */
@Slf4j
@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final CloudProviderRegistry providerRegistry;
    private final com.discohack.backenditeaapp.persistance.repository.PinnedFileRepository pinnedFileRepository;

    /**
     * GET /api/files/{accountId}?path=/
     */
    @GetMapping("/{accountId}")
    public ResponseEntity<?> listDirectory(
        @PathVariable String accountId,
        @RequestParam(defaultValue = "/") String path
    ) {
        return providerRegistry.findById(accountId)
            .map(provider -> {
                try {
                    List<CloudFile> files = provider.listDirectory(path);
                    
                    // Помечаем закрепленные файлы
                    var pinnedPaths = pinnedFileRepository.findByAccountId(accountId).stream()
                        .map(com.discohack.backenditeaapp.persistance.entities.PinnedFileEntity::getPath)
                        .collect(java.util.stream.Collectors.toSet());
                    
                    for (CloudFile file : files) {
                        boolean isPinned = pinnedPaths.contains(file.getPath());
                        file.setPinned(isPinned);
                        if (isPinned) log.debug("File is pinned: {}", file.getPath());
                    }

                    log.debug("listDirectory accountId={} path={} → {} файлов", accountId, path, files.size());
                    return ResponseEntity.ok(files);
                } catch (CloudProviderException e) {
                    log.warn("Ошибка listDirectory accountId={} path={}: {}", accountId, path, e.getMessage());
                    return ResponseEntity.status(mapErrorToStatus(e))
                        .<Object>body(Map.of("error", e.getMessage()));
                }
            })
            .orElseGet(() -> ResponseEntity.notFound().<Object>build());
    }

    /**
     * GET /api/files/{accountId}/info?path=/Documents/report.pdf
     */
    @GetMapping("/{accountId}/info")
    public ResponseEntity<?> getFileInfo(
        @PathVariable String accountId,
        @RequestParam String path
    ) {
        return providerRegistry.findById(accountId)
            .map(provider -> {
                try {
                    return provider.getFileInfo(path)
                        .map(file -> {
                            file.setPinned(pinnedFileRepository.existsByAccountIdAndPath(accountId, path));
                            return ResponseEntity.ok(file);
                        })
                        .orElseGet(() -> ResponseEntity.notFound().build());
                } catch (CloudProviderException e) {
                    return ResponseEntity.status(mapErrorToStatus(e))
                        .<Object>body(Map.of("error", e.getMessage()));
                }
            })
            .orElseGet(() -> ResponseEntity.notFound().<Object>build());
    }

    private int mapErrorToStatus(CloudProviderException e) {
        return switch (e.getErrorType()) {
            case NOT_FOUND -> 404;
            case AUTH_FAILED, PERMISSION_DENIED -> 403;
            default -> 502;
        };
    }
}
