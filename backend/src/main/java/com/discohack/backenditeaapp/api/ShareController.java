package com.discohack.backenditeaapp.api;

import com.discohack.backenditeaapp.cloud.CloudProviderException;
import com.discohack.backenditeaapp.cloud.CloudProviderRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * ShareController — создание публичных ссылок на файлы и папки в облаке.
 *
 * Endpoints:
 *   POST /api/share/{accountId}?path=/Documents/report.pdf
 */
@Slf4j
@RestController
@RequestMapping("/api/share")
@RequiredArgsConstructor
public class ShareController {

    private final CloudProviderRegistry providerRegistry;

    /**
     * POST /api/share/{accountId}?path=/Documents/report.pdf
     *
     * Создаёт публичную ссылку на файл или папку.
     * Для Яндекс.Диска — публикует ресурс и возвращает public_url.
     * Для NextCloud — возвращает 501 (не реализовано).
     *
     * Почему POST а не GET: операция меняет состояние файла в облаке
     * (делает его публичным), поэтому семантически это не идемпотентный GET.
     */
    @PostMapping("/{accountId}")
    public ResponseEntity<Map<String, String>> createShareLink(
            @PathVariable String accountId,
            @RequestParam String path
    ) {
        log.info("createShareLink: accountId={} path={}", accountId, path);

        return providerRegistry.findById(accountId)
                .map(provider -> {
                    try {
                        return provider.createShareLink(path)
                                .<ResponseEntity<Map<String, String>>>map(url -> {
                                    log.info("Ссылка создана: {} → {}", path, url);
                                    return ResponseEntity.ok(Map.of(
                                            "url", url,
                                            "path", path
                                    ));
                                })
                                .orElseGet(() -> ResponseEntity.status(501)
                                        .body(Map.of("error", "Провайдер не поддерживает публичные ссылки")));

                    } catch (CloudProviderException e) {
                        log.error("Ошибка создания ссылки для {}: {}", path, e.getMessage());
                        return ResponseEntity.status(502)
                                .body(Map.of("error", e.getMessage()));
                    }
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
