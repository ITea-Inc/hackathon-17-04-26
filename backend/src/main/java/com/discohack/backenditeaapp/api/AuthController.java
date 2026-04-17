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
 * AuthController — OAuth 2.0 flow для Яндекс.Диска.
 *
 * Сценарий:
 *   1. Electron вызывает GET /api/auth/yandex/authorize → получает URL
 *   2. Electron открывает этот URL в системном браузере
 *   3. Пользователь авторизуется, Яндекс редиректит на redirect_uri
 *   4. GET /api/auth/yandex/callback?code=...&state=... — обмениваем code на токен,
 *      создаём аккаунт, монтируем провайдер
 *   5. Страница callback может закрыться (deep link или просто сообщение пользователю)
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
     * Возвращает URL, на который нужно открыть браузер для авторизации.
     *
     * Electron открывает этот URL через shell.openExternal(url).
     */
    @GetMapping("/yandex/authorize")
    public ResponseEntity<Map<String, String>> getAuthorizationUrl() {
        String state = UUID.randomUUID().toString();
        String url = oauthService.buildAuthorizationUrl(state);
        log.info("Отправляем пользователя на авторизацию Яндекса, state={}", state);
        return ResponseEntity.ok(Map.of("url", url, "state", state));
    }

    /**
     * GET /api/auth/yandex/callback?code=...&state=...
     *
     * Яндекс редиректит сюда после авторизации пользователя.
     * Обмениваем code на токен, создаём провайдер, сохраняем в БД.
     *
     * В реальном flow здесь нужно проверять state против сохранённого (CSRF),
     * но для хакатона упрощаем.
     */
    @GetMapping("/yandex/callback")
    public ResponseEntity<String> handleCallback(
        @RequestParam String code,
        @RequestParam(required = false) String state
    ) {
        log.info("OAuth callback от Яндекса, state={}", state);

        YandexOAuthService.TokenResponse tokens;
        try {
            tokens = oauthService.exchangeCode(code);
        } catch (IOException e) {
            log.error("Ошибка обмена кода на токен: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body("Ошибка авторизации: " + e.getMessage());
        }

        String accountId = UUID.randomUUID().toString();
        YandexDiskProvider provider = new YandexDiskProvider(tokens.getAccessToken());

        if (!provider.isAvailable()) {
            log.error("Полученный токен невалиден");
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body("Токен получен, но провайдер недоступен");
        }

        providerRegistry.register(accountId, provider);
        mountManager.mountProvider(provider);

        String mountPath = mountManager.getMountPath(provider.getProviderName());

        AccountEntity entity = AccountEntity.builder()
            .id(accountId)
            .provider("yandex")
            .username("yandex-user")
            .accessToken(tokens.getAccessToken())
            .refreshToken(tokens.getRefreshToken())
            .mountPath(mountPath)
            .build();
        accountRepository.save(entity);

        log.info("Яндекс аккаунт создан через OAuth: {} → {}", accountId, mountPath);

        // Возвращаем HTML-страницу, которую пользователь видит после авторизации.
        // Electron может поймать этот редирект через webContents.on('will-navigate').
        return ResponseEntity.ok()
            .header("Content-Type", "text/html; charset=utf-8")
            .body("""
                <html><body>
                <h2>Авторизация успешна!</h2>
                <p>Яндекс.Диск подключён. Вы можете закрыть это окно.</p>
                <script>window.close();</script>
                </body></html>
                """);
    }
}
