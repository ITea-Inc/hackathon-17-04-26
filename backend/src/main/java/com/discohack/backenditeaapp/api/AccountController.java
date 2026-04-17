package com.discohack.backenditeaapp.api;

import com.discohack.backenditeaapp.cloud.CloudProviderRegistry;
import com.discohack.backenditeaapp.cloud.yandex.YandexDiskProvider;
import com.discohack.backenditeaapp.fuse.MountManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * AccountController — REST API для управления облачными аккаунтами.
 *
 * Endpoints:
 *   POST   /api/accounts/yandex        — добавить Яндекс аккаунт
 *   GET    /api/accounts               — список всех аккаунтов
 *   DELETE /api/accounts/{id}          — удалить аккаунт
 *   GET    /api/accounts/{id}/status   — статус аккаунта (онлайн/офлайн)
 *
 * @RequiredArgsConstructor (Lombok) — генерирует конструктор со всеми final полями.
 *   Spring увидит конструктор и автоматически внедрит зависимости (Dependency Injection).
 *   Это современная альтернатива @Autowired — более явная и тестируемая.
 */
@Slf4j
@RestController
@RequestMapping("/api/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final MountManager mountManager;
    private final CloudProviderRegistry providerRegistry;

    // Временное хранилище аккаунтов в памяти.
    // TODO на фазе 4: заменить на AccountRepository (JPA + SQLite)
    // Ключ: UUID аккаунта, Значение: инфо об аккаунте
    private final ConcurrentHashMap<String, AccountInfo> accounts = new ConcurrentHashMap<>();

    // ─────────────────────────────────────────────────
    // DTO (Data Transfer Object) — объект для передачи данных
    // ─────────────────────────────────────────────────

    /**
     * Запрос на добавление Яндекс аккаунта.
     * Фронтенд отправляет POST /api/accounts/yandex с этим JSON телом.
     */
    record AddYandexRequest(
        String accessToken,  // OAuth токен от Яндекса
        String username      // имя пользователя (для отображения в UI)
    ) {}

    /**
     * Информация об аккаунте — возвращается в ответах API.
     */
    record AccountInfo(
        String id,
        String provider,    // "yandex" или "nextcloud"
        String username,
        String mountPath,   // путь к смонтированной папке
        boolean connected   // онлайн ли сейчас
    ) {}

    // ─────────────────────────────────────────────────
    // ENDPOINTS
    // ─────────────────────────────────────────────────

    /**
     * POST /api/accounts/yandex
     * Добавить Яндекс.Диск аккаунт.
     *
     * Что происходит:
     * 1. Принимаем токен от фронтенда
     * 2. Создаём YandexDiskProvider с этим токеном
     * 3. Регистрируем провайдер в реестре
     * 4. Монтируем папку через MountManager
     * 5. Возвращаем информацию об аккаунте
     *
     * @RequestBody — Spring автоматически десериализует JSON тело запроса в объект
     */
    @PostMapping("/yandex")
    public ResponseEntity<AccountInfo> addYandexAccount(@RequestBody AddYandexRequest request) {
        log.info("Добавление Яндекс аккаунта для пользователя: {}", request.username());

        // Генерируем уникальный ID для аккаунта
        String accountId = UUID.randomUUID().toString();

        // Создаём провайдер с токеном пользователя
        YandexDiskProvider provider = new YandexDiskProvider(request.accessToken());

        // Проверяем что токен рабочий
        if (!provider.isAvailable()) {
            log.warn("Токен Яндекса невалиден для {}", request.username());
            return ResponseEntity.badRequest().build();
        }

        // Регистрируем провайдер (под уникальным ключом = accountId)
        providerRegistry.register(accountId, provider);

        // Монтируем папку в ~/CloudMount/yandex (или yandex_2 если уже есть)
        mountManager.mountProvider(provider);

        // Запоминаем аккаунт
        AccountInfo info = new AccountInfo(
            accountId,
            "yandex",
            request.username(),
            mountManager.getMountPath(provider.getProviderName()),
            true
        );
        accounts.put(accountId, info);

        log.info("Яндекс аккаунт добавлен: {} → {}", request.username(), info.mountPath());
        return ResponseEntity.ok(info);
    }

    /**
     * GET /api/accounts
     * Список всех подключённых аккаунтов.
     */
    @GetMapping
    public ResponseEntity<List<AccountInfo>> listAccounts() {
        List<AccountInfo> result = accounts.values().stream()
            // Обновляем статус connected в реальном времени
            .map(acc -> new AccountInfo(
                acc.id(),
                acc.provider(),
                acc.username(),
                acc.mountPath(),
                mountManager.isMounted(acc.provider())
            ))
            .toList();

        return ResponseEntity.ok(result);
    }

    /**
     * DELETE /api/accounts/{id}
     * Удалить аккаунт и размонтировать папку.
     *
     * @PathVariable — Spring извлекает {id} из URL пути
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> removeAccount(@PathVariable String id) {
        AccountInfo account = accounts.remove(id);
        if (account == null) {
            return ResponseEntity.notFound().build();
        }

        // Размонтируем
        mountManager.unmountProvider(account.provider());

        // Удаляем провайдер из реестра
        providerRegistry.unregister(id);

        log.info("Аккаунт {} ({}) удалён", account.username(), account.provider());
        return ResponseEntity.ok(Map.of("message", "Аккаунт удалён"));
    }

    /**
     * GET /api/accounts/{id}/status
     * Текущий статус аккаунта (используется для индикатора в UI).
     */
    @GetMapping("/{id}/status")
    public ResponseEntity<Map<String, Object>> getAccountStatus(@PathVariable String id) {
        AccountInfo account = accounts.get(id);
        if (account == null) {
            return ResponseEntity.notFound().build();
        }

        boolean online = mountManager.isMounted(account.provider());
        return ResponseEntity.ok(Map.of(
            "id", id,
            "connected", online,
            "mountPath", account.mountPath()
        ));
    }
}
