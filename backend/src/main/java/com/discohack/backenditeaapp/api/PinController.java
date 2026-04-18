package com.discohack.backenditeaapp.api;

import com.discohack.backenditeaapp.persistance.entities.PinnedFileEntity;
import com.discohack.backenditeaapp.persistance.repository.PinnedFileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pinned")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PinController {

    private final PinnedFileRepository pinnedFileRepository;

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
        if (!pinnedFileRepository.existsByAccountIdAndPath(req.accountId(), req.path())) {
            pinnedFileRepository.save(PinnedFileEntity.builder()
                .accountId(req.accountId())
                .path(req.path())
                .build());
        }
        return ResponseEntity.ok().build();
    }

    @DeleteMapping
    @Transactional
    public ResponseEntity<Void> unpin(@RequestBody PinRequest req) {
        pinnedFileRepository.deleteByAccountIdAndPath(req.accountId(), req.path());
        return ResponseEntity.ok().build();
    }

    record PinRequest(String accountId, String path) {}
}
