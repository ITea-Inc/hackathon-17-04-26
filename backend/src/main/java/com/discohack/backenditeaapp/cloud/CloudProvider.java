package com.discohack.backenditeaapp.cloud;

import com.discohack.backenditeaapp.domain.CloudFile;

import java.io.InputStream;
import java.util.List;
import java.util.Optional;

/**
 * CloudProvider — главный интерфейс абстракции над облачными хранилищами.
 *
 * Это ИНТЕРФЕЙС — контракт. Он говорит "любое облако должно уметь это".
 * CloudFileSystem (FUSE) работает только с этим интерфейсом,
 * не зная про конкретные реализации (Яндекс, NextCloud).
 *
 * Паттерн: Стратегия (Strategy Pattern).
 * CloudFileSystem — Context, CloudProvider — Strategy,
 * YandexDiskProvider / NextCloudProvider — ConcreteStrategy.
 *
 * Это ключевое архитектурное решение: добавить новый провайдер
 * (например, Google Drive) = реализовать этот интерфейс. Больше ничего менять не надо.
 */
public interface CloudProvider {

    /**
     * Уникальный идентификатор провайдера.
     * Используется как ключ в CloudProviderRegistry и как имя подпапки монтирования.
     * Примеры: "yandex", "nextcloud"
     *
     * @return строка-идентификатор
     */
    String getProviderName();

    /**
     * Получить список файлов и папок по заданному пути.
     *
     * Вызывается из CloudFileSystem.readdir() — когда Nautilus открывает папку.
     * Должен работать быстро (до 2 секунд), иначе Nautilus "зависнет".
     *
     * @param path путь в облаке, начиная с "/" (например, "/" или "/Documents")
     * @return список CloudFile — и файлы, и подпапки
     * @throws CloudProviderException если нет сети или путь не существует
     */
    List<CloudFile> listDirectory(String path);

    /**
     * Получить метаданные одного файла или папки.
     *
     * Вызывается из CloudFileSystem.getattr() — для каждого файла в листинге!
     * Это самый частый вызов. Именно поэтому нужен кеш метаданных.
     *
     * @param path путь к файлу или папке
     * @return Optional.empty() если файл не найден (→ FUSE вернёт ENOENT)
     */
    Optional<CloudFile> getFileInfo(String path);

    /**
     * Скачать содержимое файла (или его кусок).
     *
     * Вызывается из CloudFileSystem.read() — когда приложение читает файл.
     * Параметры offset и length позволяют скачивать файл кусками (chunked download),
     * что важно для больших файлов и видео (seeking).
     *
     * @param path   путь к файлу в облаке
     * @param offset байтовое смещение (с какого байта начать)
     * @param length количество байт для скачивания
     * @return InputStream с содержимым файла
     * @throws CloudProviderException при ошибке сети → FUSE вернёт EIO
     */
    InputStream downloadFile(String path, long offset, long length);

    /**
     * Загрузить файл в облако.
     *
     * Вызывается из CloudFileSystem.write() + flush() — когда файл записывается.
     * content — весь файл целиком (для хакатона это нормально,
     * для продакшена нужна многопоточная загрузка по частям).
     *
     * @param path    путь в облаке, куда загрузить
     * @param content содержимое файла как поток байт
     * @param size    размер файла в байтах (нужен для заголовка Content-Length)
     */
    void uploadFile(String path, InputStream content, long size);

    /**
     * Удалить файл из облака.
     *
     * Вызывается из CloudFileSystem.unlink() — когда пользователь удаляет файл.
     *
     * @param path путь к файлу
     * @throws CloudProviderException если файл не существует или нет прав
     */
    void deleteFile(String path);

    /**
     * Создать папку в облаке.
     *
     * Вызывается из CloudFileSystem.mkdir().
     *
     * @param path путь новой папки
     */
    void createDirectory(String path);

    /**
     * Удалить папку из облака.
     *
     * Вызывается из CloudFileSystem.rmdir().
     * Папка должна быть пустой (стандартное поведение FUSE).
     *
     * @param path путь к папке
     */
    void deleteDirectory(String path);

    /**
     * Переименовать или переместить файл/папку.
     *
     * Вызывается из CloudFileSystem.rename() — при перемещении файла
     * в файловом менеджере (drag & drop в Nautilus).
     *
     * @param fromPath исходный путь
     * @param toPath   целевой путь
     */
    void rename(String fromPath, String toPath);

    /**
     * Создать публичную ссылку на файл (для функции "Поделиться").
     *
     * Опциональная функция — не все облака поддерживают.
     * Поэтому возвращает Optional.
     *
     * @param path путь к файлу
     * @return URL публичной ссылки, или empty() если не поддерживается
     */
    Optional<String> createShareLink(String path);

    /**
     * Проверить, работает ли соединение с облаком.
     *
     * Используется для отображения статуса в трее и при ошибках.
     *
     * @return true если сервер доступен и токен валиден
     */
    boolean isAvailable();
}
