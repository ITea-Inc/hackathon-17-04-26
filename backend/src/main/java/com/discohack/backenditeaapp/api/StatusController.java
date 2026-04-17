package com.discohack.backenditeaapp.api;

import com.discohack.backenditeaapp.cloud.CloudProviderRegistry;
import com.discohack.backenditeaapp.persistance.repository.AccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class StatusController {

    private final AccountRepository accountRepository;
    private final CloudProviderRegistry providerRegistry;

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
            "status", "UP",
            "timestamp", LocalDateTime.now().toString(),
            "service", "discohack-backend",
            "version", "0.0.1"
        ));
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        return ResponseEntity.ok(Map.of(
            "status", "UP",
            "accounts_connected", accountRepository.count(),
            "active_mounts", providerRegistry.count(),
            "sync_queue_size", 0,
            "cache_size_bytes", 0,
            "errors_count", 0
        ));
    }
}
