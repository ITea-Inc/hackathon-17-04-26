package com.discohack.backenditeaapp.ws;

import lombok.*;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SyncEvent {
    private String type;
    private String accountId;
    private String path;
    private Object data;
    @Builder.Default
    private Instant timestamp = Instant.now();
}
