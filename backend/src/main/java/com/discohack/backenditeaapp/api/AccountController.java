package com.discohack.backenditeaapp.api;

import com.discohack.backenditeaapp.cloud.CloudProviderRegistry;
import com.discohack.backenditeaapp.cloud.yandex.YandexDiskProvider;
import com.discohack.backenditeaapp.cloud.yandex.YandexOAuthService;
import com.discohack.backenditeaapp.fuse.MountManager;
import com.discohack.backenditeaapp.persistance.entities.AccountEntity;
import com.discohack.backenditeaapp.persistance.repository.AccountRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * AccountController — REST API для управления облачными аккаунтами.
 *
 * Endpoints:
 *   POST   /api/accounts/yandex        — добавить Яндекс аккаунт (токен напрямую)
 *   GET    /api/accounts               — список всех аккаунтов
 *   DELETE /api/accounts/{id}          — удалить аккаунт
 *   GET    /api/accounts/{id}/status   — статус аккаунта (онлайн/офлайн)
 */
@Slf4j
@RestController
@RequestMapping("/api/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final MountManager mountManager;
    private final CloudProviderRegistry providerRegistry;
    private final AccountRepository accountRepository;
    private final YandexOAuthService oauthService;

    /** Запрос на добавление Яндекс аккаунта (прямая передача токена, без OAuth flow). */
    record AddYandexRequest(
        String accessToken,
        String username
    ) {}

    /** Информация об аккаунте — возвращается в ответах API. */
    record AccountInfo(
        String id,
        String provider,
        String username,
        String mountPath,
        boolean connected
    ) {}

    /**
     * При старте приложения восстанавливаем все сохранённые аккаунты из БД
     * и монтируем их обратно.
     */
    @PostConstruct
    void restoreAccountsOnStartup() {
        List<AccountEntity> saved = accountRepository.findAll();
        log.info("Восстанавливаем {} аккаунт(ов) из БД", saved.size());
        for (AccountEntity entity : saved) {
            try {
                YandexDiskProvider provider = new YandexDiskProvider(entity.getAccessToken());
                if (provider.isAvailable()) {
                    providerRegistry.register(entity.getId(), provider);
                    mountManager.mountProvider(provider);
                    log.info("Аккаунт {} ({}) восстановлен", entity.getUsername(), entity.getProvider());
                } else {
                    log.warn("Токен устарел для аккаунта {}, пропускаем монтирование", entity.getUsername());
                }
            } catch (Exception e) {
                log.error("Ошибка восстановления аккаунта {}: {}", entity.getId(), e.getMessage());
            }
        }
    }

    /**
     * POST /api/accounts/yandex
     * Добавить Яндекс.Диск аккаунт с готовым токеном.
     */
    @PostMapping("/yandex")
    public ResponseEntity<AccountInfo> addYandexAccount(@RequestBody AddYandexRequest request) {
        log.info("Добавление Яндекс аккаунта для пользователя: {}", request.username());

        String accountId = UUID.randomUUID().toString();
        YandexDiskProvider provider = new YandexDiskProvider(request.accessToken());

        if (!provider.isAvailable()) {
            log.warn("Токен Яндекса невалиден для {}", request.username());
            return ResponseEntity.badRequest().build();
        }

        providerRegistry.register(accountId, provider);
        mountManager.mountProvider(provider);

        String mountPath = mountManager.getMountPath(provider.getProviderName());

        AccountEntity entity = AccountEntity.builder()
            .id(accountId)
            .provider("yandex")
            .username(request.username())
            .accessToken(request.accessToken())
            .mountPath(mountPath)
            .build();
        accountRepository.save(entity);

        AccountInfo info = new AccountInfo(accountId, "yandex", request.username(), mountPath, true);
        log.info("Яндекс аккаунт добавлен: {} → {}", request.username(), mountPath);
        return ResponseEntity.ok(info);
    }

    /**
     * GET /api/accounts
     * Список всех подключённых аккаунтов.
     */
    @GetMapping
    public ResponseEntity<List<AccountInfo>> listAccounts() {
        List<AccountInfo> result = accountRepository.findAll().stream()
            .map(entity -> new AccountInfo(
                entity.getId(),
                entity.getProvider(),
                entity.getUsername(),
                entity.getMountPath(),
                mountManager.isMounted(entity.getProvider())
            ))
            .toList();
        return ResponseEntity.ok(result);
    }

    /**
     * DELETE /api/accounts/{id}
     * Удалить аккаунт и размонтировать папку.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> removeAccount(@PathVariable String id) {
        return accountRepository.findById(id).map(entity -> {
            mountManager.unmountProvider(entity.getProvider());
            providerRegistry.unregister(id);
            accountRepository.deleteById(id);
            log.info("Аккаунт {} ({}) удалён", entity.getUsername(), entity.getProvider());
            return ResponseEntity.ok(Map.of("message", "Аккаунт удалён"));
        }).orElseGet(() -> ResponseEntity.notFound().<Map<String, String>>build());
    }

    /**
     * GET /api/accounts/{id}/status
     * Текущий статус аккаунта.
     */
    @GetMapping("/{id}/status")
    public ResponseEntity<Map<String, Object>> getAccountStatus(@PathVariable String id) {
        return accountRepository.findById(id).map(entity -> {
            boolean online = mountManager.isMounted(entity.getProvider());
            return ResponseEntity.ok(Map.<String, Object>of(
                "id", id,
                "connected", online,
                "mountPath", entity.getMountPath()
            ));
        }).orElseGet(() -> ResponseEntity.notFound().<Map<String, Object>>build());
    }
}
