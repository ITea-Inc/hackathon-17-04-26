package com.discohack.backenditeaapp.api;

import com.discohack.backenditeaapp.cloud.CloudProviderRegistry;
import com.discohack.backenditeaapp.cloud.yandex.YandexDiskProvider;
import com.discohack.backenditeaapp.cloud.yandex.YandexOAuthService;
import com.discohack.backenditeaapp.fuse.MountManager;
import com.discohack.backenditeaapp.persistance.entities.AccountEntity;
import com.discohack.backenditeaapp.persistance.repository.AccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

/**
 * OAuth 2.0 flow для Яндекс.Диска через verification_code.
 *
 * Сценарий:
 *   1. Фронт вызывает GET /api/auth/yandex/authorize — получает URL
 *   2. Открывает его в браузере — Яндекс показывает код пользователю
 *   3. Пользователь копирует код, вставляет в приложение
 *   4. Фронт вызывает POST /api/auth/yandex/exchange?code=... — обмениваем на токен
 */
@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final YandexOAuthService oauthService;
    private final AccountRepository accountRepository;
    private final CloudProviderRegistry providerRegistry;
    private final MountManager mountManager;

    /**
     * GET /api/auth/yandex/authorize
     * Возвращает URL для открытия в браузере.
     */
    @GetMapping("/yandex/authorize")
    public ResponseEntity<Map<String, String>> getAuthorizationUrl() {
        String state = UUID.randomUUID().toString();
        String url = oauthService.buildAuthorizationUrl(state);
        log.info("Генерируем URL авторизации Яндекса, state={}", state);
        return ResponseEntity.ok(Map.of("url", url, "state", state));
    }

    /**
     * POST /api/auth/yandex/exchange?code=...
     *
     * Пользователь скопировал код с https://oauth.yandex.ru/verification_code
     * и передаёт его сюда. Обмениваем на токен, создаём и монтируем аккаунт.
     */
    @PostMapping("/yandex/exchange")
    public ResponseEntity<Map<String, Object>> exchangeCode(@RequestParam String code) {
        log.info("Обмен verification code на токен");

        YandexOAuthService.TokenResponse tokens;
        try {
            tokens = oauthService.exchangeCode(code.trim());
        } catch (IOException e) {
            log.error("Ошибка обмена кода: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(Map.of("error", "Неверный код или истёк срок действия: " + e.getMessage()));
        }

        String accountId = UUID.randomUUID().toString();
        YandexDiskProvider provider = new YandexDiskProvider(tokens.getAccessToken());

        if (!provider.isAvailable()) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(Map.of("error", "Токен получен, но Яндекс.Диск недоступен"));
        }

        String username = provider.getLogin();

        providerRegistry.register(accountId, provider);
        mountManager.mountProvider(provider, accountId);

        String mountPath = mountManager.getMountPath(accountId);

        AccountEntity entity = AccountEntity.builder()
            .id(accountId)
            .provider("yandex")
            .username(username)
            .accessToken(tokens.getAccessToken())
            .refreshToken(tokens.getRefreshToken())
            .mountPath(mountPath)
            .build();
        accountRepository.save(entity);

        log.info("Яндекс аккаунт создан: {} ({}) → {}", username, accountId, mountPath);

        return ResponseEntity.ok(Map.of(
            "id", accountId,
            "provider", "yandex",
            "username", username,
            "mountPath", mountPath != null ? mountPath : "",
            "connected", true
        ));
    }
}
