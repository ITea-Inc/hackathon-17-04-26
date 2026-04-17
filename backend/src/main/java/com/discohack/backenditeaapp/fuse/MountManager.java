package com.discohack.backenditeaapp.fuse;

import com.discohack.backenditeaapp.cloud.CloudProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.concurrent.ConcurrentHashMap;

/**
 * MountManager — управляет жизненным циклом FUSE-монтирований.
 *
 * @Service — Spring создаёт этот класс как singleton-бин.
 *   Singleton = один экземпляр на всё приложение. Это важно — только один
 *   MountManager должен управлять всеми точками монтирования.
 *
 * Жизненный цикл:
 *   1. Spring создаёт MountManager
 *   2. AccountController вызывает mountProvider() когда пользователь добавляет аккаунт
 *   3. @PreDestroy — Spring вызывает unmountAll() при остановке (Ctrl+C или завершение)
 *
 * Важно: не монтируем всё при старте (@PostConstruct), потому что токены
 * хранятся в БД — нам сначала нужен AccountRepository. Монтирование
 * происходит при первом запуске AccountService.initializeMounts().
 */
@Slf4j
@Service
public class MountManager {

    // Базовая папка для всех монтирований (из application.yml)
    // "${user.home}/CloudMount" → "/home/username/CloudMount"
    @Value("${discohack.mount.base-path}")
    private String baseMountPath;

    // Хранит активные FUSE файловые системы.
    // Ключ: имя провайдера ("yandex", "nextcloud")
    // Значение: экземпляр CloudFileSystem
    // ConcurrentHashMap — потокобезопасно (монтирование может быть из разных потоков)
    private final ConcurrentHashMap<String, CloudFileSystem> activeMounts
            = new ConcurrentHashMap<>();

    /**
     * Смонтировать провайдер как папку в файловой системе.
     *
     * После вызова этого метода пользователь увидит папку
     * ~/CloudMount/{providerName}/ в Nautilus с файлами из облака.
     *
     * @param provider провайдер облака (Яндекс, NextCloud)
     * @throws IllegalStateException если уже смонтирован
     */
    public void mountProvider(CloudProvider provider) {
        String providerName = provider.getProviderName();

        if (activeMounts.containsKey(providerName)) {
            log.warn("Провайдер {} уже смонтирован", providerName);
            return;
        }

        // Определяем путь точки монтирования
        Path mountPoint = Paths.get(baseMountPath, providerName);

        try {
            // Создаём папку если не существует
            Files.createDirectories(mountPoint);
            log.info("Точка монтирования создана: {}", mountPoint);
        } catch (IOException e) {
            log.error("Не удалось создать папку монтирования {}: {}", mountPoint, e.getMessage());
            throw new RuntimeException("Ошибка создания точки монтирования", e);
        }

        // Создаём FUSE файловую систему
        CloudFileSystem fs = new CloudFileSystem(provider);

        // mount() — блокирующий вызов! Поэтому запускаем в отдельном потоке.
        // В противном случае Spring-приложение "зависнет" на этой строке.
        Thread mountThread = new Thread(() -> {
            try {
                log.info("Монтируем {} в {}", providerName, mountPoint);

                fs.mount(
                    mountPoint,          // путь монтирования
                    true,                // blocking — false чтобы не блокировать поток
                    false,               // debug — включи true для отладки FUSE вызовов
                    new String[]{
                        "-o", "auto_unmount",  // автоматически размонтировать при завершении
                        "-o", "allow_other"    // разрешить доступ другим пользователям
                    }
                );

            } catch (Exception e) {
                log.error("Ошибка монтирования {}: {}", providerName, e.getMessage(), e);
                activeMounts.remove(providerName);
            }
        }, "fuse-mount-" + providerName);

        // daemon = true — поток завершится вместе с JVM (не будет мешать shutdown)
        mountThread.setDaemon(true);
        mountThread.start();

        activeMounts.put(providerName, fs);
        log.info("Провайдер {} смонтирован в {}", providerName, mountPoint);
    }

    /**
     * Размонтировать провайдер.
     * Вызывается при удалении аккаунта.
     *
     * @param providerName имя провайдера
     */
    public void unmountProvider(String providerName) {
        CloudFileSystem fs = activeMounts.remove(providerName);
        if (fs == null) {
            log.warn("Провайдер {} не был смонтирован", providerName);
            return;
        }

        try {
            fs.umount();  // Корректное размонтирование
            log.info("Провайдер {} размонтирован", providerName);
        } catch (Exception e) {
            log.error("Ошибка размонтирования {}: {}", providerName, e.getMessage());
            // Пробуем через fusermount -u как запасной вариант
            forceUmount(providerName);
        }
    }

    /**
     * @PreDestroy — Spring вызывает этот метод перед уничтожением бина.
     * То есть при нормальном завершении приложения (SIGTERM, Ctrl+C).
     *
     * КРИТИЧНО: если не размонтировать FUSE перед выходом,
     * точка монтирования останется "висячей" и пользователь
     * увидит папку, которую не может открыть ("Transport endpoint is not connected").
     * Тогда нужно вручную: fusermount -u ~/CloudMount/yandex
     */
    @PreDestroy
    public void unmountAll() {
        log.info("Размонтируем все провайдеры ({} шт.)...", activeMounts.size());
        activeMounts.forEach((name, fs) -> {
            try {
                fs.umount();
                log.info("Размонтирован: {}", name);
            } catch (Exception e) {
                log.error("Ошибка размонтирования {}: {}", name, e.getMessage());
                forceUmount(name);
            }
        });
        activeMounts.clear();
        log.info("Все провайдеры размонтированы");
    }

    /**
     * Принудительное размонтирование через системную команду.
     * Запасной вариант если fs.umount() не сработал.
     */
    private void forceUmount(String providerName) {
        Path mountPoint = Paths.get(baseMountPath, providerName);
        try {
            Process process = new ProcessBuilder(
                "fusermount", "-u", mountPoint.toString()
            ).start();
            int exitCode = process.waitFor();
            if (exitCode == 0) {
                log.info("Принудительное размонтирование {} успешно", providerName);
            } else {
                log.warn("fusermount -u завершился с кодом {} для {}", exitCode, providerName);
            }
        } catch (Exception e) {
            log.error("Не удалось принудительно размонтировать {}: {}", providerName, e.getMessage());
        }
    }

    /**
     * Проверить, смонтирован ли провайдер.
     */
    public boolean isMounted(String providerName) {
        return activeMounts.containsKey(providerName);
    }

    /**
     * Получить путь точки монтирования для провайдера.
     */
    public String getMountPath(String providerName) {
        return Paths.get(baseMountPath, providerName).toString();
    }
}
