package com.discohack.backenditeaapp.cloud.yandex;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Slf4j
@Service
public class YandexOAuthService {

    @Value("${discohack.yandex.client-id}")
    private String clientId;

    @Value("${discohack.yandex.client-secret}")
    private String clientSecret;

    @Value("${discohack.yandex.redirect-uri}")
    private String redirectUri;

    private static final String AUTH_URL = "https://oauth.yandex.ru/authorize";
    private static final String TOKEN_URL = "https://oauth.yandex.ru/token";

    private final OkHttpClient httpClient = new OkHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Строит URL для редиректа пользователя на страницу авторизации Яндекса.
     * @param state случайная строка для защиты от CSRF (генерирует контроллер)
     */
    public String buildAuthorizationUrl(String state) {
        return AUTH_URL
            + "?response_type=code"
            + "&client_id=" + encode(clientId)
            + "&redirect_uri=" + encode(redirectUri)
            + "&state=" + encode(state);
    }

    /**
     * Обменивает authorization code на access_token + refresh_token.
     */
    public TokenResponse exchangeCode(String code) throws IOException {
        RequestBody body = new FormBody.Builder()
            .add("grant_type", "authorization_code")
            .add("code", code)
            .add("client_id", clientId)
            .add("client_secret", clientSecret)
            .add("redirect_uri", redirectUri)
            .build();

        return postToTokenEndpoint(body);
    }

    /**
     * Обновляет истёкший access_token с помощью refresh_token.
     */
    public TokenResponse refreshAccessToken(String refreshToken) throws IOException {
        RequestBody body = new FormBody.Builder()
            .add("grant_type", "refresh_token")
            .add("refresh_token", refreshToken)
            .add("client_id", clientId)
            .add("client_secret", clientSecret)
            .build();

        return postToTokenEndpoint(body);
    }

    private TokenResponse postToTokenEndpoint(RequestBody body) throws IOException {
        Request request = new Request.Builder()
            .url(TOKEN_URL)
            .post(body)
            .build();

        try (Response response = httpClient.newCall(request).execute()) {
            String json = response.body() != null ? response.body().string() : "{}";
            if (!response.isSuccessful()) {
                log.error("Ошибка получения токена Яндекса: {} {}", response.code(), json);
                throw new IOException("Яндекс вернул " + response.code() + ": " + json);
            }
            return objectMapper.readValue(json, TokenResponse.class);
        }
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    @Data
    public static class TokenResponse {
        @JsonProperty("access_token")
        private String accessToken;

        @JsonProperty("refresh_token")
        private String refreshToken;

        @JsonProperty("token_type")
        private String tokenType;

        @JsonProperty("expires_in")
        private long expiresIn;
    }
}
