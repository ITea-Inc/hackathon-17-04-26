package com.discohack.backenditeaapp.cloud;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Реестр активных облачных провайдеров.
 *
 * Хранит экземпляры {@link CloudProvider}. Используется компонентами системы
 * для получения доступа к провайдерам по идентификатору аккаунта.
 */
@Slf4j
@Service
public class CloudProviderRegistry {

    /** Хранилище провайдеров (ключ: accountId, значение: CloudProvider) */
    private final ConcurrentHashMap<String, CloudProvider> providers = new ConcurrentHashMap<>();

    /**
     * Зарегистрировать провайдер.
     *
     * @param accountId уникальный ID аккаунта
     * @param provider  экземпляр провайдера
     */
    public void register(String accountId, CloudProvider provider) {
        providers.put(accountId, provider);
        log.info("Зарегистрирован провайдер: {} ({})", provider.getProviderName(), accountId);
    }

    /**
     * Удалить провайдер из реестра.
     *
     * @param accountId ID аккаунта
     */
    public void unregister(String accountId) {
        CloudProvider removed = providers.remove(accountId);
        if (removed != null) {
            log.info("Удалён провайдер: {} ({})", removed.getProviderName(), accountId);
        }
    }

    /**
     * Найти провайдер по ID аккаунта.
     *
     * @param accountId ID аккаунта
     * @return Optional с провайдером, или empty если не найден
     */
    public Optional<CloudProvider> findById(String accountId) {
        return Optional.ofNullable(providers.get(accountId));
    }

    /**
     * Найти все провайдеры по имени (например, все "yandex" аккаунты).
     *
     * @param providerName имя провайдера
     * @return список провайдеров
     */
    public Collection<CloudProvider> findByName(String providerName) {
        return providers.values().stream()
            .filter(p -> p.getProviderName().equals(providerName))
            .toList();
    }

    /**
     * Все зарегистрированные провайдеры.
     */
    public Collection<CloudProvider> getAll() {
        return providers.values();
    }

    /**
     * Количество зарегистрированных провайдеров.
     */
    public int count() {
        return providers.size();
    }
}
