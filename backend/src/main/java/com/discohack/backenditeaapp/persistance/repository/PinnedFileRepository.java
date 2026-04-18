package com.discohack.backenditeaapp.persistance.repository;

import com.discohack.backenditeaapp.persistance.entities.PinnedFileEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PinnedFileRepository extends JpaRepository<PinnedFileEntity, Long> {
    List<PinnedFileEntity> findByAccountId(String accountId);
    Optional<PinnedFileEntity> findByAccountIdAndPath(String accountId, String path);
    boolean existsByAccountIdAndPath(String accountId, String path);
    void deleteByAccountIdAndPath(String accountId, String path);
}
