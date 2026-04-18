package com.discohack.backenditeaapp.cloud;

/**
 * Исключение для ошибок при работе с облачными провайдерами.
 * Содержит {@link ErrorType} для корректного маппинга ошибок на FUSE-коды (errno).
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
     * Возвращает POSIX errno код ошибки для FUSE.
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
