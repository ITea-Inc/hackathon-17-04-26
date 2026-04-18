package com.discohack.backenditeaapp.api;

import com.discohack.backenditeaapp.persistance.entities.PinnedFileEntity;
import com.discohack.backenditeaapp.persistance.repository.PinnedFileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/pinned")
@RequiredArgsConstructor
public class PinController {

    private final PinnedFileRepository pinnedFileRepository;
    private final com.discohack.backenditeaapp.fuse.MountManager mountManager;

    @GetMapping
    public List<String> getPinned(@RequestParam String accountId) {
        return pinnedFileRepository.findByAccountId(accountId)
            .stream()
            .map(PinnedFileEntity::getPath)
            .toList();
    }

    @PostMapping
    @Transactional
    public ResponseEntity<Void> pin(@RequestBody PinRequest req) {
        log.info("Pinning file: {} for account: {}", req.path(), req.accountId());
        if (!pinnedFileRepository.existsByAccountIdAndPath(req.accountId(), req.path())) {
            pinnedFileRepository.save(PinnedFileEntity.builder()
                .accountId(req.accountId())
                .path(req.path())
                .build());
        }
        mountManager.invalidateCache(req.accountId(), req.path());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping
    @Transactional
    public ResponseEntity<Void> unpin(@RequestBody PinRequest req) {
        log.info("Unpinning file: {} for account: {}", req.path(), req.accountId());
        pinnedFileRepository.deleteByAccountIdAndPath(req.accountId(), req.path());
        mountManager.invalidateCache(req.accountId(), req.path());
        return ResponseEntity.ok().build();
    }

    record PinRequest(String accountId, String path) {}
}
