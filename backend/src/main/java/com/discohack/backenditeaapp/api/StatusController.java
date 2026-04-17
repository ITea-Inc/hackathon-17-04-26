package com.discohack.backenditeaapp.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;


@RestController
@RequestMapping("/api")
public class StatusController {

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
            "accounts_connected", 0,  // TODO: брать из AccountRepository
            "sync_queue_size", 0,     // TODO: брать из SyncQueue
            "cache_size_bytes", 0,    // TODO: брать из CacheManager
            "errors_count", 0
        ));
    }
}
