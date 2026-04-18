package com.discohack.backenditeaapp.cloud.yandex;

import com.discohack.backenditeaapp.cloud.CloudProvider;
import com.discohack.backenditeaapp.cloud.CloudProviderException;
import com.discohack.backenditeaapp.cloud.CloudProviderException.ErrorType;
import com.discohack.backenditeaapp.domain.CloudFile;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Реализация {@link CloudProvider} для Яндекс.Диска.
 * Взаимодействует с REST API Яндекс.Диска v1.
 * Инициализируется динамически для каждого аккаунта с индивидуальным
 * OAuth-токеном.
 */
@Slf4j
public class YandexDiskProvider implements CloudProvider {

    // Базовый URL API Яндекс.Диска
    private static final String API_BASE = "https://cloud-api.yandex.net/v1/disk";

    // OkHttp клиент для HTTP запросов. Его нужно переиспользовать (thread-safe).
    private final OkHttpClient httpClient;

    // ObjectMapper для парсинга JSON ответов API
    private final ObjectMapper objectMapper;

    // OAuth токен доступа. Передаётся в каждом запросе как Bearer token.
    private String accessToken;

    public YandexDiskProvider(String accessToken) {
        this.accessToken = accessToken;
        // OkHttpClient с таймаутами — чтобы FUSE не ждал вечно при зависшей сети
        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(10, java.util.concurrent.TimeUnit.SECONDS)
                .readTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                .writeTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                .build();
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public String getProviderName() {
        return "yandex";
    }

    /**
     * Возвращает список файлов в указанной директории через GET /v1/disk/resources.
     */
    @Override
    public List<CloudFile> listDirectory(String path) {
        // Яндекс использует формат "disk:/путь" вместо просто "/путь"
        String yandexPath = toYandexPath(path);
        log.debug("listDirectory: {}", yandexPath);

        String url = API_BASE + "/resources?path=" + urlEncode(yandexPath)
                + "&limit=1000" // максимум элементов за один запрос
                + "&fields=_embedded.items.name,_embedded.items.path,"
                + "_embedded.items.type,_embedded.items.size,"
                + "_embedded.items.modified,_embedded.items.mime_type,"
                + "_embedded.items.resource_id,_embedded.items.md5";

        JsonNode response = executeGet(url);

        List<CloudFile> files = new ArrayList<>();
        JsonNode items = response.path("_embedded").path("items");

        // items — JSON-массив. Итерируемся по каждому элементу.
        for (JsonNode item : items) {
            files.add(parseCloudFile(item));
        }

        log.debug("listDirectory: {} вернул {} элементов", path, files.size());
        return files;
    }

    /**
     * Получить метаданные одного файла.
     * GET /v1/disk/resources?path=<path>
     */
    @Override
    public Optional<CloudFile> getFileInfo(String path) {
        String yandexPath = toYandexPath(path);
        log.debug("getFileInfo: {}", yandexPath);

        try {
            String url = API_BASE + "/resources?path=" + urlEncode(yandexPath)
                    + "&fields=name,path,type,size,modified,mime_type,resource_id,md5";
            JsonNode response = executeGet(url);
            return Optional.of(parseCloudFile(response));
        } catch (CloudProviderException e) {
            if (e.getErrorType() == ErrorType.NOT_FOUND) {
                return Optional.empty();
            }
            throw e;
        }
    }

    /**
     * Скачивает файл (или его фрагмент). Сначала запрашивает временный URL,
     * затем загружает данные с поддержкой заголовка Range.
     */
    @Override
    public InputStream downloadFile(String path, long offset, long length) {
        String yandexPath = toYandexPath(path);
        log.debug("downloadFile: {} offset={} length={}", yandexPath, offset, length);

        // Шаг 1: получаем временный URL скачивания
        String downloadUrlEndpoint = API_BASE + "/resources/download?path=" + urlEncode(yandexPath);
        JsonNode downloadResponse = executeGet(downloadUrlEndpoint);
        String downloadUrl = downloadResponse.path("href").asText();

        if (downloadUrl.isEmpty()) {
            throw new CloudProviderException(
                    "Не удалось получить URL скачивания для: " + path,
                    ErrorType.IO_ERROR);
        }

        // Шаг 2: скачиваем файл с поддержкой Range (частичная загрузка)
        Request.Builder requestBuilder = new Request.Builder().url(downloadUrl);

        // Range header позволяет скачать только нужный кусок файла.
        // Формат: "bytes=<start>-<end>" где end включительно.
        if (length > 0) {
            requestBuilder.header("Range",
                    "bytes=" + offset + "-" + (offset + length - 1));
        }

        Request request = requestBuilder.build();
        try {
            Response response = httpClient.newCall(request).execute();
            if (!response.isSuccessful()) {
                throw new CloudProviderException(
                        "Ошибка скачивания файла " + path + ": HTTP " + response.code(),
                        ErrorType.IO_ERROR);
            }
            // Возвращаем InputStream — данные потоком, не грузим всё в память
            return response.body().byteStream();
        } catch (IOException e) {
            throw new CloudProviderException(
                    "Ошибка сети при скачивании " + path, ErrorType.IO_ERROR, e);
        }
    }

    /**
     * Загружает файл в Яндекс.Диск.
     */
    @Override
    public void uploadFile(String path, InputStream content, long size, String expectedEtag) {
        String yandexPath = toYandexPath(path);
        log.debug("uploadFile: {} size={}", yandexPath, size);

        // ETag-проверка: убеждаемся что файл не изменился пока мы его редактировали
        if (expectedEtag != null && !expectedEtag.isEmpty()) {
            Optional<CloudFile> current = getFileInfo(path);
            if (current.isPresent()) {
                String serverEtag = current.get().getEtag();
                if (!serverEtag.isEmpty() && !serverEtag.equals(expectedEtag)) {
                    log.warn("uploadFile: конфликт версий для {} (ожидали {}, на сервере {})",
                        path, expectedEtag, serverEtag);
                    throw new CloudProviderException(
                        "Конфликт: файл изменён другим клиентом: " + path,
                        CloudProviderException.ErrorType.CONFLICT);
                }
            }
        }

        // Шаг 1: получаем URL для загрузки
        String uploadUrlEndpoint = API_BASE + "/resources/upload?path="
                + urlEncode(yandexPath) + "&overwrite=true";
        JsonNode uploadResponse = executeGet(uploadUrlEndpoint);
        String uploadUrl = uploadResponse.path("href").asText();

        // Шаг 2: загружаем файл через PUT
        okhttp3.RequestBody body = new okhttp3.RequestBody() {
            @Override
            public okhttp3.MediaType contentType() {
                return okhttp3.MediaType.parse("application/octet-stream");
            }

            @Override
            public long contentLength() {
                return size;
            }

            @Override
            public void writeTo(okio.BufferedSink sink) throws IOException {
                // Пишем из InputStream в OkHttp sink
                try (okio.Source source = okio.Okio.source(content)) {
                    sink.writeAll(source);
                }
            }
        };

        Request request = new Request.Builder()
                .url(uploadUrl)
                .put(body)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            // 201 Created или 200 OK — успех
            if (response.code() != 201 && response.code() != 200) {
                throw new CloudProviderException(
                        "Ошибка загрузки файла " + path + ": HTTP " + response.code(),
                        ErrorType.IO_ERROR);
            }
            log.debug("uploadFile: {} загружен успешно", path);
        } catch (IOException e) {
            throw new CloudProviderException(
                    "Ошибка сети при загрузке " + path, ErrorType.IO_ERROR, e);
        }
    }

    /**
     * Удалить файл.
     * DELETE /v1/disk/resources?path=<path>&permanently=false
     * permanently=false → в корзину (безопаснее для демо)
     */
    @Override
    public void deleteFile(String path) {
        String yandexPath = toYandexPath(path);
        log.debug("deleteFile: {}", yandexPath);

        String url = API_BASE + "/resources?path=" + urlEncode(yandexPath)
                + "&permanently=false";

        Request request = buildAuthRequest(url).delete().build();
        executeRequest(request, path);
        log.debug("deleteFile: {} удалён", path);
    }

    /**
     * Создать папку.
     * PUT /v1/disk/resources?path=<path>
     */
    @Override
    public void createDirectory(String path) {
        String yandexPath = toYandexPath(path);
        log.debug("createDirectory: {}", yandexPath);

        String url = API_BASE + "/resources?path=" + urlEncode(yandexPath);
        Request request = buildAuthRequest(url)
                .put(okhttp3.RequestBody.create(new byte[0]))
                .build();
        executeRequest(request, path);
    }

    /**
     * Удалить папку (аналогично удалению файла).
     */
    @Override
    public void deleteDirectory(String path) {
        deleteFile(path); // У Яндекса один endpoint для удаления файлов и папок
    }

    /**
     * Переименовать/переместить.
     * POST /v1/disk/resources/move?from=<from>&path=<to>&overwrite=false
     */
    @Override
    public void rename(String fromPath, String toPath) {
        log.debug("rename: {} → {}", fromPath, toPath);

        String url = API_BASE + "/resources/move?from=" + urlEncode(toYandexPath(fromPath))
                + "&path=" + urlEncode(toYandexPath(toPath))
                + "&overwrite=true";

        Request request = buildAuthRequest(url)
                .post(okhttp3.RequestBody.create(new byte[0]))
                .build();
        executeRequest(request, fromPath);
    }

    /**
     * Создать публичную ссылку.
     * PUT /v1/disk/resources/publish?path=<path>
     * Потом GET /v1/disk/resources?path=<path>&fields=public_url
     */
    @Override
    public Optional<String> createShareLink(String path) {
        try {
            String yandexPath = toYandexPath(path);

            // Публикуем ресурс
            String publishUrl = API_BASE + "/resources/publish?path=" + urlEncode(yandexPath);
            Request publishRequest = buildAuthRequest(publishUrl)
                    .put(okhttp3.RequestBody.create(new byte[0]))
                    .build();
            executeRequest(publishRequest, path);

            // Получаем public_url
            String infoUrl = API_BASE + "/resources?path=" + urlEncode(yandexPath)
                    + "&fields=public_url";
            JsonNode info = executeGet(infoUrl);
            String publicUrl = info.path("public_url").asText();

            return publicUrl.isEmpty() ? Optional.empty() : Optional.of(publicUrl);
        } catch (Exception e) {
            log.warn("Не удалось создать ссылку для {}: {}", path, e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Проверить доступность.
     * GET /v1/disk — базовая информация о диске. Если 200 — всё ок.
     */
    @Override
    public boolean isAvailable() {
        try {
            executeGet(API_BASE);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Возвращает логин пользователя Яндекса.
     * GET /v1/disk → { "user": { "login": "ivan.petrov" } }
     */
    public String getLogin() {
        try {
            JsonNode response = executeGet(API_BASE);
            String login = response.path("user").path("login").asText("");
            return login.isEmpty() ? "yandex-user" : login;
        } catch (Exception e) {
            log.warn("Не удалось получить логин Яндекса: {}", e.getMessage());
            return "yandex-user";
        }
    }

    /**
     * Конвертирует наш путь (начинается с /) в формат Яндекса (disk:/).
     * "/" → "disk:/"
     * "/Documents" → "disk:/Documents"
     */
    private String toYandexPath(String path) {
        if (path.equals("/")) {
            return "disk:/";
        }
        return "disk:" + path;
    }

    /**
     * Парсит один элемент JSON в объект CloudFile.
     */
    private CloudFile parseCloudFile(JsonNode item) {
        String name = item.path("name").asText("/");
        String rawPath = item.path("path").asText("");
        // Яндекс возвращает "disk:/путь" — убираем "disk:" в начале
        String path = rawPath.startsWith("disk:") ? rawPath.substring(5) : rawPath;
        if (path.isEmpty())
            path = "/";

        String type = item.path("type").asText("file");
        boolean isDirectory = "dir".equals(type);

        long size = item.path("size").asLong(0);

        Instant lastModified = Instant.now();
        String modifiedStr = item.path("modified").asText("");
        if (!modifiedStr.isEmpty()) {
            try {
                lastModified = Instant.parse(modifiedStr);
            } catch (Exception e) {
                // Яндекс иногда возвращает другой формат даты — игнорируем
            }
        }

        return CloudFile.builder()
                .name(name)
                .path(path)
                .size(size)
                .directory(isDirectory)
                .lastModified(lastModified)
                .mimeType(item.path("mime_type").asText(""))
                .resourceId(item.path("resource_id").asText(""))
                .etag(item.path("md5").asText(""))
                .build();
    }

    /**
     * Выполняет GET запрос с авторизацией и возвращает JSON.
     */
    private JsonNode executeGet(String url) {
        Request request = buildAuthRequest(url).get().build();
        try (Response response = httpClient.newCall(request).execute()) {
            return handleResponse(response, url);
        } catch (IOException e) {
            throw new CloudProviderException(
                    "Ошибка сети: " + url, ErrorType.IO_ERROR, e);
        }
    }

    /**
     * Выполняет произвольный запрос (DELETE, PUT, POST) и проверяет статус.
     */
    private void executeRequest(Request request, String path) {
        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful() && response.code() != 202) {
                // 202 Accepted — операция поставлена в очередь (для больших файлов)
                handleErrorResponse(response, path);
            }
        } catch (IOException e) {
            throw new CloudProviderException(
                    "Ошибка сети для: " + path, ErrorType.IO_ERROR, e);
        }
    }

    /**
     * Добавляет Authorization: OAuth <token> заголовок к запросу.
     */
    private Request.Builder buildAuthRequest(String url) {
        return new Request.Builder()
                .url(url)
                .header("Authorization", "OAuth " + accessToken)
                .header("Accept", "application/json");
    }

    /**
     * Обрабатывает HTTP-ответ: парсит JSON или выбрасывает исключение.
     */
    private JsonNode handleResponse(Response response, String url) throws IOException {
        String body = response.body() != null ? response.body().string() : "";

        if (response.code() == 404) {
            throw new CloudProviderException(
                    "Не найдено: " + url, ErrorType.NOT_FOUND);
        }
        if (response.code() == 401 || response.code() == 403) {
            throw new CloudProviderException(
                    "Ошибка авторизации: " + url, ErrorType.AUTH_FAILED);
        }
        if (!response.isSuccessful()) {
            throw new CloudProviderException(
                    "HTTP " + response.code() + " для " + url + ": " + body,
                    ErrorType.IO_ERROR);
        }

        return objectMapper.readTree(body);
    }

    private void handleErrorResponse(Response response, String path) {
        if (response.code() == 404) {
            throw new CloudProviderException("Не найдено: " + path, ErrorType.NOT_FOUND);
        }
        throw new CloudProviderException(
                "HTTP " + response.code() + " для: " + path, ErrorType.IO_ERROR);
    }

    /**
     * URL-кодирование пути (пробелы → %20, слеши не кодируем).
     */
    private String urlEncode(String path) {
        try {
            return java.net.URLEncoder.encode(path, "UTF-8")
                    .replace("+", "%20");
        } catch (Exception e) {
            return path;
        }
    }

    /**
     * Обновить токен (вызывается после OAuth refresh).
     */
    public void updateToken(String newToken) {
        this.accessToken = newToken;
        log.info("YandexDiskProvider: токен обновлён");
    }
}
