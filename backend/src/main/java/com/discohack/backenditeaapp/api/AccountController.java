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
 * REST API для управления облачными аккаунтами.
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
                    mountManager.mountProvider(provider, entity.getId(), entity.getUsername());
                    log.info("Аккаунт {} восстановлен", entity.getUsername());
                } else {
                    log.warn("Токен устарел для аккаунта {}, пропускаем монтирование", entity.getUsername());
                }
            } catch (Exception e) {
                log.error("Ошибка восстановления аккаунта {}: {}", entity.getId(), e.getMessage());
            }
        }
    }

    /**
     * Добавляет Яндекс.Диск аккаунт с готовым OAuth токеном.
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
        mountManager.mountProvider(provider, accountId, request.username());

        String mountPath = mountManager.getMountPath(accountId);

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
     * Возвращает список всех подключенных аккаунтов.
     */
    @GetMapping
    public ResponseEntity<List<AccountInfo>> listAccounts() {
        List<AccountInfo> result = accountRepository.findAll().stream()
            .map(entity -> {
                String actualMountPath = mountManager.isMounted(entity.getId()) 
                                         ? mountManager.getMountPath(entity.getId()) 
                                         : entity.getMountPath();
                return new AccountInfo(
                    entity.getId(),
                    entity.getProvider(),
                    entity.getUsername(),
                    actualMountPath,
                    mountManager.isMounted(entity.getId())
                );
            })
            .toList();
        return ResponseEntity.ok(result);
    }

    /**
     * Удаляет аккаунт и размонтирует папку.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> removeAccount(@PathVariable String id) {
        return accountRepository.findById(id).map(entity -> {
            mountManager.unmountProvider(id);
            providerRegistry.unregister(id);
            accountRepository.deleteById(id);
            log.info("Аккаунт {} ({}) удалён", entity.getUsername(), entity.getProvider());
            return ResponseEntity.ok(Map.of("message", "Аккаунт удалён"));
        }).orElseGet(() -> ResponseEntity.notFound().<Map<String, String>>build());
    }

    /**
     * Возвращает текущий статус подключения аккаунта.
     */
    @GetMapping("/{id}/status")
    public ResponseEntity<Map<String, Object>> getAccountStatus(@PathVariable String id) {
        return accountRepository.findById(id).map(entity -> {
            boolean online = mountManager.isMounted(entity.getId());
            return ResponseEntity.ok(Map.<String, Object>of(
                "id", id,
                "connected", online,
                "mountPath", entity.getMountPath()
            ));
        }).orElseGet(() -> ResponseEntity.notFound().<Map<String, Object>>build());
    }
}
