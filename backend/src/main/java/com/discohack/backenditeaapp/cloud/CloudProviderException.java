package com.discohack.backenditeaapp.cloud;

/**
 * CloudProviderException — кастомное исключение для ошибок работы с облаком.
 *
 * Зачем кастомное исключение? Потому что нам нужно различать:
 *   - Файл не найден → FUSE должен вернуть ENOENT (errno = -2)
 *   - Нет сети       → FUSE должен вернуть EIO    (errno = -5)
 *   - Нет прав       → FUSE должен вернуть EACCES (errno = -13)
 *
 * RuntimeException — unchecked исключение. Не надо писать throws CloudProviderException
 * в каждом методе, где оно может возникнуть. Это удобно для кода FUSE-слоя.
 */
public class CloudProviderException extends RuntimeException {

    /**
     * Тип ошибки — для маппинга в FUSE errno коды.
     */
    public enum ErrorType {
        /** Файл или папка не найдены → ENOENT (-2) */
        NOT_FOUND,
        /** Ошибка сети или недоступность сервера → EIO (-5) */
        IO_ERROR,
        /** Нет прав на операцию → EACCES (-13) */
        PERMISSION_DENIED,
        /** Токен истёк, нужна повторная авторизация */
        AUTH_FAILED,
        /** Другая ошибка */
        UNKNOWN
    }

    private final ErrorType errorType;

    public CloudProviderException(String message, ErrorType errorType) {
        super(message);
        this.errorType = errorType;
    }

    public CloudProviderException(String message, ErrorType errorType, Throwable cause) {
        super(message, cause);
        this.errorType = errorType;
    }

    public ErrorType getErrorType() {
        return errorType;
    }

    /**
     * Конвертирует тип ошибки в FUSE errno код (отрицательное число).
     * CloudFileSystem вызывает этот метод при перехвате исключения.
     *
     * Значения errno — стандарт POSIX, используется в Linux.
     */
    public int toFuseErrorCode() {
        return switch (errorType) {
            case NOT_FOUND         -> -2;   // -ENOENT
            case IO_ERROR          -> -5;   // -EIO
            case PERMISSION_DENIED -> -13;  // -EACCES
            case AUTH_FAILED       -> -13;  // -EACCES (тоже нет доступа)
            case UNKNOWN           -> -1;   // -EPERM
        };
    }
}
