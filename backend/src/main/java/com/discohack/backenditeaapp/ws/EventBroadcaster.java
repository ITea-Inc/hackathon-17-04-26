package com.discohack.backenditeaapp.ws;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class EventBroadcaster {

    private final SimpMessagingTemplate messaging;

    public void publish(SyncEvent event) {
        log.debug("WS event: {} path={}", event.getType(), event.getPath());
        messaging.convertAndSend("/topic/sync", event);
    }

    public void publishProgress(String accountId, String path, int percent) {
        publish(SyncEvent.builder()
            .type("sync_progress")
            .accountId(accountId)
            .path(path)
            .data(Map.of("percent", percent))
            .timestamp(Instant.now())
            .build());
    }

    public void publishFileSynced(String accountId, String path) {
        publish(SyncEvent.builder()
            .type("file_synced")
            .accountId(accountId)
            .path(path)
            .timestamp(Instant.now())
            .build());
    }

    public void publishError(String accountId, String path, String message) {
        publish(SyncEvent.builder()
            .type("sync_error")
            .accountId(accountId)
            .path(path)
            .data(Map.of("message", message))
            .timestamp(Instant.now())
            .build());
    }
}
