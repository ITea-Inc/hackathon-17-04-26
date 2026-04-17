package com.discohack.backenditeaapp.domain;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;


@Data
@Builder
public class CloudFile {

    private String path;

    private String name;

    private long size;

    private boolean directory;

    private Instant lastModified;

    private String mimeType;

    private String resourceId;

    private String etag;
}
